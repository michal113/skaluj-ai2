/**
 * skaluj.ai CRM — HTML panelu. Czysty HTML + CSS, zero JavaScriptu (CSP i tak blokuje skrypty).
 * Wszystko, co pochodzi z formularza lub z API, przechodzi przez esc().
 *
 * Wyglad: jezyk dema "panel wynikow" ze strony glownej i panelu klienta (kafelki z ikona, pigulki
 * zmian, glowna liczba w akcencie). Zakladki bez JS: linki #leady / #strona / #make / #chatbot,
 * a widocznosc sekcji ustawia CSS przez :target i :has().
 */

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/* useGrouping "always": bez tego pl-PL nie grupuje liczb 4-cyfrowych i obok "18 240" stoi "8420" */
const nf = new Intl.NumberFormat("pl-PL", { useGrouping: "always" });
const nf1 = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 1, useGrouping: "always" });
const usdFmt = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usdFine = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 });
const dtFmt = new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const dFmt = new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", day: "2-digit", month: "2-digit", year: "numeric" });

const DASH = "—";
const int = (n) => (n == null || !Number.isFinite(Number(n)) ? DASH : nf.format(Math.round(Number(n))));
const pln = (n) => (n == null ? DASH : nf.format(n) + " zł");
const usd = (n) => (n == null || !Number.isFinite(Number(n)) ? DASH : (Math.abs(n) < 1 && n !== 0 ? usdFine : usdFmt).format(n));
const pct = (x) => (x == null || !Number.isFinite(x) ? DASH : nf1.format(x * 100) + "%");
const when = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !isNaN(d) ? dtFmt.format(d).replace(",", "") : DASH;
};
const date = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !isNaN(d) ? dFmt.format(d) : DASH;
};
const mmss = (sec) => (sec == null ? DASH : Math.floor(sec / 60) + ":" + String(Math.round(sec % 60)).padStart(2, "0"));
/* przecinek w kroju mono ma pelna komorke — "4 , 1" czytaloby sie jak dwie liczby */
const dc = (s) => String(s).replace(",", '<span class="dc">,</span>');

/* polska odmiana: 1 zgloszenie, 2–4 zgloszenia (bez 12–14), reszta zgloszen */
const pl = (n, one, few, many) => {
  const a = Math.abs(Math.round(n)), j = a % 10, d = a % 100;
  return a === 1 ? one : j >= 2 && j <= 4 && (d < 12 || d > 14) ? few : many;
};

/** "40 min temu", "wczoraj", "6 dni temu" — wzgledem chwili wygenerowania strony. */
function ago(iso, now) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return DASH;
  const min = Math.max(0, Math.round((now - t) / 60000));
  if (min < 60) return min < 2 ? "przed chwilą" : min + " min temu";
  const h = Math.floor(min / 60);
  if (h < 24) return h + " godz. temu";
  const d = Math.floor(h / 24);
  return d < 2 ? "wczoraj" : d < 30 ? d + " dni temu" : date(iso);
}

const STATUS_LABEL = { nowy: "Nowy", kontakt: "W kontakcie", oferta: "Oferta wysłana", klient: "Klient", przegrany: "Przegrany" };
/* wartosci pola "svc" z formularza na stronie */
const SERVICE_LABEL = { strona: "Strona", geo: "SEO / GEO", "reklamy-chatgpt": "Reklamy w ChatGPT", branding: "Branding", rolki: "Rolki i wideo AI", audyt: "Audyt cyfryzacji", email: "Automatyzacje", chatbot: "Chatbot AI", inne: "Inne" };
const serviceLabel = (s) => SERVICE_LABEL[s] || s || DASH;
/* GA4 zwraca nazwy kanalow po angielsku */
const KANALY = {
  "Organic Search": "Google i wyszukiwarki", Direct: "Bezpośrednio", Referral: "Odesłania z innych stron",
  "Organic Social": "Social media", "Paid Search": "Reklamy w wyszukiwarce", "Paid Social": "Reklamy w social media",
  Email: "E-mail", "Organic Video": "Wideo", Display: "Reklamy displayowe", "Organic Shopping": "Zakupy",
  "Paid Shopping": "Reklamy produktowe", "Cross-network": "Kampanie wielokanałowe", Affiliates: "Programy partnerskie",
  "Organic Maps": "Mapy", "Paid Other": "Inne reklamy", Unassigned: "Nieprzypisane",
};

/* ---------- ikony: jeden rysunek (obrys 2 px) jak na stronie glownej ---------- */

