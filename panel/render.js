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
  const proc = Math.round((Math.abs(diff) / prev) * 100);
  const pct = kind === "int" && prev >= 100 && r !== 0 && proc > 0 ? " <small>(" + sign + proc + "%)</small>" : "";
  if (r === 0) return '<span class="pa-d pa-d-flat"><span class="num">' + txt + "</span></span>";
  const better = lowerIsBetter ? r < 0 : r > 0;
  return '<span class="pa-d ' + (better ? "pa-d-up" : "pa-d-dn") + '">' + (r > 0 ? STRZALKI.up : STRZALKI.dn) +
    '<span class="num">' + esc(txt) + "</span>" + pct + "</span>";
}

/** Liczba w pasku Search Console: nazwa, wartosc, dopisek (np. znaczek miejsca w Google). */
function kpi(label, value, extraHtml, countTo) {
  const anim = isNum(countTo) ? ' data-to="' + Math.round(countTo) + '"' : "";
  return '<div class="pa-k"><dt>' + esc(label) + '</dt><dd class="pa-kv"' + anim + ">" + value + "</dd>" +
    (extraHtml ? "<dd>" + extraHtml + "</dd>" : "") + "</div>";
}

/* Ikony kafelkow — ten sam rysunek (obrys 2 px) co ikony zakladek i demo na stronie glownej. */
const svgI = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";
const IK = {
  users: svgI('<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20v-1a4 4 0 0 1 4-4h5a4 4 0 0 1 4 4v1"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M20.5 20v-1a4 4 0 0 0-2.5-3.7"/>'),
  nowi: svgI('<circle cx="9.5" cy="8" r="3.5"/><path d="M3 20v-1a4 4 0 0 1 4-4h5a4 4 0 0 1 4 4v1"/><path d="M19 8v6M16 11h6"/>'),
  odslony: svgI('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  odrzucenia: svgI('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
  czas: svgI('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  szukaj: svgI('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>'),
};

/** Kafelek jak w demo na stronie glownej: ikona, nazwa, wartosc, zmiana. countTo — liczba dolicza sie od zera. */
function tile(ikona, label, value, trendHtml, countTo) {
  const anim = isNum(countTo) ? ' data-to="' + Math.round(countTo) + '"' : "";
  return '<div class="pa-kpi"><dt><span class="pa-ki">' + ikona + '</span><span class="pa-kl">' + esc(label) + "</span></dt>" +
    '<dd class="pa-kv"' + anim + ">" + value + "</dd>" + (trendHtml ? "<dd>" + trendHtml + "</dd>" : "") + "</div>";
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

/* Strony jako wiersze-paski: dlugosc tla = odslony wzgledem najczesciej odwiedzanej. */
function pageRows(pages) {
  if (!pages || !pages.length) return '<p class="pa-empty">Brak danych o odwiedzanych stronach w tym okresie.</p>';
  const max = Math.max(...pages.map((p) => p.odslony)) || 1;
  return '<ul class="pa-pages">' + pages.map((p) =>
    '<li style="--w:' + ((p.odslony / max) * 100).toFixed(1) + '%"><span class="pa-pp" title="' + esc(p.sciezka) + '">' + esc(p.sciezka) + "</span>" +
    '<span class="num">' + fmtInt(p.odslony) + "</span></li>"
  ).join("") + "</ul>";
}

/* Srednia pozycja przelozona na to, co widzi klient: czy jest na pierwszej stronie Google.
   Liczone od wartosci po zaokragleniu do 0,1 — tej samej, ktora stoi obok znaczka. */
function miejsce(pos) {
  if (!isNum(pos)) return "";
  const r = Math.round(pos * 10) / 10;
  const [k, t] = r <= 3 ? ["g", "top 3"] : r <= 10 ? ["b", "1. strona"] : r <= 20 ? ["o", "2. strona"] : ["n", "dalej"];
  return '<span class="pa-badge pa-badge-' + k + '">' + t + "</span>";
}

function queryRows(queries) {
  if (!queries || !queries.length) {
    return '<p class="pa-empty">Search Console nie zwrócił jeszcze fraz dla tego okresu.</p>';
  }
  return (
    '<div class="pa-tbl-scroll"><table class="pa-tbl"><thead><tr><th scope="col">Fraza</th>' +
    '<th scope="col" class="num" aria-label="Kliknięcia"><span class="dl">Kliknięcia</span><span class="kr" aria-hidden="true">Klik.</span></th>' +
    '<th scope="col" class="num pa-col-imp">Wyświetlenia</th><th scope="col" class="num">Pozycja</th></tr></thead><tbody>' +
    queries.map((q) =>
      "<tr><td>" + esc(q.query) + "</td>" +
      '<td class="num">' + fmtInt(q.clicks) + "</td>" +
      '<td class="num pa-col-imp">' + fmtInt(q.impressions) + "</td>" +
      '<td class="num"><span class="pa-pos">' + fmtNum1(q.position) + "</span>" + miejsce(q.position) + "</td></tr>"
    ).join("") +
    "</tbody></table></div>"
  );
}

const MIES = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
const dzien = (iso) => { const d = new Date(iso + "T00:00:00Z"); return d.getUTCDate() + " " + MIES[d.getUTCMonth()]; };
const srednia = (a) => a.reduce((s, z) => s + z, 0) / (a.length || 1);

/* Etykieta nad wykresem, wyliczona z tych samych tygodni: rekord, kierunek albo spokoj. */
function trendTag(v) {
  const n = v.length;
  if (n >= 4 && v[n - 1] > Math.max(...v.slice(0, -1))) return ["up", "najlepszy tydzień"];
  if (n < 8) return null;
  const r = (srednia(v.slice(-4)) - srednia(v.slice(-8, -4))) / (srednia(v.slice(-8, -4)) || 1);
  return r > 0.05 ? ["up", "rośnie"] : r < -0.05 ? ["dn", "spada"] : ["flat", "stabilnie"];
}

/**
 * Sesje w pelnych tygodniach, rysowane na serwerze (dziala bez JS).
 * SVG rozciaga sie na szerokosc (preserveAspectRatio="none" + non-scaling-stroke); kropki, podpisy
 * i dymek sa w HTML, bo w rozciagnietym SVG kolo zrobiloby sie elipsa, a tekst mialby ~5 px.
 * data-pts: [tydzien, sesje, odmiana, x %, y %] — z tego skrypt rysuje celownik i dymek.
 */
function weeklyChart(weeks) {
  const W = 640, H = 200, P = { t: 30, b: 6 };
  const v = weeks.map((w) => w.sesje), max = Math.max(...v), n = v.length - 1;
  const krok = max > 2000 ? 500 : max > 400 ? 100 : 50;
  /* os od zera: pole pod linia czyta sie jak ilosc, a obciete dno udawaloby wiekszy wzrost */
  const top = Math.ceil((max * 1.1) / krok) * krok || krok, bot = 0;
  const x = (i) => (i * W) / n;
  const y = (z) => P.t + (1 - (z - bot) / (top - bot || 1)) * (H - P.t - P.b);
  const pc = (a, b) => +((a / b) * 100).toFixed(2);
  const d = v.map((z, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(z).toFixed(1)).join(" ");
  let siatka = "", osY = "";
  for (const z of [bot, (bot + top) / 2, top]) {
    siatka += '<line class="c-grid" x1="0" x2="' + W + '" y1="' + y(z) + '" y2="' + y(z) + '"/>';
    osY += '<span class="pa-ay num" style="top:' + pc(y(z), H) + '%">' + fmtInt(z) + "</span>";
  }
  const osX = [0, Math.round(n / 3), Math.round((2 * n) / 3), n]
    .map((i, k, a) => '<span class="num" style="left:' + pc(x(i), W) + "%;transform:translateX(" + (k === 0 ? "0" : k === a.length - 1 ? "-100%" : "-50%") + ')">' + dzien(weeks[i].start) + "</span>").join("");
  const pts = weeks.map((w, i) => [dzien(w.start), v[i], ses(v[i]), pc(x(i), W), pc(y(v[i]), H)]);
  return '<div class="pa-cw">' + osY +
    '<div class="pa-plot" tabindex="0" role="img" data-pts="' + esc(JSON.stringify(pts)) + '" aria-label="Sesje w ostatnich ' + weeks.length +
    " tygodniach: od " + fmtInt(v[0]) + " do " + fmtInt(v[n]) + ". Strzałki w lewo i w prawo pokazują kolejne tygodnie.\">" +
    '<svg class="pa-svg" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" aria-hidden="true">' +
    '<defs><linearGradient id="pa-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f6fe0" stop-opacity=".2"/><stop offset="1" stop-color="#2f6fe0" stop-opacity="0"/></linearGradient></defs>' +
    siatka + '<path class="c-area" d="' + d + " L" + W + " " + y(bot) + " L0 " + y(bot) + 'Z"/>' +
    '<path class="c-line" d="' + d + '"/></svg>' +
    '<span class="pa-end" style="left:' + pts[n][3] + "%;top:" + pts[n][4] + '%"></span>' +
    '<span class="pa-end-v num" style="top:' + pts[n][4] + '%">' + fmtInt(v[n]) + "</span>" +
    '<span class="pa-xh"></span><span class="pa-hd"></span><span class="pa-tip"></span>' +
    '</div><span class="pa-sr" aria-live="polite"></span></div><div class="pa-ax" aria-hidden="true">' + osX + "</div>";
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

  /* glowna liczba: sesje — z ta sama zmiana, co reszta, i srednia dzienna wyliczona z niej */
  const zmiana = trend(cur.sessions, prev.sessions);
  const dziennie = isNum(cur.sessions) ? Math.round(cur.sessions / days) : null;
  const hero =
    '<div class="pa-hero"><span class="pa-hero-ico" aria-hidden="true">' + ICONS.website + "</span>" +
    '<p class="pa-hero-l">Sesje na Twojej stronie w ostatnich ' + days + " dniach</p>" +
    '<p class="pa-hero-v"' + (isNum(cur.sessions) ? ' data-to="' + Math.round(cur.sessions) + '"' : "") + ">" + fmtInt(cur.sessions) + "</p>" +
    (zmiana ? '<p class="pa-hero-d">' + zmiana + "<span>wobec poprzednich " + days + " dni</span></p>" : "") +
    (isNum(dziennie) ? '<p class="pa-hero-note">Średnio <b>' + fmtInt(dziennie) + "</b> " + ses(dziennie) + " dziennie</p>" : "") +
    "</div>";

  const weeks = (data.weeks || []).filter((w) => isNum(w.sesje));
  const tag = weeks.length >= 4 ? trendTag(weeks.map((w) => w.sesje)) : null;
  const chart = weeks.length >= 4
    ? '<section class="pa-box pa-chartbox"><div class="pa-sec-h"><h2>Sesje w ostatnich ' + weeks.length + " tygodniach</h2>" +
      (tag ? '<span class="pa-badge pa-badge-' + ({ up: "g", dn: "r", flat: "n" })[tag[0]] + '">' + tag[1] + "</span>" : "") + "</div>" + weeklyChart(weeks) + "</section>"
    : "";

  const tiles =
    '<dl class="pa-kpis pa-stag">' +
    tile(IK.users, "Użytkownicy", fmtInt(cur.totalUsers), trend(cur.totalUsers, prev.totalUsers), cur.totalUsers) +
    tile(IK.nowi, "Nowi użytkownicy", fmtPct(newShare, 0), trend(newShare, newSharePrev, { kind: "pp" })) +
    tile(IK.odslony, "Odsłony", fmtInt(cur.screenPageViews), trend(cur.screenPageViews, prev.screenPageViews), cur.screenPageViews) +
    tile(IK.odrzucenia, "Odrzucenia", fmtPct(cur.bounceRate, 0), trend(cur.bounceRate, prev.bounceRate, { lowerIsBetter: true, kind: "pp" })) +
    tile(IK.czas, "Śr. czas sesji", fmtDur(cur.averageSessionDuration), trend(cur.averageSessionDuration, prev.averageSessionDuration, { kind: "sec" })) +
    "</dl>";

  /* Search Console pokazujemy tez wtedy, gdy jest skonfigurowany, ale nie odpowiedzial
     — z myslnikami. Ciche zniknienie wygladaloby, jakby SEO nie bylo czescia wdrozenia. */
  const gscBox = g || data.gscConfigured
    ? '<section class="pa-box pa-geo pa-stag"><div class="pa-geo-h"><span class="pa-geo-ico">' + IK.szukaj + "</span>" +
      "<div><h2>W wynikach Google</h2><p>Search Console · ostatnie " + days + " dni</p></div></div>" +
      '<dl class="pa-strip">' +
      kpi("Kliknięcia", fmtInt(g?.clicks), "", g?.clicks) +
      kpi("Wyświetlenia", fmtInt(g?.impressions), "", g?.impressions) +
      kpi("CTR", fmtPct(g?.ctr)) +
      kpi("Średnia pozycja", fmtNum1(g?.position), miejsce(g?.position)) +
      "</dl>" +
      '<h3 class="pa-sub-h">Frazy, po których trafiają do Ciebie</h3>' + queryRows(data.queries) + "</section>"
    : "";

  return (
    '<div class="pa-hero-row pa-stag">' + hero + chart + "</div>" +
    tiles +
    '<div class="pa-lower pa-stag">' +
    '<section class="pa-box"><div class="pa-sec-h"><h2>Skąd przychodzą</h2><span>sesje · udział</span></div>' + channelRows(data.channels) + "</section>" +
    '<section class="pa-box"><div class="pa-sec-h"><h2>Najczęściej odwiedzane</h2><span>odsłony</span></div>' + pageRows(data.pages) + "</section>" +
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
  <p class="pnl-stamp">${liveCount ? '<span class="pnl-pulse" aria-hidden="true"></span>' : ""}${licznik}</p>
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
    [].forEach.call(panel.querySelectorAll('[data-to]'), licz);
    [].forEach.call(panel.querySelectorAll('.pa-plot.pa-pre'), function(p){
      requestAnimationFrame(function(){ requestAnimationFrame(function(){ p.classList.add('is-on'); }); });
    });
    [].forEach.call(panel.querySelectorAll('.pa-trk i'), function(el){
      if(el.dataset.gotowe) return; el.dataset.gotowe='1';
      el.style.transform='scaleX(0)';
      requestAnimationFrame(function(){ requestAnimationFrame(function(){ el.style.transform=''; }); });
    });
  }

  /* Wykres rysuje sie od lewej przy wejsciu; potem celownik i dymek pod kursorem, palcem albo strzalkami. */
  var wykresy=[].slice.call(document.querySelectorAll('.pa-plot[data-pts]'));
  if(!spokojnie) wykresy.forEach(function(p){ p.classList.add('pa-pre'); });
  wykresy.forEach(function(pl){
    var pts; try{ pts=JSON.parse(pl.dataset.pts); }catch(e){ return; }
    var xh=pl.querySelector('.pa-xh'), hd=pl.querySelector('.pa-hd'), tip=pl.querySelector('.pa-tip'), akt=pts.length-1;
    var sr=pl.parentNode.querySelector('.pa-sr'), ogl=false;
    function pokaz(i){
      akt=Math.max(0,Math.min(pts.length-1,i)); var p=pts[akt];
      xh.style.left=hd.style.left=tip.style.left=p[3]+'%'; hd.style.top=tip.style.top=p[4]+'%';
      /* dymek przesuwa sie o tyle, ile punkt od lewej — przy krawedziach nie wychodzi poza wykres */
      tip.style.transform='translate(-'+p[3]+'%,calc(-100% - 16px))';
      tip.innerHTML='<b>'+fmt.format(p[1])+'</b> '+p[2]+'<span>tydzień od '+p[0]+'</span>';
      pl.classList.add('is-hover');
      if(ogl) sr.textContent='Tydzień od '+p[0]+': '+fmt.format(p[1])+' '+p[2];
    }
    function zPozycji(e){ var r=pl.getBoundingClientRect(); pokaz(Math.round((e.clientX-r.left)/r.width*(pts.length-1))); }
    function schowaj(){ pl.classList.remove('is-hover'); }
    pl.addEventListener('pointermove', zPozycji);
    pl.addEventListener('pointerdown', zPozycji);
    pl.addEventListener('pointerleave', function(e){ if(e.pointerType==='mouse') schowaj(); });
    document.addEventListener('pointerdown', function(e){ if(!pl.contains(e.target)) schowaj(); });
    pl.addEventListener('blur', function(){ ogl=false; schowaj(); });
    pl.addEventListener('focus', function(){ ogl=true; pokaz(akt); });
    pl.addEventListener('keydown', function(e){
      if(e.key==='ArrowLeft'||e.key==='ArrowRight'){ e.preventDefault(); ogl=true; pokaz(akt+(e.key==='ArrowRight'?1:-1)); }
      else if(e.key==='Escape') schowaj();
    });
  });

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
