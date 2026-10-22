/**
 * skaluj.ai — panel klienta: renderowanie HTML.
 *
 * Zasada nadrzedna: NIGDY nie renderujemy zmyslonej ani zastepczej liczby.
 * Brak danych => myslnik "—". Zero pokazujemy wylacznie wtedy, gdy Google
 * naprawde zwrocil zero. Panel bez podlaczonego zrodla dostaje rysunek
 * techniczny tego, co powstanie (.pa-bp-*) — z nazwami metryk, bez cyfr.
 */
import { CSS } from "./styles.js";

export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

/* ---------- formatowanie (pl-PL) ---------- */

const DASH = "—";
/* useGrouping:"always" — bez tego pl-PL nie grupuje liczb 4-cyfrowych i w jednym
   rzedzie kart wychodzi "4218" obok "24 190", co wyglada na przypadek. */
const nf = (min, max) =>
  new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
    useGrouping: "always",
  });

const isNum = (v) => v != null && Number.isFinite(v);
function fmtInt(v) {
  return isNum(v) ? nf(0, 0).format(Math.round(v)) : DASH;
}
/* przecinek dziesietny w kroju mono ma pelna komorke — "2 , 9%" czytaloby sie jak dwie liczby */
const przecinek = (s) => s.replace(",", '<span class="dc">,</span>');
function fmtPct(v, decimals = 1) {
  return isNum(v) ? przecinek(nf(decimals, decimals).format(v * 100)) + "%" : DASH;
}
function fmtNum1(v) {
  return isNum(v) ? przecinek(nf(1, 1).format(v)) : DASH;
}
function fmtDur(sec) {
  if (!isNum(sec)) return DASH;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m + ":" + String(s).padStart(2, "0");
}

/* Polska odmiana: 1 sesja, 2–4 sesje (bez 12–14), reszta sesji */
function ses(v) {
  v = Math.abs(Math.round(v));
  const j = v % 10, d = v % 100;
  return v === 1 ? "sesja" : j >= 2 && j <= 4 && (d < 12 || d > 14) ? "sesje" : "sesji";
}

const STRZALKI = {
  up: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3.5 13 9H3z"/></svg>',
  dn: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 12.5 3 7h10z"/></svg>',
};

/**
 * Zmiana okres do okresu, w liczbach, ktore rozumie wlasciciel firmy.
 * kind: "int" (roznica sztuk, procent tylko przy >= 100 — przy malych liczbach "+200%"
 * brzmi niepowaznie), "pp" (wskazniki 0..1 jako punkty procentowe), "sec" (sekundy).
 * lowerIsBetter — spadek jest poprawa (odrzucenia). Brak porownania => nic (nie zgadujemy).
 */
function trend(cur, prev, { lowerIsBetter = false, kind = "int" } = {}) {
  if (!isNum(cur) || !isNum(prev) || (kind === "int" && prev === 0)) return "";
  const diff = cur - prev;
  const r = kind === "pp" ? Math.round(diff * 100) : Math.round(diff);
  const sign = r > 0 ? "+" : r < 0 ? "−" : "±";
  const abs = Math.abs(r);
  const txt = kind === "pp" ? sign + abs + " pp" : kind === "sec" ? sign + abs + " s" : sign + nf(0, 0).format(abs);
  const pct = kind === "int" && prev >= 100 && r !== 0 ? " <small>(" + sign + Math.round((Math.abs(diff) / prev) * 100) + "%)</small>" : "";
  if (r === 0) return '<span class="pa-d pa-d-flat"><span class="num">' + txt + "</span></span>";
  const better = lowerIsBetter ? r < 0 : r > 0;
  return '<span class="pa-d ' + (better ? "pa-d-up" : "pa-d-dn") + '">' + (r > 0 ? STRZALKI.up : STRZALKI.dn) +
    '<span class="num">' + esc(txt) + "</span>" + pct + "</span>";
}

/**
 * Pozycja paska liczb. countTo — gdy podane, liczba doliczy sie od zera przy wejsciu
 * (tylko dla liczb calkowitych; procenty i czasy pojawiaja sie od razu).
 */
function kpi(label, value, trendHtml, countTo) {
  const anim = isNum(countTo) ? ' data-to="' + Math.round(countTo) + '"' : "";
  return '<div class="pa-k"><dt>' + esc(label) + '</dt><dd class="pa-kv num"' + anim + ">" + value + "</dd>" +
    (trendHtml ? "<dd>" + trendHtml + "</dd>" : "") + "</div>";
}