const svg = (d) =>
  `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC = {
  inbox: svg('<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5.5 5h13L21 13v5.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5V13z"/>'),
  globe: svg('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.6 2.2 2.6 15.3 0 17.5c-2.6-2.2-2.6-15.3 0-17.5z"/>'),
  zap: svg('<path d="M12.5 3 5 13.5h5.2L10.8 21 19 9.8h-5.6z"/>'),
  chat: svg('<path d="M4 5.5h16v10.5H9.5L5 20v-4H4z"/>'),
  download: svg('<path d="M12 4v11M7 10.5l5 5 5-5"/><path d="M4.5 19.5h15"/>'),
  mail: svg('<rect x="3" y="5.5" width="18" height="13" rx="2.2"/><path d="M3.5 6.5 12 13l8.5-6.5"/>'),
  phone: svg('<path d="M5 4h3.5l1.8 4.5-2.3 1.4a11 11 0 0 0 6.1 6.1l1.4-2.3L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z"/>'),
  alert: svg('<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.1"/>'),
  ok: svg('<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.2 2.4 2.4 4.8-5"/>'),
  chevron: svg('<path d="m9 6 6 6-6 6"/>'),
  users: svg('<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20v-1a4 4 0 0 1 4-4h5a4 4 0 0 1 4 4v1"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M20.5 20v-1a4 4 0 0 0-2.5-3.7"/>'),
  eye: svg('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  clock: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  target: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>'),
  wallet: svg('<path d="M4 7.5h14.5A1.5 1.5 0 0 1 20 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"/><path d="M4 7.5 15.5 4v3.5M16 13.5h.1"/>'),
  coin: svg('<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.6 0-2.7.8-2.7 2s1.1 1.7 2.7 2 2.7.8 2.7 2-1.1 2-2.7 2c-1.1 0-2-.4-2.5-1.2M12 6.5V8M12 16v1.5"/>'),
  plug: svg('<path d="M9 3.5v4M15 3.5v4M6.5 7.5h11v3a5.5 5.5 0 0 1-11 0zM12 16v4.5"/>'),
};
const ARR = {
  up: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3.5 13 9H3z"/></svg>',
  dn: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 12.5 3 7h10z"/></svg>',
};

/* ---------- klocki ---------- */

/**
 * Zmiana okres do okresu: najpierw roznica w sztukach, procent dopiero przy bazie >= 100
 * (przy malych liczbach "+200%" brzmi niepowaznie). invert: spadek jest poprawa. kind: "int" | "sec".
 */
function delta(cur, prev, { invert = false, kind = "int" } = {}) {
  if (cur == null || prev == null || !Number.isFinite(Number(cur)) || !Number.isFinite(Number(prev))) return "";
  const r = Math.round(cur - prev);
  if (r === 0) return `<span class="pill">bez zmian</span>`;
  const sign = r > 0 ? "+" : "−";
  const proc = kind === "int" && prev >= 100 ? Math.round((Math.abs(cur - prev) / prev) * 100) : 0;
  const good = invert ? r < 0 : r > 0;
  return `<span class="pill ${good ? "up" : "down"}">${r > 0 ? ARR.up : ARR.dn}${sign}${kind === "sec" ? Math.abs(r) + " s" : nf.format(Math.abs(r))}${proc ? ` <small>(${sign}${proc}%)</small>` : ""}</span>`;
}

const hero = (icon, label, value, d, note) =>
  `<div class="hero"><span class="hero-ic">${icon}</span><p class="hero-l">${label}</p><p class="hero-v">${value}</p>${d ? `<p class="hero-d">${d}</p>` : ""}${note ? `<p class="hero-note">${note}</p>` : ""}</div>`;

const tile = (icon, label, value, sub = "") =>
  `<div class="tile"><dt><span class="ki">${icon}</span>${esc(label)}</dt><dd class="v">${value}</dd>${sub ? `<dd class="s">${sub}</dd>` : ""}</div>`;

const box = (title, aside, body, cls = "") =>
  `<div class="box ${cls}"><div class="box-h"><h3>${title}</h3>${aside ? `<span>${aside}</span>` : ""}</div>${body}</div>`;

const dm = (d) => d.slice(8, 10) + "." + d.slice(5, 7);

/** Slupki dzienne w CSS; dymek z data i liczba pod kursorem (::after z data-t), bez JS. */
function bars(daily, what) {
  if (!daily?.length) return "";
  const max = Math.max(1, ...daily.map((x) => x.n));
  const pusto = daily.every((x) => !x.n);
  const cols = daily
    .map((x) => `<span class="b${x.n ? "" : " z"}" style="--h:${x.n ? Math.max(4, Math.round((x.n / max) * 100)) : 0}%" data-t="${esc(dm(x.d))} · ${int(x.n)}"></span>`)
    .join("");
  const mid = daily[Math.floor((daily.length - 1) / 2)].d;
  const last = daily[daily.length - 1].d;
  return `<figure class="bars-w"><div class="bars" role="img" aria-label="${esc(what)} dziennie od ${esc(dm(daily[0].d))} do ${esc(dm(last))}, najwięcej ${int(max)} jednego dnia">${pusto ? `<span class="bars-empty">brak w tym okresie</span>` : `<span class="bars-max">${int(max)}</span>`}${cols}</div><figcaption aria-hidden="true"><span>${dm(daily[0].d)}</span><span>${dm(mid)}</span><span>${dm(last)}</span></figcaption></figure>`;
}

function hbars(rows) {
  if (!rows?.length) return `<p class="empty">Brak danych w tym okresie.</p>`;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return `<div class="hb">${rows
    .map(
      (r) =>
        `<div class="hb-row"><span class="hb-l">${esc(r.label)}</span><span class="hb-t"><i style="width:${Math.round((r.value / max) * 100)}%"></i></span><span class="hb-v">${esc(r.text ?? int(r.value))}</span></div>`
    )
    .join("")}</div>`;
}

/* Srednia pozycja przelozona na to, co widac w Google — liczona od wartosci zaokraglonej do 0,1 */
function miejsce(pos) {
  if (pos == null || !Number.isFinite(pos)) return "";
  const r = Math.round(pos * 10) / 10;
  const [k, t] = r <= 3 ? ["g", "top 3"] : r <= 10 ? ["b", "1. strona"] : r <= 20 ? ["o", "2. strona"] : ["n", "dalej"];
  return `<span class="pb pb-${k}">${t}</span>`;
}

const offBox = (missing) =>
  `<div class="setup">${IC.plug}<div><p class="setup-h">Jeszcze nie podłączone</p><p>Ustaw w Cloudflare (Worker → Settings → Variables): ${missing
    .map((m) => `<code>${esc(m)}</code>`)
    .join(" ")}. Instrukcja: <code>crm/README.md</code>.</p></div></div>`;

const errBox = (e) => `<div class="err">${IC.alert}<div><p class="setup-h">Źródło nie odpowiedziało</p><p>${esc(e)}</p></div></div>`;

const periodSeg = (ctx, id) =>
  `<nav class="seg" aria-label="Okres">${ctx.periods
    .map((p) => `<a href="?dni=${p}${id === "leady" && ctx.status ? "&amp;status=" + ctx.status : ""}#${id}"${p === ctx.days ? ' class="on" aria-current="true"' : ""}>${p} dni</a>`)
    .join("")}</nav>`;

function section(id, title, sub, body, ctx) {
  return `<section class="sec" id="${id}" aria-labelledby="h-${id}"><div class="sec-h"><div><h2 id="h-${id}">${esc(title)}</h2><p>${sub}</p></div>${periodSeg(ctx, id)}</div>${body}</section>`;
}

function gate(src, fn) {
  if (!src) return errBox("brak danych");
  if (src.state === "off") return offBox(src.missing);
  if (src.state === "error") return errBox(src.error);
  return fn(src);
}

/* ---------- wymaga uwagi: jedno miejsce na to, co trzeba dzis zrobic ---------- */

function attention(stats, leads, ctx) {
  const out = [];
  const L = stats.leads;
  if (L?.state === "ok") {
    const n = L.status?.nowy?.n || 0;
    if (n) {
      /* najstarsze z listy — gdy lista jest przefiltrowana do innego statusu, wieku po prostu nie podajemy */
      const najdluzej = leads.filter((l) => l.status === "nowy").reduce((m, l) => Math.max(m, ctx.now - (Date.parse(l.created_at) || ctx.now)), 0);
      const dni = Math.floor(najdluzej / 86400000);
      out.push({
        lvl: dni >= 1 ? "bad" : "warn",
        href: `?dni=${ctx.days}&amp;status=nowy#lista`,
        text: `<b>${int(n)} ${pl(n, "nowe zgłoszenie", "nowe zgłoszenia", "nowych zgłoszeń")}</b> ${pl(n, "czeka", "czekają", "czeka")} na kontakt` +
          (dni >= 1 ? ` · najstarsze od ${dni} ${pl(dni, "dnia", "dni", "dni")}` : ""),
      });
    }
  }
  const M = stats.make;
  if (M?.state === "ok") {
    for (const sc of M.scenarios) {
      if (sc.error) out.push({ lvl: "bad", href: "#make", text: `Scenariusz <b>${esc(sc.id)}</b> nie odpowiada` });
      else if (sc.invalid) out.push({ lvl: "bad", href: "#make", text: `<b>${esc(sc.name)}</b> zatrzymany przez błąd` });
      else if (sc.failed) out.push({ lvl: "warn", href: "#make", text: `<b>${esc(sc.name)}</b>: ${int(sc.failed)} ${pl(sc.failed, "błąd", "błędy", "błędów")} w ${ctx.days} dni` });
    }
    const o = M.org;
    if (o?.limit && o.used != null && o.used / o.limit >= 0.8)
      out.push({ lvl: o.used >= o.limit ? "bad" : "warn", href: "#make", text: `Make: zużyte <b>${pct(o.used / o.limit)}</b> operacji planu, odnowienie ${esc(date(o.nextReset))}` });
  }
  const C = stats.chat;
  if (C?.state === "ok") {
    if (C.key?.limit && C.key.remaining != null && C.key.remaining / C.key.limit < 0.2)
      out.push({ lvl: "warn", href: "#chatbot", text: `Klucz chatbota: zostało <b>${esc(usd(C.key.remaining))}</b> z limitu ${esc(usd(C.key.limit))}` });
    /* ponytail: staly prog 1 USD; przy wiekszym ruchu lepiej liczyc dni do wyczerpania z kosztu dziennego */
    if (C.balance != null && C.balance < 1)
      out.push({ lvl: C.balance <= 0 ? "bad" : "warn", href: "#chatbot", text: `Saldo OpenRouter: <b>${esc(usd(C.balance))}</b> — doładuj konto` });
  }
  const S = stats.site;
  if (S?.state === "ok") {
    if (S.ga4Configured && !S.ga4) out.push({ lvl: "bad", href: "#strona", text: "<b>Google Analytics</b> nie odpowiada" });
    if (S.gscConfigured && !S.gsc && S.gscError) out.push({ lvl: "bad", href: "#strona", text: "<b>Search Console</b> nie odpowiada" });
  }
  for (const [k, nazwa, href] of [["leads", "Baza zgłoszeń", "#leady"], ["site", "Statystyki strony", "#strona"], ["make", "Make", "#make"], ["chat", "OpenRouter", "#chatbot"]])
    if (stats[k]?.state === "error") out.push({ lvl: "bad", href, text: `<b>${nazwa}</b> nie odpowiada` });
  return out;
}

function attentionStrip(items) {
  if (!items.length)
    return `<div class="att-ok">${IC.ok}<span>Nic nie czeka na Ciebie: nowe zgłoszenia obsłużone, źródła odpowiadają.</span></div>`;
  return `<section class="att" aria-labelledby="h-att"><h2 class="att-h" id="h-att">${IC.alert}Wymaga uwagi <span>${items.length}</span></h2><ul>${items
    .map((i) => `<li><a class="att-i ${i.lvl}" href="${i.href}"><i aria-hidden="true"></i><span>${i.text}</span>${IC.chevron}</a></li>`)
    .join("")}</ul></section>`;
}

/* ---------- leady ---------- */

const STAGE_HINT = { nowy: "czeka na kontakt", kontakt: "w rozmowie", oferta: "wysłane oferty", klient: "wygrane", przegrany: "zamknięte bez umowy" };

