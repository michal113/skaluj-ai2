/**
 * skaluj.ai — panel klienta: renderowanie HTML.
 *
 * Zasada nadrzedna: NIGDY nie renderujemy zmyslonej ani zastepczej liczby.
 * Brak danych => myslnik "—". Zero pokazujemy wylacznie wtedy, gdy Google
 * naprawde zwrocil zero. Panel bez podlaczonego zrodla dostaje jawny stan
 * "wkrotce" z nazwami metryk, ktore sie w nim pojawia — bez cyfr.
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

function fmtInt(v) {
  return v == null || !Number.isFinite(v) ? DASH : nf(0, 0).format(Math.round(v));
}
function fmtPct(v, decimals = 1) {
  return v == null || !Number.isFinite(v) ? DASH : nf(decimals, decimals).format(v * 100) + "%";
}
function fmtNum1(v) {
  return v == null || !Number.isFinite(v) ? DASH : nf(1, 1).format(v);
}
function fmtDur(sec) {
  if (sec == null || !Number.isFinite(sec)) return DASH;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m + ":" + String(s).padStart(2, "0");
}

/**
 * Znaczek trendu z realnego porownania okres/okres.
 * lowerIsBetter — dla metryk, gdzie spadek to poprawa (odrzucenia, pozycja w Google).
 * Brak porownania => brak znaczka (nie zgadujemy).
 */
function trend(cur, prev, { lowerIsBetter = false, unit = "%" } = {}) {
  if (cur == null || prev == null || !Number.isFinite(cur) || !Number.isFinite(prev) || prev === 0) return "";
  const diff = cur - prev;
  if (Math.abs(diff) < 1e-9) return '<span class="pa-trend pa-nu">bez zmian</span>';
  const pct = (diff / Math.abs(prev)) * 100;
  const better = lowerIsBetter ? diff < 0 : diff > 0;
  const arrow = diff > 0 ? "↑" : "↓";
  const val = unit === "pos" ? nf(1, 1).format(Math.abs(diff)) : nf(0, 0).format(Math.abs(pct)) + "%";
  return (
    '<span class="pa-trend ' + (better ? "pa-up" : "pa-dn") + '">' + arrow + " " + esc(val) + " vs poprz.</span>"
  );
}