/* ---------- definicje 4 zakladek ---------- */

const ICONS = {
  auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 3 5 13.5h5.2L10.8 21 19 9.8h-5.6z"/></svg>',
  website: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.6 2.2 2.6 15.3 0 17.5c-2.6-2.2-2.6-15.3 0-17.5z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="2.2"/><path d="M3.5 6.5 12 13l8.5-6.5"/></svg>',
  chatbot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5h16v10.5H9.5L5 20v-4H4z"/></svg>',
};

/* Etykiety metryk wziete wprost z odpowiednich stron ofertowych — nie wymyslone. */
export const PANELS = [
  {
    key: "website",
    label: "Strona + SEO",
    service: "strona",
    /* Uzywane tylko, gdy panel jeszcze nie jest "live" — np. klient nie nadal
       jeszcze dostepu kontu serwisowemu w GA4 i Search Console. */
    metrics: ["Sesje", "Użytkownicy", "Kliknięcia z Google", "Średnia pozycja"],
    lead: "Gdy nadasz nam dostęp do Google Analytics i Search Console, zobaczysz tu ruch na stronie, jego źródła i frazy, po których trafiają do Ciebie klienci.",
  },
  {
    key: "auto",
    label: "Automatyzacja",
    service: "automatyzacje",
    metrics: ["Godziny odzyskane / miesiąc", "Zadania zautomatyzowane", "Obsłużone bez człowieka", "Śr. czas reakcji"],
    lead: "Gdy uruchomimy automatyzacje, w tym miejscu zobaczysz, ile godzin realnie wróciło do zespołu i jaka część powtarzalnej pracy dzieje się bez człowieka.",
  },
  {
    key: "mail",
    label: "Mailing",
    service: "email",
    metrics: ["Dostarczalność", "Open rate", "Klikalność (CTR)", "Konwersja z maila"],
    lead: "Gdy podłączymy Twój mailing, pokażemy tu skuteczność sekwencji i kampanii — od dostarczalności po realną konwersję.",
  },
  {
    key: "chatbot",
    label: "Chatbot AI",
    service: "chatbot",
    metrics: ["Rozmów / miesiąc", "Obsłużone bez człowieka", "Śr. czas odpowiedzi", "Umówione spotkania"],
    lead: "Gdy uruchomimy asystenta, zobaczysz tu, o co pytają Twoi klienci, ile spraw domyka się bez człowieka i gdzie warto poprawić ofertę.",
  },
];

/* ---------- panel: dane na zywo (GA4 + Search Console) ---------- */

/* GA4 zwraca nazwy kanalow po angielsku — klient czyta je po polsku */
const KANALY = {
  "Organic Search": "Google i wyszukiwarki", Direct: "Bezpośrednio", Referral: "Odesłania z innych stron",
  "Organic Social": "Social media", "Paid Search": "Reklamy w wyszukiwarce", "Paid Social": "Reklamy w social media",
  Email: "E-mail", "Organic Video": "Wideo", Display: "Reklamy displayowe", "Organic Shopping": "Zakupy",
  "Paid Shopping": "Reklamy produktowe", "Cross-network": "Kampanie wielokanałowe", Affiliates: "Programy partnerskie",
  "Organic Maps": "Mapy", "Paid Other": "Inne reklamy", Unassigned: "Nieprzypisane",
};

function channelRows(channels) {
  if (!channels || !channels.length) {
    return '<p class="pa-empty">Brak danych o źródłach ruchu w tym okresie.</p>';
  }
  const max = Math.max(...channels.map((c) => c.sessions)) || 1;
  return '<div class="pa-bars">' + channels.map((c) =>
    '<div class="pa-bar"><span>' + esc(KANALY[c.label] || c.label) + "</span>" +
    '<span class="pa-trk"><i style="width:' + ((c.sessions / max) * 100).toFixed(1) + '%"></i></span>' +
    '<span class="num">' + fmtInt(c.sessions) + '</span><span class="num pa-share">' + c.pct + "%</span></div>"
  ).join("") + "</div>";
}