function leadsSection(s, leads, ctx) {
  const st = s.status || {};
  const n = (k) => st[k]?.n || 0;
  const v = (k) => st[k]?.value || 0;
  const decided = n("klient") + n("przegrany");

  const top = `<div class="row r-leady">
    ${hero(IC.inbox, `Nowe zgłoszenia w ostatnich ${ctx.days} dniach`, int(s.current),
      s.previous != null ? `${delta(s.current, s.previous)}<span>wobec poprzednich ${ctx.days} dni (${int(s.previous)})</span>` : "",
      `<b>${int(s.marketing)}</b> ${pl(s.marketing, "osoba wyraziła", "osoby wyraziły", "osób wyraziło")} zgodę marketingową`)}
    ${box("Zgłoszenia dziennie", `${ctx.days} dni`, bars(s.daily, "Zgłoszenia"))}
    ${box("Czego dotyczą", `${ctx.days} dni`, hbars(s.services.map((r) => ({ label: serviceLabel(r.label), value: r.n }))), "svc")}
  </div>`;

  /* lejek: kazdy etap to zarazem filtr listy */
  const stage = (k) =>
    `<a class="st s-${k}${ctx.status === k ? " on" : ""}" href="?dni=${ctx.days}&amp;status=${k}#lista"${ctx.status === k ? ' aria-current="true"' : ""}>` +
    `<span class="st-l"><i></i>${STATUS_LABEL[k]}</span><span class="st-n">${int(n(k))}</span><span class="st-v">${v(k) ? esc(pln(v(k))) : STAGE_HINT[k]}</span></a>`;
  const pipe = `<nav class="pipe" aria-label="Lejek sprzedaży — filtruj listę">${ctx.statuses.map(stage).join("")}
    <div class="pipe-sum"><span class="st-l">Skuteczność</span><span class="st-n">${decided ? pct(n("klient") / decided) : DASH}</span><span class="st-v">${decided ? `${int(n("klient"))} z ${int(decided)} zamkniętych` : "nic jeszcze nie zamknięto"}</span></div></nav>`;

  const back = `?dni=${ctx.days}${ctx.status ? "&status=" + ctx.status : ""}`;
  const tools = `<div class="lt" id="lista"><h3>${ctx.status ? esc(STATUS_LABEL[ctx.status]) : "Wszystkie zgłoszenia"} <span>${int(ctx.status ? n(ctx.status) : s.total)}</span></h3>
    ${ctx.status ? `<a class="chip" href="?dni=${ctx.days}#lista">Pokaż wszystkie</a>` : ""}<a class="chip" href="/leady.csv">${IC.download}Eksport CSV</a></div>`;
  const list = leads.length
    ? `<div class="leads">${leads.map((l) => leadRow(l, ctx, back)).join("")}</div>`
    : `<div class="empty-box">${IC.inbox}<p>${ctx.status ? "Brak zgłoszeń z tym statusem." : "Jeszcze nie ma zgłoszeń. Pojawią się tu, gdy w scenariuszu formularza w Make dodasz moduł HTTP, który je tu wysyła (crm/README.md, punkt „Make → CRM”)."}</p></div>`;

  return top + pipe + tools + list;
}

const initials = (s) =>
  String(s).replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

function leadRow(l, ctx, back) {
  const tel = String(l.phone || "").replace(/[^\d+]/g, "");
  const name = l.name || l.email || "Bez nazwy";
  const wiek = ctx.now - (Date.parse(l.created_at) || ctx.now);
  const czeka = l.status === "nowy" && wiek >= 86400000 ? Math.floor(wiek / 86400000) : 0;
  const radios = ctx.statuses
    .map((k) => `<label class="rs s-${k}"><input type="radio" name="status" value="${k}"${l.status === k ? " checked" : ""}><span>${STATUS_LABEL[k]}</span></label>`)
    .join("");
  const temat = encodeURIComponent("Re: zapytanie ze skaluj.ai");
  return `<details class="lead" id="l-${esc(l.id)}">
  <summary>
    <span class="av" aria-hidden="true">${esc(initials(name))}</span>
    <span class="l-who"><b>${esc(name)}</b><small>${esc(l.company || l.email || "")}</small></span>
    <span class="l-svc">${esc(serviceLabel(l.service))}</span>
    <span class="l-st"><span class="badge b-${esc(l.status)}">${esc(STATUS_LABEL[l.status] || l.status)}</span>${czeka ? `<span class="wait">czeka ${czeka} ${pl(czeka, "dzień", "dni", "dni")}</span>` : ""}<span class="saved">zapisano</span></span>
    <span class="l-val">${l.value_pln != null ? esc(pln(l.value_pln)) : ""}</span>
    <span class="l-when" title="${esc(when(l.created_at))}">${esc(ago(l.created_at, ctx.now))}</span>
    ${IC.chevron}
  </summary>
  <div class="l-body">
    <div class="l-info">
      <div class="l-act">
        ${l.email ? `<a class="btn" href="mailto:${esc(l.email)}?subject=${temat}">${IC.mail}Napisz e-mail</a>` : ""}
        ${tel ? `<a class="btn ghost" href="tel:${esc(tel)}">${IC.phone}Zadzwoń</a>` : ""}
      </div>
      <dl class="l-meta">
        <div><dt>E-mail</dt><dd>${l.email ? `<a href="mailto:${esc(l.email)}">${esc(l.email)}</a>` : DASH}</dd></div>
        <div><dt>Telefon</dt><dd>${tel ? `<a href="tel:${esc(tel)}">${esc(l.phone)}</a>` : DASH}</dd></div>
        <div><dt>Usługa</dt><dd>${esc(serviceLabel(l.service))}</dd></div>
        <div><dt>Termin</dt><dd>${esc(l.termin || DASH)}</dd></div>
        <div><dt>Wysłano</dt><dd>${esc(when(l.sent_at || l.created_at))}</dd></div>
        <div><dt>Marketing</dt><dd>${l.marketing ? `<span class="yes">zgoda</span> ${esc(l.marketing_text || "")}` : `<span class="no">brak zgody</span> — nie wysyłaj ofert handlowych`}</dd></div>
      </dl>
      <blockquote class="l-msg">${esc(l.message || "(bez treści)")}</blockquote>
    </div>
    <form class="l-form" method="post" action="/leady/${esc(l.id)}">
      <input type="hidden" name="back" value="${esc(back)}">
      <fieldset class="rsg"><legend>Status</legend>${radios}</fieldset>
      <label>Wartość<span class="in-zl"><input name="value" inputmode="numeric" value="${l.value_pln ?? ""}" placeholder="np. 4500"><i>zł</i></span></label>
      <label class="full">Notatka<textarea name="note" rows="3" maxlength="2000" placeholder="np. dzwonić po 15, prosi o wycenę strony + SEO">${esc(l.note || "")}</textarea></label>
      <div class="l-save"><button type="submit">Zapisz zmiany</button><span>ostatnia zmiana ${esc(when(l.updated_at))}</span></div>
    </form>
    <details class="l-del">
      <summary>Usuń zgłoszenie…</summary>
      <form method="post" action="/leady/${esc(l.id)}/usun">
        <input type="hidden" name="back" value="${esc(back)}">
        <label><input type="checkbox" name="confirm" value="tak" required> usuń na stałe (np. na prośbę tej osoby, art. 17 RODO)</label>
        <button type="submit" class="danger">Usuń</button>
      </form>
    </details>
  </div>
</details>`;
}

/* ---------- strona ---------- */

