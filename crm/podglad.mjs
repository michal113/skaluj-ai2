/* Lokalny podglad CRM na zmyslonych danych (katalog crm/podglad/ jest w .gitignore):
     node crm/podglad.mjs
   -> crm.html         pelny panel: zgloszenia, strona, Make, chatbot
   -> crm-filtr.html   lista przefiltrowana do statusu "Nowy"
   -> crm-puste.html   brak zgloszen, zrodla niepodlaczone albo z bledem
   -> logowanie.html   ekran 401
   Ksztalt danych 1:1 z tym, co skladaja worker.js (lista leadow) i sources.js (collectStats).
   Osoby i firmy sa fikcyjne, adresy w domenie example.com. Nic stad nie trafia do Workera. */
import { writeFileSync, mkdirSync } from "node:fs";
import { renderDashboard, renderMessage } from "./render.js";

const DAY = 86400000, H = 3600000;
const teraz = new Date();
const iso = (msAgo) => new Date(teraz.getTime() - msAgo).toISOString();
const ymd = (t) => new Date(t).toISOString().slice(0, 10);
const dayList = (days) => Array.from({ length: days }, (_, i) => ymd(teraz.getTime() - (days - 1 - i) * DAY));
const STATUSES = ["nowy", "kontakt", "oferta", "klient", "przegrany"];

let nr = 0;
const lead = (wiek, o) => ({
  id: "demo-" + String(++nr).padStart(4, "0") + "-lead",
  created_at: iso(wiek), sent_at: iso(wiek + 40000), updated_at: iso(Math.max(0, wiek - 3 * H)),
  phone: "", company: "", termin: "", marketing: 0, marketing_text: null, status: "nowy", value_pln: null, note: null, ...o,
});
const ZGODA = "Zgoda na informacje handlowe e-mailem, wersja z 01.10.2026";
const LEADY = [
  lead(40 * 60000, { name: "Adam Piotrowski", email: "adam.piotrowski@example.com", company: "AutoSerwis Piotrowski", service: "strona", phone: "+48 600 210 334", message: "Potrzebujemy prostej strony z cennikiem i formularzem rezerwacji wizyty.", termin: "jak najszybciej" }),
  lead(2 * H, { name: "Katarzyna Wiśniewska", email: "k.wisniewska@example.com", company: "Pracownia Ceramiki Kłos", service: "strona", phone: "+48 512 340 118", marketing: 1, marketing_text: ZGODA, message: "Dzień dobry, chcemy nowej strony ze sklepem. Obecna jest z 2016 roku i źle działa na telefonach. Mamy ok. 40 produktów.", termin: "do końca listopada" }),
  lead(26 * H, { name: "Ola Nowicka", email: "ola.nowicka@example.com", service: "chatbot", message: "Ile kosztuje chatbot na stronę, który odpowiada na pytania o godziny i ceny?" }),
  lead(3 * DAY + 5 * H, { name: "Tomasz Zieliński", email: "t.zielinski@example.com", company: "Gabinet Fizjo Ruch", service: "geo", phone: "+48 698 112 905", message: "Chcemy być wyżej w Google na „fizjoterapia Kraków” i pojawiać się w odpowiedziach ChatGPT." }),
  lead(1 * DAY + 2 * H, { name: "Natalia Krawczyk", email: "natalia@example.com", company: "Kwiaciarnia Bukiet", service: "branding", status: "kontakt", message: "Szukamy nowego logo i spójnych materiałów na Instagram.", note: "Oddzwonić w czwartek po 15." }),
  lead(5 * DAY, { name: "Marta Dąbrowska", email: "m.dabrowska@example.com", company: "Biuro Rachunkowe Bilans", service: "email", phone: "+48 501 778 230", status: "kontakt", value_pln: 6800, marketing: 1, marketing_text: ZGODA, message: "Chcemy zautomatyzować przyjmowanie faktur od klientów i przypomnienia o płatnościach.", note: "Rozmowa we wtorek — 3 scenariusze w Make, start w grudniu." }),
  lead(9 * DAY, { name: "Paweł Kamiński", email: "pawel.kaminski@example.com", company: "Meble Dąb & Syn", service: "reklamy-chatgpt", phone: "+48 605 400 912", status: "oferta", value_pln: 12000, message: "Interesują nas reklamy w ChatGPT dla sklepu z meblami.", note: "Oferta wysłana 19.10, przypomnieć w piątek." }),
  lead(12 * DAY, { name: "Agnieszka Lewandowska", email: "a.lewandowska@example.com", company: "Szkoła Językowa Lingwa", service: "chatbot", status: "oferta", value_pln: 4500, message: "Chatbot, który zapisuje na lekcję próbną." }),
  lead(15 * DAY, { name: "Zofia Michalska", email: "zofia.m@example.com", company: "Gabinet Stomatologiczny Uśmiech", service: "geo", status: "kontakt", message: "Audyt SEO i widoczność w AI." }),
  lead(20 * DAY, { name: "Jakub Wójcik", email: "j.wojcik@example.com", company: "Studio Kuchni Nowak", service: "strona", phone: "+48 733 019 554", status: "klient", value_pln: 14500, marketing: 1, marketing_text: ZGODA, message: "Strona z realizacjami i formularzem wyceny.", note: "Umowa podpisana, start 4.11." }),
  lead(26 * DAY, { name: "Ewa Kowalczyk", email: "ewa.kowalczyk@example.com", company: "Pensjonat Pod Lipą", service: "rolki", status: "klient", value_pln: 3200, message: "Rolki na Instagram przed sezonem zimowym." }),
  lead(33 * DAY, { name: "Piotr Mazur", email: "piotr.mazur@example.com", service: "audyt", status: "przegrany", message: "Audyt cyfryzacji firmy transportowej.", note: "Wybrali tańszą ofertę." }),
  lead(41 * DAY, { name: "Krzysztof Pawłowski", email: "k.pawlowski@example.com", company: "Hurtownia Elektro-Max", service: "email", status: "klient", value_pln: 9800, message: "Automatyzacja zamówień z maila do arkusza." }),
  lead(45 * DAY, { name: "Joanna Grabowska", email: "j.grabowska@example.com", company: "Fundacja Zielony Park", service: "inne", status: "przegrany", message: "Pytanie o współpracę barterową." }),
  lead(52 * DAY, { name: "Łukasz Jankowski", email: "lukasz.j@example.com", company: "Siłownia Forma", service: "strona", status: "przegrany", message: "Strona z grafikiem zajęć." }),
];