function pageRows(pages) {
  if (!pages || !pages.length) return '<p class="pa-empty">Brak danych o odwiedzanych stronach w tym okresie.</p>';
  return '<ul class="pa-pages">' + pages.map((p) =>
    '<li><span title="' + esc(p.sciezka) + '">' + esc(p.sciezka) + '</span><span class="num">' + fmtInt(p.odslony) + "</span></li>"
  ).join("") + "</ul>";
}

function queryRows(queries) {
  if (!queries || !queries.length) {
    return '<p class="pa-empty">Search Console nie zwrócił jeszcze fraz dla tego okresu.</p>';
  }
  return (
    '<div class="pa-tbl-scroll"><table class="pa-tbl"><thead><tr><th scope="col">Fraza</th><th scope="col" class="num" aria-label="Kliknięcia"><span class="dl">Kliknięcia</span><span class="kr" aria-hidden="true">Klik.</span></th>' +
    '<th scope="col" class="num" aria-label="Wyświetlenia"><span class="dl">Wyświetlenia</span><span class="kr" aria-hidden="true">Wyśw.</span></th>' +
    '<th scope="col" class="num" aria-label="Pozycja"><span class="dl">Pozycja</span><span class="kr" aria-hidden="true">Poz.</span></th></tr></thead><tbody>' +
    queries.map((q) =>
      "<tr><td>" + esc(q.query) + "</td>" +
      '<td class="num">' + fmtInt(q.clicks) + "</td>" +
      '<td class="num">' + fmtInt(q.impressions) + "</td>" +
      '<td class="num">' + fmtNum1(q.position) + "</td></tr>"
    ).join("") +
    "</tbody></table></div>"
  );
}

const MIES = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
const dzien = (iso) => { const d = new Date(iso + "T00:00:00Z"); return d.getUTCDate() + " " + MIES[d.getUTCMonth()]; };

/**
 * Sesje w pelnych tygodniach, rysowane na serwerze (dziala bez JS).
 * SVG rozciaga sie na szerokosc (preserveAspectRatio="none" + non-scaling-stroke), a podpisy osi
 * sa w HTML: tekst w SVG skalowalby sie razem z wykresem i na telefonie mialby ~5 px.
 */