function siteSection(s, ctx) {
  let out = "";
  if (s.ga4Configured) {
    const c = s.ga4?.current, p = s.ga4?.previous;
    const konw = c?.sessions && ctx.leadsCurrent != null ? pct(ctx.leadsCurrent / c.sessions) : DASH;
    out += s.ga4
      ? `<div class="row r-hero">
        ${hero(IC.globe, `Sesje na stronie w ostatnich ${ctx.days} dniach`, int(c?.sessions),
          delta(c?.sessions, p?.sessions) ? `${delta(c?.sessions, p?.sessions)}<span>wobec poprzednich ${ctx.days} dni</span>` : "",
          `Średnio <b>${int(c?.sessions / ctx.days)}</b> ${pl(Math.round(c?.sessions / ctx.days) || 0, "sesja", "sesje", "sesji")} dziennie`)}
        <dl class="tiles t4">
          ${tile(IC.users, "Użytkownicy", int(c?.totalUsers), delta(c?.totalUsers, p?.totalUsers))}
          ${tile(IC.eye, "Odsłony", int(c?.screenPageViews), delta(c?.screenPageViews, p?.screenPageViews))}
          ${tile(IC.clock, "Śr. czas sesji", esc(mmss(c?.averageSessionDuration)), delta(c?.averageSessionDuration, p?.averageSessionDuration, { kind: "sec" }))}
          ${tile(IC.target, "Konwersja na zgłoszenie", konw, "zgłoszenia ÷ sesje, orientacyjnie")}
        </dl>
      </div>
      ${box("Skąd przychodzą", "sesje · udział", hbars((s.channels || []).map((r) => ({ label: KANALY[r.label] || r.label, value: r.sessions, text: int(r.sessions) + " · " + r.pct + "%" }))))}
      <p class="fine">GA4 liczy tylko osoby, które zgodziły się na analitykę w banerze cookies, więc liczby są niższe niż realny ruch. Okres kończy się wczoraj.</p>`
      : errBox("GA4: " + (s.ga4Error || "brak danych"));
  } else {
    out += offBox(["GA4_PROPERTY_ID"]);
  }
  if (s.gscConfigured) {
    out += s.gsc
      ? `<div class="box geo"><div class="geo-h"><span class="ki">${IC.search}</span><div><h3>W wynikach Google</h3><p>Search Console · ${ctx.days} dni</p></div></div>
        <dl class="strip">
          <div><dt>Kliknięcia</dt><dd>${int(s.gsc.clicks)}</dd></div>
          <div><dt>Wyświetlenia</dt><dd>${int(s.gsc.impressions)}</dd></div>
          <div><dt>CTR</dt><dd>${pct(s.gsc.ctr)}</dd></div>
          <div><dt>Średnia pozycja</dt><dd>${s.gsc.position == null ? DASH : nf1.format(s.gsc.position)}</dd>${s.gsc.position == null ? "" : `<dd>${miejsce(s.gsc.position)}</dd>`}</div>
        </dl>
        <h4 class="sub-h">Frazy, po których Cię znajdują</h4>${queriesTable(s.queries)}</div>
      <p class="fine">Search Console raportuje z ok. 3-dniowym opóźnieniem.</p>`
      : errBox("Search Console: " + (s.gscError || "brak danych w tym okresie"));
  } else {
    out += offBox(["GSC_SITE_URL"]);
  }
  return out;
}

function queriesTable(rows) {
  if (!rows?.length) return `<p class="empty">Brak danych w tym okresie.</p>`;
  return `<div class="tw"><table><thead><tr><th>Fraza</th><th class="n">Kliknięcia</th><th class="n col-imp">Wyświetlenia</th><th class="n">Pozycja</th></tr></thead><tbody>${rows
    .map(
      (r) =>
        `<tr><td>${esc(r.query)}</td><td class="n">${int(r.clicks)}</td><td class="n col-imp">${int(r.impressions)}</td><td class="n">${r.position == null ? DASH : dc(nf1.format(r.position))}${miejsce(r.position)}</td></tr>`
    )
    .join("")}</tbody></table></div>`;
}

/* ---------- Make ---------- */

function makeSection(s, ctx) {
  const o = s.org;
  let plan;
  if (o) {
    const share = o.limit ? Math.min(1, (o.used || 0) / o.limit) : null;
    plan = box(`Plan Make${o.plan ? " · " + esc(o.plan) : ""}`, `odnowienie ${esc(date(o.nextReset))}`,
      `<p class="plan-v"><b>${int(o.used)}</b>${o.limit ? `z ${int(o.limit)} operacji` : "operacji"}</p>` +
      (share != null ? `<div class="meter${share >= 0.9 ? " bad" : share >= 0.8 ? " warn" : ""}"><i style="width:${Math.round(share * 100)}%"></i></div><p class="fine">${pct(share)} limitu w tym okresie rozliczeniowym</p>` : ""),
      "plan");
  } else {
    plan = s.orgError ? errBox("Organizacja: " + s.orgError) : `<p class="fine">Ustaw <code>MAKE_ORG_ID</code>, żeby widzieć zużycie limitu planu.</p>`;
  }

  const cards = s.scenarios
    .map((sc) => {
      if (sc.error) return errBox("Scenariusz " + sc.id + ": " + sc.error);
      const [cls, lbl] = sc.invalid ? ["bad", "zatrzymany przez błąd"] : sc.paused ? ["warn", "wstrzymany"] : sc.active ? ["ok", "aktywny"] : ["off", "wyłączony"];
      const udane = sc.runs ? sc.ok / sc.runs : null;
      return `<div class="box sc">
        <div class="sc-h"><span class="ki">${IC.zap}</span><h3 title="${esc(sc.name)}">${esc(sc.name)}</h3><span class="badge b-${cls}">${lbl}</span></div>
        <dl class="sc-k">
          <div><dt>Uruchomienia</dt><dd>${int(sc.runs)}${sc.truncated ? "+" : ""}</dd></div>
          <div><dt>Udane</dt><dd>${udane == null ? DASH : pct(udane)}</dd></div>
          <div><dt>Błędy</dt><dd${sc.failed ? ' class="bad"' : ""}>${int(sc.failed)}</dd></div>
          <div><dt>Ostrzeżenia</dt><dd>${int(sc.warn)}</dd></div>
          <div><dt>Operacje</dt><dd>${int(sc.operations)}</dd></div>
          <div><dt>Niedokończone</dt><dd>${int(sc.incomplete)}</dd></div>
        </dl>
        ${bars(sc.daily, "Uruchomienia")}
        ${sc.lastError || sc.credits != null ? `<p class="fine">${sc.lastError ? `Ostatni błąd: ${esc(when(sc.lastError))}.` : ""} ${sc.credits != null ? esc(nf1.format(sc.credits)) + " kredytów w okresie." : ""}</p>` : ""}
      </div>`;
    })
    .join("");
  return plan + `<div class="scs">${cards}</div>`;
}

/* ---------- chatbot ---------- */

function chatSection(s, ctx) {
  const scope = s.keyName ? `klucz „${esc(s.keyName)}”` : "całe konto OpenRouter";
  const warn = s.keyMissing ? `<div class="setup">${IC.plug}<div><p>Nie znalazłem klucza o nazwie z <code>OPENROUTER_KEY_NAME</code>. Pokazuję dane całego konta.</p></div></div>` : "";
  const k = s.key;
  const limitSub = k?.limit != null
    ? `<span class="meter sm"><i style="width:${Math.min(100, Math.round(((k.limit - (k.remaining ?? k.limit)) / k.limit) * 100))}%"></i></span>zostało ${esc(usd(k.remaining))} z ${esc(usd(k.limit))}`
    : "bez limitu na kluczu";
  const models = s.models.length
    ? `<div class="tw"><table><thead><tr><th>Model</th><th class="n">Zapytania</th><th class="n col-imp">Tokeny</th><th class="n">Koszt</th></tr></thead><tbody>${s.models
        .map((m) => `<tr><td><code>${esc(m.model)}</code></td><td class="n">${int(m.requests)}</td><td class="n col-imp">${int(m.tokens)}</td><td class="n">${dc(esc(usd(m.cost)))}</td></tr>`)
        .join("")}</tbody></table></div>`
    : `<p class="empty">Brak zapytań w tym okresie.</p>`;
  return `${warn}<div class="row r-hero">
      ${hero(IC.chat, `Wiadomości do chatbota w ostatnich ${s.span} dniach`, int(s.requests), `<span>${scope}</span>`,
        s.requests ? `Średnio <b>${esc(usd(s.cost / s.requests))}</b> za wiadomość` : "Brak wiadomości w tym okresie")}
      <dl class="tiles t4">
        ${tile(IC.coin, `Koszt w ${s.span} dni`, esc(usd(s.cost)))}
        ${tile(IC.wallet, "Saldo kredytów", esc(usd(s.balance)), "OpenRouter")}
        ${k ? tile(IC.clock, "Koszt dziś", esc(usd(k.today))) : ""}
        ${k ? tile(IC.coin, "Koszt w tym miesiącu", esc(usd(k.month)), limitSub) : ""}
      </dl>
    </div>
    <div class="row r-2">
      ${box("Wiadomości dziennie", `${s.span} dni`, bars(s.daily, "Wiadomości"))}
      ${box("Modele", "", models)}
    </div>
    <p class="fine">OpenRouter udostępnia ostatnie 30 pełnych dni (bez dzisiaj). Jedna wiadomość może dać więcej niż jedno zapytanie, jeśli zadziała model zapasowy. Treści rozmów nie są nigdzie zapisywane.</p>`;
}

/* ---------- strona ---------- */