/* statystyki leadow liczone z tej samej listy — jak zapytania w sources.js */
function leadStats(leads, days) {
  const t = teraz.getTime(), status = {};
  for (const l of leads) { const s = (status[l.status] ||= { n: 0, value: null }); s.n++; if (l.value_pln != null) s.value = (s.value || 0) + l.value_pln; }
  const age = (l) => t - Date.parse(l.created_at);
  const cur = leads.filter((l) => age(l) < days * DAY), prev = leads.filter((l) => age(l) >= days * DAY && age(l) < 2 * days * DAY);
  const perDay = {}, svc = {};
  for (const l of cur) { const d = l.created_at.slice(0, 10); perDay[d] = (perDay[d] || 0) + 1; svc[l.service || "inne"] = (svc[l.service || "inne"] || 0) + 1; }
  return {
    state: "ok", total: leads.length, status, current: cur.length, previous: prev.length,
    marketing: cur.filter((l) => l.marketing).length,
    services: Object.entries(svc).map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n).slice(0, 6),
    daily: dayList(days).map((d) => ({ d, n: perDay[d] || 0 })),
  };
}

const runs = (days, base, seed) => dayList(days).map((d, i) => ({ d, n: Math.max(0, Math.round(base + Math.sin(i * 0.9 + seed) * base * 0.6)) }));
function stats(days) {
  return {
    leads: leadStats(LEADY, days),
    site: {
      state: "ok", ownError: null,
      own: {
        views: 4870, prevViews: 4210, entries: 1690, prevEntries: 1488, avgTime: 74, prevAvgTime: 69,
        daily: runs(days, 160, 1),
        pages: [
          { label: "/", value: 1820 }, { label: "/oferta/strona-seo", value: 610 }, { label: "/oferta/reklamy-chatgpt", value: 488 },
          { label: "/blog/reklamy-chatgpt", value: 431 }, { label: "/kontakt", value: 395 }, { label: "/oferta/chatbot-ai", value: 288 },
          { label: "/blog/geo-ai-search", value: 240 }, { label: "/oferta/rolki-ai", value: 176 },
        ],
        sources: [
          { label: "Google", value: 812 }, { label: "Bezpośrednio", value: 431 }, { label: "ChatGPT", value: 168 },
          { label: "Facebook", value: 121 }, { label: "LinkedIn", value: 84 }, { label: "Perplexity", value: 41 },
        ],
        devices: [{ label: "telefon", value: 2780 }, { label: "komputer", value: 1960 }, { label: "tablet", value: 130 }],
        countries: [{ label: "PL", value: 4510 }, { label: "DE", value: 160 }, { label: "GB", value: 92 }, { label: "US", value: 64 }],
      },
      ga4Configured: true, gscConfigured: true, ga4Error: null, gscError: null,
      ga4: {
        current: { sessions: 1174, totalUsers: 902, newUsers: 664, bounceRate: 0.412, averageSessionDuration: 118, screenPageViews: 3391 },
        previous: { sessions: 1031, totalUsers: 823, newUsers: 618, bounceRate: 0.436, averageSessionDuration: 121, screenPageViews: 2944 },
      },
      channels: [
        { label: "Organic Search", sessions: 612, pct: 52 }, { label: "Direct", sessions: 247, pct: 21 },
        { label: "Referral", sessions: 152, pct: 13 }, { label: "Organic Social", sessions: 105, pct: 9 }, { label: "Paid Search", sessions: 58, pct: 5 },
      ],
      gsc: { clicks: 538, impressions: 18240, ctr: 0.0295, position: 11.8 },
      queries: [
        { query: "agencja ai dla firm", clicks: 96, impressions: 2410, position: 3.2 },
        { query: "automatyzacja make cennik", clicks: 71, impressions: 1880, position: 5.6 },
        { query: "chatbot na stronę internetową", clicks: 52, impressions: 2950, position: 8.9 },
        { query: "reklamy w chatgpt polska", clicks: 44, impressions: 1210, position: 2.7 },
        { query: "strona internetowa seo geo", clicks: 31, impressions: 1640, position: 12.3 },
        { query: "audyt cyfryzacji firmy", clicks: 18, impressions: 820, position: 16.4 },
      ],
    },
    make: {
      state: "ok", orgError: null,
      org: { plan: "Core", used: 8420, limit: 10000, nextReset: new Date(teraz.getTime() + 9 * DAY).toISOString() },
      scenarios: [
        { id: "4410021", name: "Formularz → CRM + e-mail", active: true, invalid: false, paused: false, incomplete: 0, runs: 64, truncated: false, ok: 64, warn: 0, failed: 0, lastError: null, operations: 512, credits: null, daily: runs(days, 2, 0) },
        { id: "4410388", name: "Faktury z maila → Google Drive", active: true, invalid: false, paused: false, incomplete: 1, runs: 212, truncated: false, ok: 205, warn: 4, failed: 3, lastError: iso(2 * DAY + 4 * H), operations: 3180, credits: null, daily: runs(days, 7, 2) },
        { id: "4410977", name: "Raport tygodniowy → Slack", active: false, invalid: false, paused: true, incomplete: 0, runs: 4, truncated: false, ok: 4, warn: 0, failed: 0, lastError: null, operations: 36, credits: null, daily: dayList(days).map((d, i) => ({ d, n: i % 7 === 0 ? 1 : 0 })) },
      ],
    },
    chat: {
      state: "ok", orConfigured: true, orError: null, ownError: null,
      own: {
        conversations: 186, prevConversations: 151, messages: 412, prevMessages: 330, booking: 23, errors: 2, limited: 5,
        daily: dayList(days).map((d, i) => ({ d, n: Math.max(0, Math.round(6 + Math.sin(i * 0.7) * 3 + (i % 6 === 0 ? 3 : 0))) })),
      },
      span: Math.min(days, 30), keyName: "skaluj-chatbot", keyMissing: false, balance: 3.42,
      key: { today: 0.06, week: 0.41, month: 1.71, limit: 5, remaining: 3.29, lastUsed: iso(25 * 60000) },
      requests: 412, cost: 1.84, tokens: 623400,
      models: [
        { model: "google/gemini-2.5-flash", requests: 380, cost: 1.12, tokens: 571200 },
        { model: "openai/gpt-4o-mini", requests: 32, cost: 0.72, tokens: 52200 },
      ],
      daily: dayList(Math.min(days, 30)).map((d, i) => ({ d, n: Math.max(0, Math.round(13 + Math.sin(i * 0.7) * 7 + (i % 6 === 0 ? 6 : 0))) })),
    },
  };
}