function weeklyChart(weeks) {
  const W = 640, H = 170, P = { l: 2, r: 2, t: 20, b: 4 };
  const v = weeks.map((w) => w.sesje), max = Math.max(...v), min = Math.min(...v);
  const krok = max > 2000 ? 500 : max > 400 ? 100 : 50;
  const top = Math.ceil((max * 1.1) / krok) * krok || krok, bot = Math.max(0, Math.floor((min * 0.7) / krok) * krok);
  const x = (i) => P.l + (i * (W - P.l - P.r)) / (weeks.length - 1);
  const y = (z) => P.t + (1 - (z - bot) / (top - bot || 1)) * (H - P.t - P.b);
  const pc = (a, b) => ((a / b) * 100).toFixed(2) + "%";
  const d = v.map((z, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(z).toFixed(1)).join(" ");
  let siatka = "", osY = "";
  for (const z of [bot, (bot + top) / 2, top]) {
    siatka += '<line class="c-grid" x1="0" x2="' + W + '" y1="' + y(z) + '" y2="' + y(z) + '"/>';
    osY += '<span class="pa-ay num" style="top:' + pc(y(z), H) + '">' + fmtInt(z) + "</span>";
  }
  const osX = [0, Math.round((weeks.length - 1) / 3), Math.round((2 * (weeks.length - 1)) / 3), weeks.length - 1]
    .map((i, k, a) => '<span class="num" style="left:' + pc(x(i), W) + ";transform:translateX(" + (k === 0 ? "0" : k === a.length - 1 ? "-100%" : "-50%") + ')">' + dzien(weeks[i].start) + "</span>").join("");
  /* niewidoczne punkty z <title>: natywny dymek z wartoscia tygodnia, bez JS */
  const pkt = v.map((z, i) => '<circle class="c-pt" cx="' + x(i).toFixed(1) + '" cy="' + y(z).toFixed(1) + '" r="9"><title>Tydzień od ' + dzien(weeks[i].start) + ": " + fmtInt(z) + " " + ses(z) + "</title></circle>").join("");
  return '<div class="pa-cw"><svg class="pa-chart" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" role="img" aria-label="Sesje w ostatnich ' + weeks.length + " tygodniach: od " + fmtInt(v[0]) + " do " + fmtInt(v[v.length - 1]) + '">' +
    '<defs><linearGradient id="pa-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f6fe0" stop-opacity=".16"/><stop offset="1" stop-color="#2f6fe0" stop-opacity="0"/></linearGradient></defs>' +
    siatka + '<path class="c-area" d="' + d + " L" + x(v.length - 1) + " " + y(bot) + " L" + x(0) + " " + y(bot) + 'Z"/>' +
    '<path class="c-line" d="' + d + '"/>' + pkt + "</svg>" + osY + '</div><div class="pa-ax" aria-hidden="true">' + osX + "</div>";
}

function websitePanel(data, days) {
  if (data.error) {
    return (
      '<p class="pa-period">Strona + SEO · ostatnie ' + days + " dni</p>" +
      '<div class="pa-err"><p class="pa-err-h">Nie udało się pobrać danych</p>' +
      '<p class="pa-err-p">Nie pokazujemy tu żadnych liczb, dopóki nie mamy pewności, że są prawdziwe. ' +
      "Sprawdzamy połączenie z Google Analytics i Search Console — jeśli to się powtórzy, odezwij się do nas.</p></div>"
    );
  }

  const cur = data.ga4?.current || {};
  const prev = data.ga4?.previous || {};
  const g = data.gsc;
  const newShare = cur.totalUsers ? cur.newUsers / cur.totalUsers : null;
  const newSharePrev = prev.totalUsers ? prev.newUsers / prev.totalUsers : null;

  const strip =
    kpi("Sesje", fmtInt(cur.sessions), trend(cur.sessions, prev.sessions), cur.sessions) +
    kpi("Użytkownicy", fmtInt(cur.totalUsers), trend(cur.totalUsers, prev.totalUsers), cur.totalUsers) +
    kpi("Nowi użytkownicy", fmtPct(newShare, 0), trend(newShare, newSharePrev, { kind: "pp" })) +
    kpi("Odsłony", fmtInt(cur.screenPageViews), trend(cur.screenPageViews, prev.screenPageViews), cur.screenPageViews) +
    kpi("Odrzucenia", fmtPct(cur.bounceRate, 0), trend(cur.bounceRate, prev.bounceRate, { lowerIsBetter: true, kind: "pp" })) +
    kpi("Śr. czas sesji", fmtDur(cur.averageSessionDuration), trend(cur.averageSessionDuration, prev.averageSessionDuration, { kind: "sec" }));

  const weeks = (data.weeks || []).filter((w) => isNum(w.sesje));
  const chart = weeks.length >= 4
    ? '<div class="pa-sec"><div class="pa-sec-h"><h2>Sesje tygodniowo</h2><span>ostatnie ' + weeks.length + " pełnych tygodni</span></div>" + weeklyChart(weeks) + "</div>"
    : "";

  /* Search Console pokazujemy tez wtedy, gdy jest skonfigurowany, ale nie odpowiedzial
     — z myslnikami. Ciche zniknienie wygladaloby, jakby SEO nie bylo czescia wdrozenia. */
  const gscBox = g || data.gscConfigured
    ? '<section class="pa-box pa-stag"><div class="pa-sec-h pa-sec-h-pad"><h2>W wynikach Google</h2><span>Search Console</span></div>' +
      '<dl class="pa-strip pa-strip-4">' +
      kpi("Kliknięcia", fmtInt(g?.clicks), "", g?.clicks) +
      kpi("Wyświetlenia", fmtInt(g?.impressions), "", g?.impressions) +
      kpi("CTR", fmtPct(g?.ctr)) +
      kpi("Średnia pozycja", fmtNum1(g?.position)) +
      "</dl>" +
      '<div class="pa-sec"><div class="pa-sec-h"><h2>Frazy, po których trafiają do Ciebie</h2></div>' + queryRows(data.queries) + "</div></section>"
    : "";

  return (
    '<p class="pa-period"><span><span class="pa-nw">Strona + SEO · ostatnie ' + days + ' dni ·</span> <span class="pa-nw">zmiana wobec poprzednich ' + days + "</span></span></p>" +
    '<section class="pa-box pa-stag"><dl class="pa-strip pa-strip-6">' + strip + "</dl>" + chart + "</section>" +
    '<div class="pa-lower">' +
    '<section class="pa-box pa-stag"><div class="pa-sec"><div class="pa-sec-h"><h2>Skąd przychodzą</h2><span>sesje · udział</span></div>' + channelRows(data.channels) + "</div></section>" +
    '<section class="pa-box pa-stag"><div class="pa-sec"><div class="pa-sec-h"><h2>Najczęściej odwiedzane</h2><span>odsłony</span></div>' + pageRows(data.pages) + "</div></section>" +
    "</div>" +
    gscBox +
    '<p class="pa-note">Dane: Google Analytics 4 i Google Search Console. Search Console raportuje ' +
    "z kilkudniowym opóźnieniem, więc jego okno jest przesunięte o 3 dni względem Analytics.</p>"
  );
}

/* ---------- SYGNATURA: panel bez danych jako rysunek techniczny ---------- */

/**
 * status:
 *   "pending" — usluga u klienta DZIALA, tylko nie podlaczylismy jeszcze pomiaru.
 *               Nie wolno tu proponowac zakupu: klient juz za to zaplacil.
 *   "offer"   — usluga nie jest czescia wdrozenia tego klienta. Tu CTA ma sens.
 */
function blueprintPanel(p, contactUrl, status) {
  const dziala = status === "pending";

  const cells = (p.metrics || [])
    .map(
      (m) =>
        '<div class="pa-bp-cell"><span class="pa-bp-name">' + esc(m) + "</span>" +
        '<span class="pa-bp-rule"></span>' +
        '<span class="pa-bp-wait">' + (dziala ? "Czeka na pomiar" : "Uruchomimy z wdrożeniem") + "</span></div>"
    )
    .join("");

  const naglowek = dziala
    ? esc(p.label) + " · działa u Ciebie, pomiar jeszcze niepodłączony"
    : esc(p.label) + " · nie jest częścią Twojego wdrożenia";

  const tresc = dziala
    ? '<p class="pa-bp-h">Ta część już u Ciebie pracuje</p>' +
      '<p class="pa-bp-p">Wdrożyliśmy to i działa — brakuje wyłącznie podłączenia pomiaru, ' +
      "żebyś widział wyniki w liczbach. Do tego czasu widzisz rysunek metryk, które tu wejdą. " +
      "Nie pokazujemy żadnych wartości, dopóki nie mamy pewności, że są prawdziwe.</p>" +
      '<a class="pa-bp-btn" href="' + esc(contactUrl) + "?pomiar=" + esc(p.service) + '">Podłączcie pomiar'
    : '<p class="pa-bp-h">Nie zmyślamy liczb</p>' +
      '<p class="pa-bp-p">' + esc(p.lead) + " Do tego czasu widzisz rysunek tego, co powstanie — " +
      "zamiast danych, których jeszcze nie mierzymy.</p>" +
      '<a class="pa-bp-btn" href="' + esc(contactUrl) + "?panel=" + esc(p.service) + '">Chcę uruchomić ten panel';

  return (
    '<p class="pa-period">' + naglowek + "</p>" +
    '<div class="pa-bp"><span class="pa-bp-tag">' + (dziala ? "Pomiar" : "Plan") + " · " + esc(p.label) + "</span>" +
    '<div class="pa-bp-grid">' + cells + "</div>" +
    '<div class="pa-bp-body">' + tresc +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">' +
    '<path d="M5 12h14M13 6l6 6-6 6"/></svg></a>' +
    "</div></div>"
  );
}

/* ---------- strona ---------- */

export function renderPage({ config, data, days, brand, contactUrl, generatedAt }) {
  /* Trzy stany, nie dwa. "offer" to domyslna wartosc — panel, ktorego klient nie kupil. */
  const stan = (k) => config.panels?.[k]?.status || "offer";
  /* Blad pobrania danych: panel jest wdrozony, ale w tej chwili nie ma liczb — nie liczymy go jako "na zywo". */
  const bezDanych = stan("website") === "live" && !!data?.error;
  const naZywo = (k) => stan(k) === "live" && !(k === "website" && bezDanych);
  const liveCount = PANELS.filter((p) => naZywo(p.key)).length;
  const pendingCount = PANELS.filter((p) => stan(p.key) === "pending").length;

  const KROPKI = {
    live: '<span class="pa-live-dot" aria-hidden="true"></span>',
    pending: '<span class="pa-wait-dot" aria-hidden="true"></span>',
    offer: '<span class="pa-soon-dot" aria-hidden="true"></span>',
  };

  const tabs = PANELS.map((p, i) => {
    return (
      '<button type="button" class="pa-tab' + (i === 0 ? " is-active" : "") + '" data-k="' + p.key + '">' +
      ICONS[p.key] + esc(p.label) + (naZywo(p.key) ? KROPKI.live : stan(p.key) === "live" ? KROPKI.pending : KROPKI[stan(p.key)] || KROPKI.offer) + "</button>"
    );
  }).join("");

  const panels = PANELS.map((p, i) => {
    const s = stan(p.key);
    const body = s === "live" && p.key === "website" ? websitePanel(data, days) : blueprintPanel(p, contactUrl, s);
    return '<section class="pa-panel' + (i === 0 ? "" : " pa-hidden") + '" data-panel="' + p.key + '">' + body + "</section>";
  }).join("");

  /* Podtytul musi byc prawdziwy takze wtedy, gdy nic nie jest jeszcze podlaczone —
     "Realne dane z Twoich narzedzi" nad samymi myslnikami czytaloby sie jak awaria. */
  const sub = bezDanych
    ? "Chwilowo nie możemy pobrać Twoich danych. Liczby wrócą, gdy połączenie z Google znów zadziała."
    : liveCount
    ? "Realne dane z Twoich narzędzi, pobierane na żywo przy każdym otwarciu tej strony."
    : pendingCount
    ? "Twoje wdrożenie pracuje. Podłączamy pomiar, żebyś widział jego wyniki w liczbach."
    : "Tu pojawią się Twoje wyniki. Każdą zakładkę uruchamiamy razem z wdrożeniem usługi.";

  const licznik =
    "<b>" + liveCount + "</b> z " + PANELS.length + " paneli na żywo" +
    (pendingCount ? " · " + pendingCount + (pendingCount === 1 ? " czeka" : " czekają") + " na pomiar" : "") +
    (bezDanych ? " · 1 chwilowo bez danych" : "");

  const stamp = new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
  }).format(generatedAt);

  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Panel wyników — ${esc(config.clientName)} · ${esc(brand)}</title>