function kpi(label, value, trendHtml) {
  return (
    '<div class="pa-kpi"><span class="pa-kl">' + esc(label) + '</span>' +
    '<span class="pa-kv">' + value + "</span>" + (trendHtml || "") + "</div>"
  );
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

function channelRows(channels) {
  if (!channels || !channels.length) {
    return '<p class="pa-note">Brak danych o źródłach ruchu w tym okresie.</p>';
  }
  return channels
    .map(
      (c) =>
        '<div class="pa-bar-row"><span class="pa-brl">' + esc(c.label) + "</span>" +
        '<span class="pa-brb"><span class="pa-brf" style="width:' + c.pct + '%"></span></span>' +
        '<span class="pa-brv">' + c.pct + "%</span></div>"
    )
    .join("");
}

function queryRows(queries) {
  if (!queries || !queries.length) {
    return '<p class="pa-note">Search Console nie zwrócił jeszcze fraz dla tego okresu.</p>';
  }
  return (
    '<table class="pa-tbl"><thead><tr><th>Fraza</th><th class="num">Kliknięcia</th>' +
    '<th class="num">Wyśw.</th><th class="num">Poz.</th></tr></thead><tbody>' +
    queries
      .map(
        (q) =>
          "<tr><td>" + esc(q.query) + "</td>" +
          '<td class="num">' + fmtInt(q.clicks) + "</td>" +
          '<td class="num">' + fmtInt(q.impressions) + "</td>" +
          '<td class="num">' + fmtNum1(q.position) + "</td></tr>"
      )
      .join("") +
    "</tbody></table>"
  );
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

  const cards =
    kpi("Sesje", fmtInt(cur.sessions), trend(cur.sessions, prev.sessions)) +
    kpi("Użytkownicy", fmtInt(cur.totalUsers), trend(cur.totalUsers, prev.totalUsers)) +
    kpi("Nowi użytkownicy", fmtPct(newShare, 0), trend(newShare, newSharePrev)) +
    kpi("Odsłony", fmtInt(cur.screenPageViews), trend(cur.screenPageViews, prev.screenPageViews)) +
    kpi("Współczynnik odrzuceń", fmtPct(cur.bounceRate), trend(cur.bounceRate, prev.bounceRate, { lowerIsBetter: true })) +
    kpi("Śr. czas sesji", fmtDur(cur.averageSessionDuration), trend(cur.averageSessionDuration, prev.averageSessionDuration));

  /* Karty pokazujemy tez wtedy, gdy Search Console jest skonfigurowany, ale nie odpowiedzial
     — z myslnikiem. Ciche zniknienie wygladaloby, jakby SEO nie bylo czescia wdrozenia. */
  const gscCards =
    g || data.gscConfigured
      ? '<div class="pa-kpis pa-kpis-4" style="margin-top:2px">' +
        kpi("Kliknięcia z Google", fmtInt(g?.clicks)) +
        kpi("Wyświetlenia w Google", fmtInt(g?.impressions)) +
        kpi("CTR w wynikach", fmtPct(g?.ctr)) +
        kpi("Średnia pozycja", fmtNum1(g?.position)) +
        "</div>"
      : "";

  return (
    '<p class="pa-period">Strona + SEO · ostatnie ' + days + " dni</p>" +
    '<div class="pa-kpis">' + cards + "</div>" +
    gscCards +
    '<div class="pa-lower">' +
    '<div class="pa-box"><div class="pa-box-head"><span class="pa-box-title">Źródła ruchu</span>' +
    '<span class="pa-box-sub">Udział sesji</span></div>' + channelRows(data.channels) + "</div>" +
    '<div class="pa-box"><div class="pa-box-head"><span class="pa-box-title">Najlepsze frazy</span>' +
    '<span class="pa-box-sub">Search Console</span></div>' + queryRows(data.queries) + "</div>" +
    "</div>" +
    '<p class="pa-note">Dane: Google Analytics 4 i Google Search Console, ostatnie ' + days +
    " dni wobec poprzednich " + days + " dni. Search Console raportuje z kilkudniowym opóźnieniem, " +
    "więc jego okno jest przesunięte o 3 dni.</p>"
  );
}

/* ---------- panel: wkrotce (bez podlaczonych danych) ---------- */

function soonPanel(p, contactUrl) {
  const cards = (p.metrics || [])
    .map(
      (m) =>
        '<div class="pa-kpi is-soon"><span class="pa-kl">' + esc(m) + "</span>" +
        '<span class="pa-kv">—</span><span class="pa-soon-wait">Uruchomimy z wdrożeniem</span></div>'
    )
    .join("");

  return (
    '<p class="pa-period">' + esc(p.label) + " · ten panel czeka na podłączenie</p>" +
    '<div class="pa-kpis pa-kpis-4">' + cards + "</div>" +
    '<div class="pa-soon-card">' +
    '<div class="pa-soon-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></svg></div>' +
    '<p class="pa-soon-h">Nie zmyślamy liczb</p>' +
    '<p class="pa-soon-p">' + esc(p.lead) + " Do tego czasu zostawiamy to miejsce puste — " +
    "zamiast pokazywać dane, których jeszcze nie mierzymy.</p>" +
    '<a class="pa-soon-btn" href="' + esc(contactUrl) + '?panel=' + esc(p.service) + '">Chcę uruchomić ten panel' +
    ' <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
    'stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>' +
    "</div>"
  );
}

/* ---------- strona ---------- */

export function renderPage({ config, data, days, brand, contactUrl, generatedAt }) {
  const tabs = PANELS.map((p, i) => {
    const live = config.panels?.[p.key]?.status === "live";
    return (
      '<button type="button" class="pa-tab' + (i === 0 ? " is-active" : "") + '" data-k="' + p.key + '">' +
      ICONS[p.key] + esc(p.label) + (live ? "" : ' <span class="pa-soon-dot" aria-hidden="true"></span>') +
      "</button>"
    );
  }).join("");

  const panels = PANELS.map((p, i) => {
    const live = config.panels?.[p.key]?.status === "live";
    const body = live && p.key === "website" ? websitePanel(data, days) : soonPanel(p, contactUrl);
    return '<section class="pa-panel' + (i === 0 ? "" : " pa-hidden") + '" data-panel="' + p.key + '">' + body + "</section>";
  }).join("");

  /* Podtytul musi byc prawdziwy takze wtedy, gdy nic nie jest jeszcze podlaczone —
     "Realne dane z Twoich narzedzi" nad samymi myslnikami czytaloby sie jak awaria. */
  const anyLive = PANELS.some((p) => config.panels?.[p.key]?.status === "live");
  const sub = anyLive
    ? "Realne dane z Twoich narzędzi. Aktualizacja przy każdym otwarciu tej strony."
    : "Tu pojawią się Twoje wyniki. Każdą zakładkę uruchamiamy razem z wdrożeniem usługi.";

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
  <a class="pnl-brand" href="https://skaluj.ai">
    <img src="https://skaluj.ai/sygnet.png" alt="" width="140" height="170">${esc(brand)}
  </a>
  <span class="pnl-for">Panel wyników · ${esc(config.clientName)}</span>
</div></header>

<main class="pnl-wrap">
  <div class="pnl-head">
    <h1 class="pnl-h1">Co dowozi Twoje wdrożenie</h1>
    <p class="pnl-sub">${esc(sub)}</p>
  </div>

  <div class="pa-tabs" id="paTabs"><span class="pa-tab-glider" id="paGlider" aria-hidden="true"></span>${tabs}</div>
  <div class="pa-panels">${panels}</div>
</main>

<footer class="pnl-wrap pnl-foot">
  <span>Wygenerowano ${esc(stamp)}</span>
  <span>Pytania? <a href="mailto:kontakt@skaluj.ai">kontakt@skaluj.ai</a></span>
</footer>

<script>
(function(){
  var tabs=document.getElementById('paTabs'), glider=document.getElementById('paGlider');
  if(!tabs) return;
  var btns=[].slice.call(tabs.querySelectorAll('.pa-tab'));
  var panels=[].slice.call(document.querySelectorAll('.pa-panel'));

  function moveGlider(btn){ glider.style.width=btn.offsetWidth+'px';
    glider.style.transform='translateX('+(btn.offsetLeft-4)+'px)'; }

  function show(k){
    btns.forEach(function(b){ b.classList.toggle('is-active', b.dataset.k===k); });
    panels.forEach(function(p){ p.classList.toggle('pa-hidden', p.dataset.panel!==k); });
    var active=btns.filter(function(b){ return b.dataset.k===k; })[0];
    if(active) moveGlider(active);
  }

  tabs.addEventListener('click', function(e){
    var b=e.target.closest('.pa-tab'); if(b) show(b.dataset.k);
  });

  /* wygaszenie krawedzi paska zakladek, gdy jest przewijalny (jak na stronie glownej) */
  function edges(){ var max=tabs.scrollWidth-tabs.clientWidth;
    tabs.classList.toggle('can-l', tabs.scrollLeft>4);
    tabs.classList.toggle('can-r', tabs.scrollLeft<max-4); }
  tabs.addEventListener('scroll', edges, {passive:true});
  window.addEventListener('resize', function(){ edges(); var a=tabs.querySelector('.pa-tab.is-active'); if(a) moveGlider(a); });

  edges();
  if(btns[0]) moveGlider(btns[0]);

  /* paski procentowe animuja sie z 0 po wejsciu */
  requestAnimationFrame(function(){ requestAnimationFrame(function(){
    [].forEach.call(document.querySelectorAll('.pa-brf'), function(el){
      var w=el.style.width; el.style.width='0%';
      requestAnimationFrame(function(){ el.style.width=w; });
    });
  });});
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
.nf{min-height:70vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px}
</style></head>
<body><main class="pnl-wrap nf">
<h1 class="pnl-h1">Nie znaleziono</h1>
<p class="pnl-sub">Ten adres nie istnieje lub stracił ważność.<br>Jeśli masz link od nas, sprawdź, czy skopiował się w całości.</p>
<p class="pa-note"><a href="https://skaluj.ai" style="color:var(--accent)">skaluj.ai</a></p>
</main></body></html>`;
}