const out = (plik, html) => writeFileSync(new URL("./podglad/" + plik, import.meta.url), html);
mkdirSync(new URL("./podglad/", import.meta.url), { recursive: true });
const wspolne = { periods: [7, 30, 90], statuses: STATUSES, generatedAt: teraz };

out("crm.html", renderDashboard({ leads: LEADY, stats: stats(30), days: 30, status: "", ...wspolne }));
out("crm-filtr.html", renderDashboard({ leads: LEADY.filter((l) => l.status === "nowy"), stats: stats(30), days: 30, status: "nowy", ...wspolne }));
out("crm-puste.html", renderDashboard({
  leads: [], days: 30, status: "", ...wspolne,
  stats: {
    leads: { state: "ok", total: 0, status: {}, current: 0, previous: 0, marketing: 0, services: [], daily: dayList(30).map((d) => ({ d, n: 0 })) },
    site: { state: "ok", ownError: null, ga4Configured: false, gscConfigured: false, channels: [], queries: [],
      own: { views: 0, prevViews: 0, entries: 0, prevEntries: 0, avgTime: null, prevAvgTime: null, daily: dayList(30).map((d) => ({ d, n: 0 })), pages: [], sources: [], devices: [], countries: [] } },
    make: { state: "off", missing: ["MAKE_API_TOKEN", "MAKE_SCENARIO_IDS"] },
    chat: { state: "ok", orConfigured: false, ownError: null, own: { conversations: 0, prevConversations: 0, messages: 0, prevMessages: 0, booking: 0, errors: 0, limited: 0, daily: dayList(30).map((d) => ({ d, n: 0 })) } },
  },
}));
out("logowanie.html", renderMessage("Wymagane logowanie", "Przeglądarka pokaże okienko logowania: wpisz dowolną nazwę użytkownika i hasło do panelu. Nie widzisz okienka? Odśwież stronę."));
console.log("zapisano crm/podglad/: crm.html, crm-filtr.html, crm-puste.html, logowanie.html");