<link rel="icon" type="image/png" href="https://skaluj.ai/sygnet.png">
<link rel="stylesheet" href="https://skaluj.ai/fonts.css">
<style>${CSS}</style>
</head>
<body>
<header class="pnl-top"><div class="pnl-wrap pnl-top-in">
  <a class="pnl-brand" href="https://skaluj.ai" aria-label="skaluj.ai">
    <img src="https://skaluj.ai/sygnet.png" alt="" width="140" height="170">
    <img class="pnl-word" src="https://skaluj.ai/samo%20skaluj.png" alt="skaluj.ai" width="478" height="112">
  </a>
  <span class="pnl-sep" aria-hidden="true"></span>
  <span class="pnl-client">${esc(config.clientName)}</span>
  <span class="pnl-sp"></span>
  <span class="pnl-for">Panel prywatny</span>
</div></header>

<section class="pnl-hero"><div class="pnl-wrap pnl-hero-in">
  <h1 class="pnl-h1">Co dowozi Twoje wdrożenie</h1>
  <p class="pnl-sub">${esc(sub)}</p>
  <p class="pnl-stamp">${licznik}</p>
</div></section>

<main class="pnl-wrap">
  <div class="pa-tabs" id="paTabs"><span class="pa-tab-glider" id="paGlider" aria-hidden="true"></span>${tabs}</div>
  <div class="pa-panels">${panels}</div>