export function renderDashboard({ leads, stats, days, status, periods, statuses, generatedAt }) {
  const ctx = { days, status, statuses, periods, now: generatedAt.getTime(), leadsCurrent: stats.leads?.state === "ok" ? stats.leads.current : null };
  const nowe = stats.leads?.state === "ok" ? stats.leads.status?.nowy?.n || 0 : 0;

  const tabs = `<nav class="tabs" aria-label="Sekcje panelu">
      <a class="tab t-leady" href="#leady">${IC.inbox}Zgłoszenia${nowe ? `<b class="tab-n" title="nowe, czekają na kontakt">${int(nowe)}</b>` : ""}</a>
      <a class="tab t-strona" href="#strona">${IC.globe}Strona</a>
      <a class="tab t-make" href="#make">${IC.zap}<span class="tl">Automatyzacje</span><span class="ts">Make</span></a>
      <a class="tab t-chatbot" href="#chatbot">${IC.chat}Chatbot</a>
    </nav>`;

  const body =
    attentionStrip(attention(stats, leads, ctx)) +
    section("leady", "Zgłoszenia", "Formularz na stronie → Make → tutaj. Kliknij zgłoszenie, żeby zmienić status, wpisać wartość i notatkę.", gate(stats.leads, (s) => leadsSection(s, leads, ctx)), ctx) +
    section("strona", "Ruch i Google", "Google Analytics 4 i Search Console dla skaluj.ai.", gate(stats.site, (s) => siteSection(s, ctx)), ctx) +
    section("make", "Automatyzacje", "Scenariusze w Make.com: uruchomienia, błędy i zużycie planu.", gate(stats.make, (s) => makeSection(s, ctx)), ctx) +
    section("chatbot", "Chatbot", "Asystent AI na stronie: ruch i koszty w OpenRouter.", gate(stats.chat, (s) => chatSection(s, ctx)), ctx);

  return page(
    "CRM · skaluj.ai",
    `<header class="top"><div class="wrap top-in">
      <a class="brand" href="/" aria-label="CRM skaluj.ai — początek"><img src="https://skaluj.ai/sygnet.png" alt="" width="140" height="170"><img class="word" src="https://skaluj.ai/samo%20skaluj.png" alt="skaluj.ai" width="478" height="112"><span class="brand-sep" aria-hidden="true"></span><span class="brand-tag">CRM</span></a>
      ${tabs}
      <span class="stamp">dane z ${esc(when(generatedAt.toISOString()))}</span>
    </div></header>
    <main class="wrap">${body}</main>
    <footer class="wrap foot"><span>Dane pobrane ${esc(when(generatedAt.toISOString()))}. Odśwież stronę, żeby pobrać nowe.</span><span>Panel prywatny — nie udostępniaj hasła.</span></footer>`
  );
}

export function renderMessage(title, text) {
  return page(
    title,
    `<main class="msg"><div class="msg-card"><img src="https://skaluj.ai/sygnet.png" alt="skaluj.ai" width="140" height="170"><h1>${esc(title)}</h1>${text ? `<p>${esc(text)}</p>` : ""}</div></main>`
  );
}

function page(title, inner) {
  return `<!doctype html><html lang="pl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title>
<link rel="icon" type="image/png" href="https://skaluj.ai/sygnet.png"><link rel="stylesheet" href="https://skaluj.ai/fonts.css">
<style>${CSS}</style></head><body>${inner}</body></html>`;
}