</main>

<footer class="pnl-foot"><div class="pnl-wrap pnl-foot-in">
  <span>Wygenerowano ${esc(stamp)}</span>
  <span>Pytania? <a href="mailto:kontakt@skaluj.ai">kontakt@skaluj.ai</a></span>
</div></footer>

<script>
(function(){
  var tabs=document.getElementById('paTabs'), glider=document.getElementById('paGlider');
  if(!tabs) return;
  var btns=[].slice.call(tabs.querySelectorAll('.pa-tab'));
  var panels=[].slice.call(document.querySelectorAll('.pa-panel'));
  var spokojnie=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function moveGlider(btn){ glider.style.width=btn.offsetWidth+'px';
    glider.style.transform='translateX('+(btn.offsetLeft-4)+'px)'; }

  function show(k){
    btns.forEach(function(b){ b.classList.toggle('is-active', b.dataset.k===k); });
    panels.forEach(function(p){ p.classList.toggle('pa-hidden', p.dataset.panel!==k); });
    var active=btns.filter(function(b){ return b.dataset.k===k; })[0];
    if(active){ moveGlider(active); ozyw(document.querySelector('.pa-panel[data-panel="'+k+'"]')); }
  }

  tabs.addEventListener('click', function(e){
    var b=e.target.closest('.pa-tab'); if(b) show(b.dataset.k);
  });
  tabs.addEventListener('keydown', function(e){
    if(e.key!=='ArrowRight' && e.key!=='ArrowLeft') return;
    var i=btns.indexOf(document.activeElement); if(i<0) return;
    e.preventDefault();
    var n=btns[(i + (e.key==='ArrowRight'?1:btns.length-1)) % btns.length];
    n.focus(); show(n.dataset.k);
  });

  /* wygaszenie krawedzi paska zakladek, gdy jest przewijalny (jak na stronie glownej) */
  function edges(){ var max=tabs.scrollWidth-tabs.clientWidth;
    tabs.classList.toggle('can-l', tabs.scrollLeft>4);
    tabs.classList.toggle('can-r', tabs.scrollLeft<max-4); }
  tabs.addEventListener('scroll', edges, {passive:true});
  window.addEventListener('resize', function(){ edges();
    var a=tabs.querySelector('.pa-tab.is-active'); if(a) moveGlider(a); });

  /* Liczby dolicza sie od zera. Tylko calkowite — procenty i czasy pojawiaja sie od razu,
     bo licznik z przecinkiem czyta sie jak usterka, nie jak animacja. */
  var fmt=new Intl.NumberFormat('pl-PL',{useGrouping:'always'});
  function licz(el){
    var cel=parseInt(el.dataset.to,10);
    if(!isFinite(cel)||el.dataset.gotowe) return;
    el.dataset.gotowe='1';
    if(spokojnie){ el.textContent=fmt.format(cel); return; }
    var t0=null, czas=900;
    function krok(t){
      if(t0===null) t0=t;
      var p=Math.min((t-t0)/czas,1);
      el.textContent=fmt.format(Math.round(cel*(1-Math.pow(1-p,3))));
      if(p<1) requestAnimationFrame(krok);
    }
    requestAnimationFrame(krok);
  }

  /* Paski rosna od zera po wejsciu w zakladke. */
  function ozyw(panel){
    if(!panel) return;
    [].forEach.call(panel.querySelectorAll('.pa-kv[data-to]'), licz);
    [].forEach.call(panel.querySelectorAll('.pa-trk i'), function(el){
      if(el.dataset.gotowe) return; el.dataset.gotowe='1';
      el.style.transform='scaleX(0)';
      requestAnimationFrame(function(){ requestAnimationFrame(function(){ el.style.transform=''; }); });
    });
  }

  edges();
  if(btns[0]) moveGlider(btns[0]);
  setTimeout(function(){ ozyw(document.querySelector('.pa-panel:not(.pa-hidden)')); }, spokojnie?0:480);
})();
</script>
</body>
</html>`;
}

/** Strona 404 — celowo generyczna, nie zdradza czy slug byl "prawie dobry". */
export function renderNotFound() {
  return `<!DOCTYPE html>
<html lang="pl"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Nie znaleziono</title><style>${CSS}
.nf{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;
  gap:14px;padding:100px 0}
.nf .pnl-h1{max-width:none;animation:none;opacity:1}
</style></head>
<body>
<header class="pnl-top"><div class="pnl-wrap pnl-top-in">
  <a class="pnl-brand" href="https://skaluj.ai">
    <img src="https://skaluj.ai/sygnet.png" alt="" width="140" height="170">skaluj.ai
  </a>
</div></header>
<main class="pnl-wrap nf">
  <h1 class="pnl-h1">Nie znaleziono</h1>
  <p class="pnl-sub">Ten adres nie istnieje lub stracił ważność.<br>Jeśli masz link od nas, sprawdź, czy skopiował się w całości.</p>
</main>
<footer class="pnl-foot"><div class="pnl-wrap pnl-foot-in">
  <span>skaluj.ai</span><span>Pytania? <a href="mailto:kontakt@skaluj.ai">kontakt@skaluj.ai</a></span>
</div></footer>
</body></html>`;
}