const CSS = `
:root{--bg:#fff;--elev:#f7f8fa;--elev2:#eef1f5;--text:#0b0d10;--muted:#565d68;--faint:#626873;
--line:rgba(0,0,0,.10);--line2:rgba(0,0,0,.06);
--accent:#2f6fe0;--accent-ink:#2456b0;--accent-soft:rgba(47,111,224,.10);
--good:#137038;--good-bg:rgba(22,163,74,.10);--bad:#b4321f;--bad-bg:rgba(220,38,38,.08);--warn:#a8380a;--warn-bg:rgba(234,88,12,.10);
--tile:linear-gradient(180deg,#fff 0%,#f8f9fb 100%);--tile-sh:0 1px 2px rgba(15,30,60,.04);
--sans:"Geist",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;--mono:"Azeret Mono",ui-monospace,Menlo,monospace;
--ease:cubic-bezier(.22,1,.36,1)}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scrollbar-color:#c5cad3 transparent;scrollbar-width:thin;-webkit-text-size-adjust:100%}
body{background:var(--bg);color:var(--text);font:15px/1.55 var(--sans);letter-spacing:-.011em;-webkit-font-smoothing:antialiased;
  min-height:100vh;display:flex;flex-direction:column}
/* niebieski wash pod gora strony — ten sam co w hero skaluj.ai */
body::before{content:"";position:absolute;inset:0 0 auto;height:460px;z-index:-1;pointer-events:none;
  background:radial-gradient(ellipse 85% 75% at 50% -12%,rgba(47,111,224,.09),transparent 70%)}
::selection{background:var(--accent-soft);color:var(--text)}
a{color:inherit;text-decoration:none}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:6px}
.wrap{max-width:1180px;margin:0 auto;padding:0 clamp(16px,4vw,40px);width:100%}
.ic{width:16px;height:16px;flex:none}
code{font-family:var(--mono);font-size:.82em;background:var(--elev2);padding:1px 6px;border-radius:5px;word-break:break-all}
.fine{font-size:12.5px;color:var(--faint);line-height:1.55;margin:10px 0 14px;max-width:80ch}
.empty{font-size:13px;color:var(--muted)}

/* ===== belka ===== */
.top{position:sticky;top:0;z-index:10;background:rgba(255,255,255,.86);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  border-bottom:1px solid var(--line2)}
.top-in{display:flex;align-items:center;gap:18px;min-height:64px}
.brand{display:inline-flex;align-items:center;gap:8px;flex:none}
.brand img{display:block;height:21px;width:auto}
.brand .word{height:16px}
.brand-sep{width:1px;height:18px;background:var(--line);margin:0 3px}
.brand-tag{font-family:var(--mono);font-size:11px;letter-spacing:.12em;color:var(--faint)}
.tabs{display:inline-flex;gap:2px;padding:4px;margin:0 auto;background:var(--elev2);border:1px solid var(--line2);border-radius:999px;
  max-width:100%;overflow-x:auto;scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tab{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:999px;font-size:13px;font-weight:500;color:var(--muted);
  white-space:nowrap;transition:color .2s,background-color .2s,box-shadow .25s}
.tab .ic{width:14px;height:14px;opacity:.75}
.tab:hover{color:var(--text)}
.ts{display:none}
.tab-n{font:600 11px var(--mono);background:var(--accent);color:#fff;border-radius:999px;padding:1px 7px}
/* aktywna zakladka bez JS: domyslnie Zgloszenia, inaczej ta, na ktora wskazuje #adres */
.t-leady,body:has(#strona:target) .t-strona,body:has(#make:target) .t-make,body:has(#chatbot:target) .t-chatbot{
  background:#fff;color:var(--text);box-shadow:0 2px 10px rgba(15,30,60,.14),0 0 0 1px rgba(0,0,0,.045)}
.t-leady .ic,body:has(#strona:target) .t-strona .ic,body:has(#make:target) .t-make .ic,body:has(#chatbot:target) .t-chatbot .ic{color:var(--accent);opacity:1}
body:has(#strona:target) .t-leady,body:has(#make:target) .t-leady,body:has(#chatbot:target) .t-leady{background:none;color:var(--muted);box-shadow:none}
body:has(#strona:target) .t-leady .ic,body:has(#make:target) .t-leady .ic,body:has(#chatbot:target) .t-leady .ic{color:inherit;opacity:.75}
.stamp{font-family:var(--mono);font-size:11px;color:var(--faint);white-space:nowrap;flex:none}

/* ===== wymaga uwagi ===== */
.att{margin:24px 0 0;border:1px solid var(--line2);border-radius:16px;background:var(--tile);box-shadow:var(--tile-sh);padding:14px 18px 10px}
.att-h{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;letter-spacing:-.01em;margin-bottom:6px}
.att-h .ic{color:var(--warn)}
.att-h span{font:600 11px var(--mono);color:var(--warn);background:var(--warn-bg);border-radius:999px;padding:1px 7px}
.att ul{list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:0 18px}
.att-i{display:flex;align-items:center;gap:11px;padding:8px 10px;margin:0 -10px;border-radius:10px;font-size:13.5px;color:var(--muted);
  transition:background-color .2s}
.att-i:hover{background:rgba(47,111,224,.05)}
.att-i>i{width:8px;height:8px;border-radius:50%;flex:none}
.att-i.warn>i{background:#ea580c;box-shadow:0 0 0 3px var(--warn-bg)}
.att-i.bad>i{background:#dc2626;box-shadow:0 0 0 3px var(--bad-bg)}
.att-i b{color:var(--text);font-weight:600}
.att-i span{flex:1;min-width:0}
.att-i .ic{width:14px;height:14px;color:var(--faint);transition:transform .2s var(--ease)}
.att-i:hover .ic{transform:translateX(2px)}
.att-ok{display:flex;align-items:center;gap:10px;margin:24px 0 0;padding:12px 16px;border:1px solid rgba(22,163,74,.22);border-radius:14px;
  background:rgba(22,163,74,.05);font-size:13.5px;color:var(--good)}

/* ===== sekcje-zakladki ===== */
/* ogromny scroll-margin: przejscie na zakladke zawsze pokazuje strone od gory (pasek uwagi + sekcja), jak prawdziwe zakladki */
.sec{display:none;padding:28px 0 8px;scroll-margin-top:200vh;animation:secIn .35s var(--ease)}
#leady{display:block}
body:has(#strona:target) #leady,body:has(#make:target) #leady,body:has(#chatbot:target) #leady{display:none}
#strona:target,#make:target,#chatbot:target{display:block}
@keyframes secIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.sec-h{display:flex;justify-content:space-between;align-items:flex-end;gap:12px 20px;flex-wrap:wrap;margin-bottom:16px}
.sec-h h2{font-size:clamp(1.5rem,2.4vw,1.9rem);font-weight:560;letter-spacing:-.03em;line-height:1.15}
.sec-h p{font-size:13.5px;color:var(--muted);margin-top:4px;max-width:70ch}
.seg{display:inline-flex;gap:2px;padding:3px;background:var(--elev2);border:1px solid var(--line2);border-radius:999px;flex:none}
.seg a{font-size:12.5px;padding:5px 12px;border-radius:999px;color:var(--muted);white-space:nowrap;transition:color .2s}
.seg a:hover{color:var(--text)}
.seg a.on{background:#fff;color:var(--text);font-weight:550;box-shadow:0 1px 4px rgba(15,30,60,.12)}

/* ===== skrzynki, glowna liczba, kafelki ===== */
.row{display:grid;gap:14px;margin-bottom:14px}
.r-leady{grid-template-columns:minmax(0,1fr) minmax(0,1.35fr) minmax(0,1fr)}
.r-hero{grid-template-columns:minmax(0,1fr) minmax(0,1.4fr)}
.r-2{grid-template-columns:minmax(0,1.3fr) minmax(0,1fr)}
.box{min-width:0;background:var(--tile);border:1px solid var(--line2);border-radius:16px;padding:18px 20px 20px;box-shadow:var(--tile-sh);margin-bottom:14px}
.row>.box{margin-bottom:0}
.box-h{display:flex;justify-content:space-between;align-items:baseline;gap:4px 12px;flex-wrap:wrap;margin-bottom:14px}
.box-h h3{font-size:14px;font-weight:600;letter-spacing:-.01em}
.box-h span{font-size:12px;color:var(--faint)}
.hero{position:relative;overflow:hidden;min-width:0;border:1px solid rgba(47,111,224,.18);border-radius:16px;padding:22px 22px 20px;
  display:flex;flex-direction:column;justify-content:center;box-shadow:var(--tile-sh);
  background:radial-gradient(130% 130% at 85% 0%,rgba(47,111,224,.11),rgba(255,255,255,0) 60%),var(--tile)}
.hero-ic{position:absolute;right:-26px;bottom:-34px;width:170px;height:170px;color:var(--accent);opacity:.07;pointer-events:none}
.hero-ic .ic{width:100%;height:100%;stroke-width:1.3}
.hero-l{position:relative;font-size:13.5px;color:var(--muted);margin-bottom:10px;max-width:26ch}
.hero-v{position:relative;font-size:clamp(2.8rem,5.5vw,4rem);font-weight:580;letter-spacing:-.04em;line-height:.95;color:var(--accent);
  margin-bottom:14px;white-space:nowrap}
.hero-d{position:relative;display:flex;align-items:center;flex-wrap:wrap;gap:6px 9px;font-size:12.5px;color:var(--faint)}
.hero-note{position:relative;margin-top:14px;padding-top:12px;border-top:1px solid var(--line2);font-size:13px;color:var(--muted)}
.hero-note b{color:var(--text);font-weight:600}
.pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;font:11.5px var(--mono);letter-spacing:-.01em;
  white-space:nowrap;color:var(--muted);background:var(--elev2)}
.pill svg{width:9px;height:9px;fill:currentColor;flex:none}
.pill small{font:inherit;opacity:.75}
.pill.up{color:var(--good);background:var(--good-bg)}
.pill.down{color:var(--bad);background:var(--bad-bg)}
.tiles{display:grid;gap:12px}
.t4{grid-template-columns:repeat(2,minmax(0,1fr))}
.tile{min-width:0;background:var(--tile);border:1px solid var(--line2);border-radius:14px;padding:15px 16px 14px;box-shadow:var(--tile-sh);
  transition:border-color .25s,box-shadow .3s var(--ease)}
.tile:hover{border-color:rgba(47,111,224,.28);box-shadow:0 14px 28px -18px rgba(47,111,224,.45)}
.tile dt{display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--faint);min-width:0}
.ki{width:28px;height:28px;border-radius:8px;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;flex:none}
.ki .ic{width:15px;height:15px}
.tile .v{font-size:clamp(1.45rem,2.2vw,1.8rem);font-weight:570;letter-spacing:-.035em;line-height:1;margin:13px 0 9px;white-space:nowrap}
.tile .s{display:flex;align-items:center;flex-wrap:wrap;gap:6px 8px;font-size:12px;color:var(--faint)}

/* ===== wykres slupkowy z dymkiem w CSS ===== */
.bars-w{margin:0}
.bars{position:relative;display:flex;align-items:stretch;gap:2px;height:136px;padding-top:18px;border-bottom:1px solid var(--line)}
.bars::before{content:"";position:absolute;left:0;right:0;top:18px;border-top:1px dashed var(--line)}
.bars-max{position:absolute;top:0;right:0;font:11px var(--mono);color:var(--faint);word-spacing:-.4em}
.bars-empty{position:absolute;inset:18px 0 0;display:flex;align-items:center;justify-content:center;font-size:12.5px;color:var(--faint)}
.b{position:relative;flex:1;min-width:2px}
.b::before{content:"";position:absolute;left:0;right:0;bottom:0;height:var(--h);border-radius:3px 3px 0 0;
  background:linear-gradient(180deg,#6a9ef3,var(--accent));transform-origin:bottom;animation:growY .7s var(--ease) both}
.b.z::before{height:2px;background:var(--elev2);animation:none}
.b:hover::before{background:var(--accent-ink)}
.b::after{content:attr(data-t);position:absolute;left:50%;bottom:calc(var(--h) + 8px);transform:translateX(-50%);z-index:3;
  padding:4px 8px;border-radius:7px;background:#0b0d10;color:#fff;font:11px var(--mono);white-space:nowrap;word-spacing:-.3em;
  opacity:0;pointer-events:none;transition:opacity .15s}
.b:hover::after{opacity:1}
/* przy krawedziach dymek przyklejony do boku, zeby nie wychodzil poza wykres */
.b:nth-child(-n+5)::after{left:0;transform:none}
.b:nth-last-child(-n+4)::after{left:auto;right:0;transform:none}
.bars-w figcaption{display:flex;justify-content:space-between;font:11px var(--mono);color:var(--faint);margin-top:7px}
@keyframes growY{from{transform:scaleY(0)}to{transform:none}}

/* ===== paski poziome ===== */
.hb{display:grid;gap:2px}
.hb-row{display:grid;grid-template-columns:minmax(0,150px) minmax(0,1fr) auto;gap:12px;align-items:center;font-size:13px;
  padding:6px 8px;margin:0 -8px;border-radius:9px;transition:background-color .2s}
.hb-row:hover{background:rgba(47,111,224,.05)}
.hb-l{color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hb-t{height:7px;border-radius:4px;background:var(--elev2);overflow:hidden}
.hb-t i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,rgba(47,111,224,.55),var(--accent));
  transform-origin:left;animation:growX .8s var(--ease) both}
.hb-v{font:12.5px var(--mono);color:var(--muted);text-align:right;white-space:nowrap;word-spacing:-.3em}
@keyframes growX{from{transform:scaleX(0)}to{transform:none}}

/* ===== kolory etapow lejka ===== */
.s-nowy{--c:#2f6fe0}.s-kontakt{--c:#d97706}.s-oferta{--c:#7c3aed}.s-klient{--c:#16a34a}.s-przegrany{--c:#9aa1ab}

/* ===== lejek ===== */
.pipe{display:grid;grid-template-columns:repeat(5,minmax(0,1fr)) minmax(0,1fr);gap:10px;margin-bottom:6px}
.st,.pipe-sum{position:relative;display:flex;flex-direction:column;min-width:0;padding:14px 16px;border:1px solid var(--line2);border-radius:14px;
  background:var(--tile);box-shadow:var(--tile-sh);transition:border-color .2s,box-shadow .25s}
.st:hover{border-color:rgba(47,111,224,.32);box-shadow:0 12px 24px -18px rgba(47,111,224,.5)}
.st.on{border-color:var(--c);box-shadow:0 0 0 3px color-mix(in srgb,var(--c) 16%,transparent)}
.st-l{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st-l i{width:8px;height:8px;border-radius:50%;background:var(--c);flex:none}
.st-n{font-size:1.75rem;font-weight:570;letter-spacing:-.035em;line-height:1.1;margin:8px 0 3px}
.st-v{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* strzalka miedzy kolejnymi etapami: nowy -> kontakt -> oferta -> klient */
.st.s-nowy::after,.st.s-kontakt::after,.st.s-oferta::after{content:"";position:absolute;right:-8px;top:50%;width:6px;height:6px;margin-top:-3px;
  border-top:1.5px solid #b3b9c2;border-right:1.5px solid #b3b9c2;transform:rotate(45deg)}
.pipe-sum{background:transparent;box-shadow:none;border-style:dashed;border-color:var(--line)}

/* ===== lista zgloszen ===== */
.lt{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:24px 0 10px;scroll-margin-top:84px}
.lead{scroll-margin-top:84px}
.lt h3{display:flex;align-items:center;gap:8px;margin-right:auto;font-size:15px;font-weight:600;letter-spacing:-.01em}
.lt h3 span{font:500 12px var(--mono);color:var(--muted);background:var(--elev2);border-radius:999px;padding:2px 8px}
.chip{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;border:1px solid var(--line);border-radius:999px;padding:6px 13px;
  color:var(--muted);background:#fff;transition:color .2s,border-color .2s}
.chip:hover{color:var(--text);border-color:rgba(47,111,224,.4)}
.chip .ic{width:14px;height:14px}
.leads{border:1px solid var(--line2);border-radius:16px;background:#fff;box-shadow:var(--tile-sh);overflow:hidden}
.lead+.lead{border-top:1px solid var(--line2)}
.lead>summary{list-style:none;cursor:pointer;display:grid;
  grid-template-columns:36px minmax(0,1.7fr) minmax(0,1fr) minmax(0,1.25fr) 96px 104px 16px;gap:14px;align-items:center;
  padding:12px 16px;font-size:13.5px;transition:background-color .15s}
.lead>summary::-webkit-details-marker{display:none}
.lead>summary:hover,.lead[open]>summary{background:var(--elev)}
.lead:target>summary{background:rgba(47,111,224,.06)}
.av{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:600;
  letter-spacing:0;color:var(--accent-ink);background:var(--accent-soft)}
.l-who{display:flex;flex-direction:column;min-width:0;line-height:1.35}
.l-who b{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.l-who small{color:var(--faint);font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.l-svc{color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.l-st{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}
.badge{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:550;border-radius:999px;padding:3px 10px;white-space:nowrap}
.badge::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.75;flex:none}
.b-nowy{background:var(--accent-soft);color:var(--accent-ink)}
.b-kontakt{background:#fff4dc;color:#8a5a00}
.b-oferta{background:#f1e8ff;color:#5b2fb0}
.b-klient,.b-ok{background:var(--good-bg);color:var(--good)}
.b-przegrany,.b-off{background:var(--elev2);color:#5b616b}
.b-warn{background:var(--warn-bg);color:var(--warn)}
.b-bad{background:var(--bad-bg);color:var(--bad)}
.wait{font:11px var(--mono);color:var(--warn);background:var(--warn-bg);border-radius:999px;padding:2px 8px;white-space:nowrap}
/* po zapisie Worker wraca pod #l-<id>: krotko pokazujemy "zapisano" przy tym zgloszeniu */
.saved{display:none;font:11px var(--mono);color:var(--good);background:var(--good-bg);border-radius:999px;padding:2px 8px}
.lead:target .saved{display:inline-block;animation:saved 4s var(--ease) forwards}
@keyframes saved{0%,70%{opacity:1}100%{opacity:0}}
.l-val{text-align:right;font:13px var(--mono);letter-spacing:-.02em;word-spacing:-.4em;white-space:nowrap}
.l-when{text-align:right;font-size:12.5px;color:var(--faint);white-space:nowrap}
.lead>summary>.ic{color:var(--faint);transition:transform .2s var(--ease)}
.lead[open]>summary>.ic{transform:rotate(90deg)}
.l-body{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:20px 30px;padding:18px 20px 18px 66px;
  background:var(--elev);border-top:1px solid var(--line2)}
.l-act{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.btn{display:inline-flex;align-items:center;gap:8px;height:38px;padding:0 16px;border-radius:999px;background:var(--text);color:#fff;
  font-size:13px;font-weight:550;transition:transform .2s var(--ease),box-shadow .25s}
.btn:hover{transform:translateY(-1px);box-shadow:0 10px 20px -10px rgba(11,13,16,.5)}
.btn.ghost{background:#fff;color:var(--text);border:1px solid var(--line)}
.btn .ic{width:15px;height:15px}
.l-meta{display:grid;gap:1px}
.l-meta div{display:grid;grid-template-columns:86px minmax(0,1fr);gap:10px;font-size:13.5px;padding:3px 0}
.l-meta dt{color:var(--faint);font-size:12.5px;padding-top:1px}
.l-meta dd{min-width:0;overflow-wrap:anywhere}
.l-meta a{color:var(--accent-ink)}
.l-meta .yes{color:var(--good);font-weight:550}
.l-meta .no{color:var(--warn);font-weight:550}
.l-msg{margin-top:12px;background:#fff;border:1px solid var(--line2);border-radius:4px 14px 14px 14px;padding:12px 14px;font-size:13.5px;
  line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}
.l-form{display:grid;grid-template-columns:minmax(0,1fr) 160px;gap:14px 12px;align-content:start}
.rsg{grid-column:1/-1;border:0;display:flex;flex-wrap:wrap;gap:6px}
.rsg legend{font-size:12px;color:var(--faint);margin-bottom:7px}
.rs{position:relative}
.rs input{position:absolute;opacity:0;pointer-events:none}
.rs span{display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border-radius:999px;border:1px solid var(--line);background:#fff;
  font-size:12.5px;color:var(--muted);cursor:pointer;transition:border-color .2s,color .2s,box-shadow .2s}
.rs span::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--c)}
.rs span:hover{color:var(--text)}
.rs input:checked+span{border-color:var(--c);color:var(--text);font-weight:550;box-shadow:0 0 0 3px color-mix(in srgb,var(--c) 16%,transparent)}
.rs input:focus-visible+span{outline:2px solid var(--accent);outline-offset:2px}
.l-form label{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--faint)}
.l-form .full{grid-column:1/-1}
input,textarea{font:inherit;font-size:14px;color:var(--text);border:1px solid var(--line);border-radius:10px;padding:9px 11px;background:#fff;
  transition:border-color .2s,box-shadow .2s}
input:focus,textarea:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
::placeholder{color:#737a85}
.in-zl{position:relative;display:block}
.in-zl input{width:100%;padding-right:34px}
.in-zl i{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-style:normal;font-size:13px;color:var(--faint)}
textarea{resize:vertical;min-height:84px}
.l-save{grid-column:1/-1;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.l-save span{font-size:12px;color:var(--faint)}
button{font:550 13.5px var(--sans);border:0;border-radius:999px;height:40px;padding:0 20px;cursor:pointer;background:var(--accent);color:#fff;
  box-shadow:0 6px 16px -8px rgba(47,111,224,.8);transition:background-color .2s,transform .2s var(--ease)}
button:hover{background:var(--accent-ink);transform:translateY(-1px)}
.l-del{grid-column:1/-1;border-top:1px dashed var(--line);padding-top:12px}
.l-del>summary{list-style:none;display:inline-flex;cursor:pointer;font-size:12.5px;color:var(--faint);transition:color .2s}
.l-del>summary::-webkit-details-marker{display:none}
.l-del>summary:hover{color:var(--bad)}
.l-del form{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:10px;font-size:12.5px;color:var(--muted)}
.l-del label{display:flex;gap:8px;align-items:center}
button.danger{background:#fff;color:var(--bad);border:1px solid rgba(180,50,31,.35);box-shadow:none;height:34px;padding:0 14px;font-size:12.5px}
button.danger:hover{background:var(--bad-bg)}
.empty-box{display:flex;gap:14px;align-items:flex-start;padding:22px;border:1px dashed var(--line);border-radius:16px;font-size:13.5px;color:var(--muted)}
.empty-box .ic{width:22px;height:22px;color:var(--accent)}

/* ===== Google ===== */
.geo{border-color:rgba(47,111,224,.2);background:radial-gradient(110% 140% at 100% 0%,rgba(47,111,224,.09),transparent 58%),var(--tile)}
.geo-h{display:flex;align-items:center;gap:12px}
.geo-h .ki{width:36px;height:36px;border-radius:10px}
.geo-h .ki .ic{width:18px;height:18px}
.geo-h h3{font-size:15px;font-weight:600;letter-spacing:-.015em;line-height:1.3}
.geo-h p{font-family:var(--mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--faint)}
.strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin:16px 0 20px;border-top:1px solid var(--line2);border-bottom:1px solid var(--line2)}
.strip>div{padding:14px 0 14px 18px;min-width:0}
.strip>div:first-child{padding-left:0}
.strip>div+div{border-left:1px solid var(--line2)}
.strip dt{font-size:12.5px;color:var(--faint)}
.strip dd{font-size:clamp(1.3rem,2vw,1.6rem);font-weight:570;letter-spacing:-.03em;margin-top:4px;white-space:nowrap}
.strip dd+dd{font-size:inherit;margin-top:6px}
.strip .pb{margin-left:0}
.sub-h{font-size:14px;font-weight:600;letter-spacing:-.01em;margin-bottom:10px}
.pb{display:inline-block;margin-left:10px;padding:2px 8px;border-radius:999px;font:11px var(--mono);letter-spacing:-.01em;white-space:nowrap;word-spacing:normal}
.pb-g{color:var(--good);background:var(--good-bg)}.pb-b{color:var(--accent-ink);background:var(--accent-soft)}
.pb-o{color:var(--warn);background:var(--warn-bg)}.pb-n{color:var(--muted);background:var(--elev2)}

/* ===== tabele ===== */
.tw{overflow-x:auto;min-width:0}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;font:500 11px var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--faint);padding:0 0 10px}
td{padding:10px 0;border-top:1px solid var(--line2);color:var(--muted);vertical-align:middle}
td:first-child{color:var(--text);font-weight:500}
th.n,td.n{text-align:right;padding-left:14px;white-space:nowrap}
td.n{font-family:var(--mono);letter-spacing:-.02em;word-spacing:-.4em}
td.n .dc{margin:0 -.17em}
tbody tr{transition:background-color .2s}
tbody tr:hover{background:rgba(47,111,224,.04)}

/* ===== Make ===== */
.plan-v{display:flex;align-items:baseline;gap:8px;font-size:13.5px;color:var(--muted);margin-bottom:12px}
.plan-v b{font-size:2.1rem;font-weight:580;letter-spacing:-.04em;line-height:1;color:var(--text)}
.meter{display:block;height:10px;border-radius:6px;background:var(--elev2);overflow:hidden}
.meter i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,rgba(47,111,224,.6),var(--accent));transform-origin:left;
  animation:growX .9s var(--ease) both}
.meter.warn i{background:linear-gradient(90deg,#f59e0b,#ea580c)}
.meter.bad i{background:linear-gradient(90deg,#f87171,#dc2626)}
.meter.sm{width:100%;height:5px;margin-bottom:2px}
.scs{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:14px}
.scs>.box,.scs>.err{margin-bottom:0}
.sc-h{display:flex;align-items:center;gap:10px;margin-bottom:16px}
/* nazwa to jedyny identyfikator scenariusza — do dwoch linii zamiast ucinania */
.sc-h h3{flex:1;min-width:0;font-size:14px;font-weight:600;letter-spacing:-.01em;line-height:1.35;overflow:hidden;
  display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}
.sc-k{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:16px}
.sc-k dt{font-size:12px;color:var(--faint)}
.sc-k dd{font-size:1.2rem;font-weight:570;letter-spacing:-.03em}
.sc-k dd.bad{color:var(--bad)}
.sc .fine{margin-bottom:0}

/* ===== niepodlaczone i bledy ===== */
.setup,.err{display:flex;gap:14px;align-items:flex-start;border-radius:16px;padding:16px 18px;margin-bottom:14px;font-size:13.5px;
  line-height:1.6;color:var(--muted)}
.setup{border:1px dashed rgba(47,111,224,.4);background:rgba(47,111,224,.035)}
.setup>.ic{color:var(--accent);margin-top:3px}
.err{border:1px solid rgba(180,50,31,.22);background:rgba(180,50,31,.04)}
.err>.ic{color:var(--bad);margin-top:3px}
.setup-h{font-weight:600;color:var(--text)}
.err .setup-h{color:var(--bad)}

/* ===== stopka i strony komunikatow ===== */
.foot{margin-top:auto;padding-top:36px;padding-bottom:36px;display:flex;justify-content:space-between;gap:8px 16px;flex-wrap:wrap;
  font-size:12px;color:var(--faint)}
.msg{flex:1;display:flex;align-items:center;justify-content:center;padding:60px 16px}
.msg-card{width:100%;max-width:440px;text-align:center;border:1px solid var(--line2);border-radius:20px;padding:36px 30px;background:var(--tile);
  box-shadow:0 30px 70px -32px rgba(15,30,60,.28)}
.msg-card img{display:block;height:34px;width:auto;margin:0 auto 18px}
.msg-card h1{font-size:1.6rem;font-weight:560;letter-spacing:-.03em;margin-bottom:8px}
.msg-card p{color:var(--muted);font-size:14px;line-height:1.6}

@media(max-width:1080px){
  .r-leady{grid-template-columns:minmax(0,1fr) minmax(0,1.3fr)}
  .r-leady>.svc{grid-column:1/-1}
  .pipe{grid-template-columns:repeat(3,minmax(0,1fr))}
  .st.s-oferta::after{display:none}
  .lead>summary{grid-template-columns:36px minmax(0,1.6fr) minmax(0,1.3fr) 90px 96px 16px}
  .l-svc{display:none}
}
@media(max-width:860px){
  .top-in{flex-wrap:wrap;gap:10px;padding:10px 0}
  .tabs{order:3;width:100%;margin:0}
  .stamp{margin-left:auto}
  .lt,.lead{scroll-margin-top:124px}
  .r-leady,.r-hero,.r-2{grid-template-columns:minmax(0,1fr)}
  /* telefon: najpierw robota (lejek i lista), statystyki na koncu */
  #leady{display:flex;flex-direction:column}
  #leady>.r-leady{order:5;margin:24px 0 0}
  .lead>summary{grid-template-columns:36px minmax(0,1fr) auto;grid-template-areas:"av who when" "av st val";gap:6px 12px;padding:12px 14px}
  .av{grid-area:av}.l-who{grid-area:who}.l-when{grid-area:when}.l-st{grid-area:st}.l-val{grid-area:val}
  .lead>summary>.ic{display:none}
  .l-body{grid-template-columns:minmax(0,1fr);padding:16px 14px}
  .strip{grid-template-columns:repeat(2,minmax(0,1fr))}
  .strip>div:nth-child(n){padding-left:14px;border-left:0}
  .strip>div:nth-child(odd){padding-left:0}
  .strip>div:nth-child(even){border-left:1px solid var(--line2)}
  .strip>div:nth-child(n+3){border-top:1px solid var(--line2)}
}
@media(max-width:560px){
  .pipe{grid-template-columns:repeat(2,minmax(0,1fr))}
  .st.s-nowy::after,.st.s-kontakt::after{display:none}
  .t4{gap:10px}
  .tile{padding:13px 13px 12px}
  .l-form{grid-template-columns:minmax(0,1fr)}
  .hb-row{grid-template-columns:minmax(0,1fr) auto;row-gap:6px}
  .hb-l{grid-column:1/-1;white-space:normal}
  .hb-t{grid-column:1}
  .col-imp{display:none}
  .sc-k{grid-template-columns:repeat(2,minmax(0,1fr))}
  .stamp{display:none}
  /* zakladki na cala szerokosc, bez ikon i z krotka etykieta Make — wszystkie cztery widac bez przewijania */
  .tabs{display:flex}
  .tab{flex:1 1 auto;justify-content:center;gap:6px;padding:8px 8px;font-size:12.5px}
  .tab .ic,.tl{display:none}
  .ts{display:inline}
  .att ul{grid-template-columns:minmax(0,1fr)}
}
@media(max-width:380px){.brand .word{display:none}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
`;
