/**
 * skaluj.ai CRM — HTML panelu. Czysty HTML + CSS, zero JavaScriptu (CSP i tak blokuje skrypty).
 * Wszystko, co pochodzi z formularza lub z API, przechodzi przez esc().
 */

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const nf = new Intl.NumberFormat("pl-PL");
const nf1 = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 1 });
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

const STATUS_LABEL = { nowy: "Nowy", kontakt: "W kontakcie", oferta: "Oferta wysłana", klient: "Klient", przegrany: "Przegrany" };
/* wartosci pola "svc" z formularza na stronie */
const SERVICE_LABEL = { strona: "Strona", geo: "SEO / GEO", "reklamy-chatgpt": "Reklamy w ChatGPT", branding: "Branding", rolki: "Rolki i wideo AI", audyt: "Audyt cyfryzacji", email: "Automatyzacje", chatbot: "Chatbot AI", inne: "Inne" };
const serviceLabel = (s) => SERVICE_LABEL[s] || s || DASH;

function trend(cur, prev, invert = false) {
  if (cur == null || prev == null || !prev) return "";
  const ch = (cur - prev) / prev;
  if (!Number.isFinite(ch) || Math.abs(ch) < 0.005) return `<span class="tr">bez zmian</span>`;
  const good = invert ? ch < 0 : ch > 0;
  return `<span class="tr ${good ? "up" : "down"}">${ch > 0 ? "▲" : "▼"} ${nf1.format(Math.abs(ch) * 100)}%</span>`;
}

const kpi = (label, value, sub = "") =>
  `<div class="kpi"><div class="kpi-l">${esc(label)}</div><div class="kpi-v">${value}</div>${sub ? `<div class="kpi-s">${sub}</div>` : ""}</div>`;

function bars(daily, label) {
  if (!daily?.length) return "";
  const max = Math.max(1, ...daily.map((x) => x.n));
  const cols = daily
    .map((x) => `<span class="bar" style="height:${x.n ? Math.max(6, Math.round((x.n / max) * 100)) : 0}%" title="${esc(x.d)}: ${x.n}"></span>`)
    .join("");
  return `<figure class="chart"><div class="bars">${cols}</div><figcaption><span>${esc(daily[0].d.slice(5).split("-").reverse().join("."))}</span><span>${esc(label)} · maks. ${max} dziennie</span><span>${esc(daily[daily.length - 1].d.slice(5).split("-").reverse().join("."))}</span></figcaption></figure>`;
}

function hbars(rows) {
  if (!rows?.length) return `<p class="muted">Brak danych w tym okresie.</p>`;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return `<div class="hb">${rows
    .map(
      (r) =>
        `<div class="hb-row"><span class="hb-l">${esc(r.label)}</span><span class="hb-t"><i style="width:${Math.round((r.value / max) * 100)}%"></i></span><span class="hb-v">${esc(r.text ?? int(r.value))}</span></div>`
    )
    .join("")}</div>`;
}

const offBox = (missing) =>
  `<div class="note off"><b>Nie podłączone.</b> Ustaw w Cloudflare (Worker → Settings → Variables): ${missing
    .map((m) => `<code>${esc(m)}</code>`)
    .join(", ")}. Instrukcja: <code>crm/README.md</code>.</div>`;

const errBox = (e) => `<div class="note err"><b>Źródło nie odpowiedziało.</b> ${esc(e)}</div>`;

function section(id, eyebrow, title, body, aside = "") {
  return `<section class="sec" id="${id}"><div class="sec-h"><div><p class="eyebrow">${esc(eyebrow)}</p><h2>${esc(title)}</h2></div>${aside}</div>${body}</section>`;
}

function gate(src, fn) {
  if (!src) return errBox("brak danych");
  if (src.state === "off") return offBox(src.missing);
  if (src.state === "error") return errBox(src.error);
  return fn(src);
}

/* ---------- leady ---------- */

function leadsSection(s, leads, ctx) {
  const st = s.status || {};
  const n = (k) => st[k]?.n || 0;
  const v = (k) => st[k]?.value || 0;
  const decided = n("klient") + n("przegrany");
  const pipeline = v("kontakt") + v("oferta");

  const top = `<div class="kpis">
    ${kpi("Nowe zgłoszenia", int(s.current), `${trend(s.current, s.previous)} poprzednie ${ctx.days} dni: ${int(s.previous)}`)}
    ${kpi("W toku", int(n("kontakt") + n("oferta")), pipeline ? `wartość ofert ${esc(pln(pipeline))}` : "kontakt + oferta")}
    ${kpi("Klienci", int(n("klient")), v("klient") ? `łącznie ${esc(pln(v("klient")))}` : "wszystkie wygrane")}
    ${kpi("Skuteczność", decided ? pct(n("klient") / decided) : DASH, "klienci / zamknięte zgłoszenia")}
    ${kpi("Zgody marketingowe", int(s.marketing), `w ostatnich ${ctx.days} dniach`)}
  </div>
  <div class="grid2">
    <div class="card"><h3>Zgłoszenia dziennie</h3>${bars(s.daily, "zgłoszenia")}</div>
    <div class="card"><h3>Czego dotyczą</h3>${hbars(s.services.map((r) => ({ label: serviceLabel(r.label), value: r.n })))}</div>
  </div>`;

  const chips = [`<a class="chip${ctx.status ? "" : " on"}" href="?dni=${ctx.days}#leady">Wszystkie <b>${s.total}</b></a>`]
    .concat(ctx.statuses.map((k) => `<a class="chip${ctx.status === k ? " on" : ""}" href="?dni=${ctx.days}&amp;status=${k}#leady">${STATUS_LABEL[k]} <b>${n(k)}</b></a>`))
    .join("");

  const back = `?dni=${ctx.days}${ctx.status ? "&status=" + ctx.status : ""}`;
  const list = leads.length
    ? leads.map((l) => leadRow(l, ctx, back)).join("")
    : `<p class="muted empty">${ctx.status ? "Brak zgłoszeń z tym statusem." : "Jeszcze nie ma zgłoszeń. Pojawią się tu, gdy w scenariuszu formularza w Make dodasz moduł HTTP, który je tu wysyła (crm/README.md, punkt „Make → CRM”)."}</p>`;

  return top + `<div class="chips">${chips}<a class="chip ghost" href="/leady.csv">Eksport CSV</a></div><div class="leads">${list}</div>`;
}

function leadRow(l, ctx, back) {
  const tel = String(l.phone || "").replace(/[^\d+]/g, "");
  const options = ctx.statuses.map((k) => `<option value="${k}"${l.status === k ? " selected" : ""}>${STATUS_LABEL[k]}</option>`).join("");
  return `<details class="lead" id="l-${esc(l.id)}">
  <summary>
    <span class="l-date">${esc(when(l.created_at))}</span>
    <span class="l-who"><b>${esc(l.name || l.email)}</b>${l.company ? `<small>${esc(l.company)}</small>` : ""}</span>
    <span class="l-svc">${esc(serviceLabel(l.service))}</span>
    <span class="badge s-${esc(l.status)}">${esc(STATUS_LABEL[l.status] || l.status)}</span>
    <span class="l-val">${l.value_pln != null ? esc(pln(l.value_pln)) : ""}</span>
  </summary>
  <div class="l-body">
    <div class="l-info">
      <p><span>E-mail</span><a href="mailto:${esc(l.email)}">${esc(l.email)}</a></p>
      <p><span>Telefon</span>${tel ? `<a href="tel:${esc(tel)}">${esc(l.phone)}</a>` : DASH}</p>
      <p><span>Termin</span>${esc(l.termin || DASH)}</p>
      <p><span>Wysłano</span>${esc(when(l.sent_at || l.created_at))}</p>
      <p><span>Marketing</span>${l.marketing ? `zgoda: ${esc(l.marketing_text || "tak")}` : "brak zgody — nie wysyłaj ofert handlowych"}</p>
      <div class="l-msg">${esc(l.message || "(bez treści)")}</div>
    </div>
    <form class="l-form" method="post" action="/leady/${esc(l.id)}">
      <input type="hidden" name="back" value="${esc(back)}">
      <label>Status<select name="status">${options}</select></label>
      <label>Wartość (zł)<input name="value" inputmode="numeric" value="${l.value_pln ?? ""}" placeholder="np. 4500"></label>
      <label class="full">Notatka<textarea name="note" rows="3" maxlength="2000" placeholder="np. dzwonić po 15, prosi o wycenę strony + SEO">${esc(l.note || "")}</textarea></label>
      <div class="l-actions"><button type="submit">Zapisz</button><span class="muted">zmieniono ${esc(when(l.updated_at))}</span></div>
    </form>
    <form class="l-del" method="post" action="/leady/${esc(l.id)}/usun">
      <input type="hidden" name="back" value="${esc(back)}">
      <label><input type="checkbox" name="confirm" value="tak" required> usuń to zgłoszenie na stałe (np. na prośbę tej osoby)</label>
      <button type="submit" class="danger">Usuń</button>
    </form>
  </div>
</details>`;
}

/* ---------- strona ---------- */

function siteSection(s, ctx) {
  let out = "";
  if (s.ga4Configured) {
    const c = s.ga4?.current, p = s.ga4?.previous;
    out += s.ga4
      ? `<div class="kpis">
        ${kpi("Użytkownicy", int(c?.totalUsers), trend(c?.totalUsers, p?.totalUsers))}
        ${kpi("Sesje", int(c?.sessions), trend(c?.sessions, p?.sessions))}
        ${kpi("Odsłony", int(c?.screenPageViews), trend(c?.screenPageViews, p?.screenPageViews))}
        ${kpi("Śr. czas sesji", esc(mmss(c?.averageSessionDuration)), trend(c?.averageSessionDuration, p?.averageSessionDuration))}
        ${kpi("Zgłoszenia / sesje", c?.sessions && ctx.leadsCurrent != null ? pct(ctx.leadsCurrent / c.sessions) : DASH, "orientacyjnie")}
      </div>
      <div class="card"><h3>Skąd przychodzą (GA4)</h3>${hbars((s.channels || []).map((r) => ({ label: r.label, value: r.sessions, text: r.pct + "%" })))}</div>
      <p class="muted small">GA4 liczy tylko osoby, które zgodziły się na analitykę w banerze cookies, więc liczby są niższe niż realny ruch. Okres kończy się wczoraj.</p>`
      : errBox("GA4: " + (s.ga4Error || "brak danych"));
  } else {
    out += offBox(["GA4_PROPERTY_ID"]);
  }
  if (s.gscConfigured) {
    out += s.gsc
      ? `<div class="kpis">
        ${kpi("Kliknięcia z Google", int(s.gsc.clicks))}
        ${kpi("Wyświetlenia w Google", int(s.gsc.impressions))}
        ${kpi("CTR", pct(s.gsc.ctr))}
        ${kpi("Średnia pozycja", s.gsc.position == null ? DASH : nf1.format(s.gsc.position))}
      </div>
      <div class="card"><h3>Frazy, po których Cię znajdują (Search Console)</h3>${queriesTable(s.queries)}</div>
      <p class="muted small">Search Console raportuje z ok. 3-dniowym opóźnieniem.</p>`
      : errBox("Search Console: " + (s.gscError || "brak danych w tym okresie"));
  } else {
    out += offBox(["GSC_SITE_URL"]);
  }
  return out;
}

function queriesTable(rows) {
  if (!rows?.length) return `<p class="muted">Brak danych w tym okresie.</p>`;
  return `<div class="tw"><table><thead><tr><th>Fraza</th><th>Kliknięcia</th><th>Wyświetlenia</th><th>Pozycja</th></tr></thead><tbody>${rows
    .map((r) => `<tr><td>${esc(r.query)}</td><td>${int(r.clicks)}</td><td>${int(r.impressions)}</td><td>${r.position == null ? DASH : nf1.format(r.position)}</td></tr>`)
    .join("")}</tbody></table></div>`;
}

/* ---------- Make ---------- */

function makeSection(s, ctx) {
  const org = s.org
    ? `<div class="card"><h3>Plan Make${s.org.plan ? ": " + esc(s.org.plan) : ""}</h3>
        ${s.org.limit ? `<div class="meter"><i style="width:${Math.min(100, Math.round(((s.org.used || 0) / s.org.limit) * 100))}%"></i></div>` : ""}
        <p class="muted">Zużyte w okresie rozliczeniowym: <b>${int(s.org.used)}</b>${s.org.limit ? ` z ${int(s.org.limit)}` : ""} operacji · odnowienie ${esc(date(s.org.nextReset))}</p></div>`
    : s.orgError
      ? errBox("Organizacja: " + s.orgError)
      : `<p class="muted small">Ustaw <code>MAKE_ORG_ID</code>, żeby widzieć zużycie limitu planu.</p>`;

  const cards = s.scenarios
    .map((sc) => {
      if (sc.error) return `<div class="card">${errBox("Scenariusz " + esc(sc.id) + ": " + sc.error)}</div>`;
      const state = sc.invalid ? `<span class="badge s-przegrany">zatrzymany przez błąd</span>` : sc.paused ? `<span class="badge s-oferta">wstrzymany</span>` : sc.active ? `<span class="badge s-klient">aktywny</span>` : `<span class="badge s-nowy">wyłączony</span>`;
      return `<div class="card">
        <div class="card-h"><h3>${esc(sc.name)}</h3>${state}</div>
        <div class="kpis small">
          ${kpi("Uruchomienia", int(sc.runs) + (sc.truncated ? "+" : ""), `${ctx.days} dni`)}
          ${kpi("Udane", int(sc.ok))}
          ${kpi("Z ostrzeżeniem", int(sc.warn))}
          ${kpi("Błędy", `<span class="${sc.failed ? "bad" : ""}">${int(sc.failed)}</span>`, sc.lastError ? "ostatni " + esc(when(sc.lastError)) : "")}
          ${kpi("Operacje", int(sc.operations), sc.credits != null ? nf1.format(sc.credits) + " kredytów" : "")}
          ${kpi("Niedokończone", int(sc.incomplete), "do ponowienia w Make")}
        </div>
        ${bars(sc.daily, "uruchomienia")}
      </div>`;
    })
    .join("");
  return org + cards;
}

/* ---------- chatbot ---------- */

function chatSection(s, ctx) {
  const scope = s.keyName ? `klucz „${esc(s.keyName)}”` : "całe konto OpenRouter";
  const warn = s.keyMissing ? `<div class="note off">Nie znalazłem klucza o nazwie z <code>OPENROUTER_KEY_NAME</code>. Pokazuję dane całego konta.</div>` : "";
  const key = s.key
    ? `${kpi("Koszt dziś", esc(usd(s.key.today)))}${kpi("Koszt w tym miesiącu", esc(usd(s.key.month)), s.key.limit != null ? `limit ${esc(usd(s.key.limit))}, zostało ${esc(usd(s.key.remaining))}` : "bez limitu na kluczu")}`
    : "";
  const models = s.models.length
    ? `<div class="tw"><table><thead><tr><th>Model</th><th>Zapytania</th><th>Tokeny</th><th>Koszt</th></tr></thead><tbody>${s.models
        .map((m) => `<tr><td><code>${esc(m.model)}</code></td><td>${int(m.requests)}</td><td>${int(m.tokens)}</td><td>${esc(usd(m.cost))}</td></tr>`)
        .join("")}</tbody></table></div>`
    : `<p class="muted">Brak zapytań w tym okresie.</p>`;
  return `${warn}<div class="kpis">
      ${kpi("Wiadomości do bota", int(s.requests), `${s.span} dni, ${scope}`)}
      ${kpi("Koszt w okresie", esc(usd(s.cost)), s.requests ? `${esc(usd(s.cost / s.requests))} za wiadomość` : "")}
      ${kpi("Saldo kredytów", esc(usd(s.balance)), "OpenRouter")}
      ${key}
    </div>
    <div class="grid2">
      <div class="card"><h3>Wiadomości dziennie</h3>${bars(s.daily, "zapytania")}</div>
      <div class="card"><h3>Modele</h3>${models}</div>
    </div>
    <p class="muted small">OpenRouter udostępnia ostatnie 30 pełnych dni (bez dzisiaj). Jedna wiadomość może dać więcej niż jedno zapytanie, jeśli zadziała model zapasowy. Treści rozmów nie są nigdzie zapisywane.</p>`;
}

/* ---------- strona ---------- */

export function renderDashboard({ leads, stats, days, status, periods, statuses, generatedAt }) {
  const ctx = { days, status, statuses, leadsCurrent: stats.leads?.state === "ok" ? stats.leads.current : null };
  const periodSwitch = `<nav class="seg" aria-label="Okres">${periods
    .map((p) => `<a href="?dni=${p}${status ? "&amp;status=" + status : ""}"${p === days ? ' class="on" aria-current="true"' : ""}>${p} dni</a>`)
    .join("")}</nav>`;

  const body =
    section("leady", "01 · CRM", "Zgłoszenia", gate(stats.leads, (s) => leadsSection(s, leads, ctx))) +
    section("strona", "02 · Strona", "Ruch i Google", gate(stats.site, (s) => siteSection(s, ctx))) +
    section("make", "03 · Make.com", "Automatyzacje", gate(stats.make, (s) => makeSection(s, ctx))) +
    section("chatbot", "04 · Chatbot", "Asystent AI (OpenRouter)", gate(stats.chat, (s) => chatSection(s, ctx)));

  return page(
    "CRM · skaluj.ai",
    `<header class="top"><div class="wrap top-in">
      <a class="brand" href="/"><img src="https://skaluj.ai/sygnet.png" alt="" width="14" height="17">skaluj.ai <span>CRM</span></a>
      <nav class="jump"><a href="#leady">Zgłoszenia</a><a href="#strona">Strona</a><a href="#make">Make</a><a href="#chatbot">Chatbot</a></nav>
      ${periodSwitch}
    </div></header>
    <main class="wrap">${body}</main>
    <footer class="wrap foot">Dane z ${esc(when(generatedAt.toISOString()))}. Odśwież stronę, żeby pobrać nowe. Panel prywatny — nie udostępniaj hasła.</footer>`
  );
}

export function renderMessage(title, text) {
  return page(title, `<main class="wrap msg"><p class="eyebrow">skaluj.ai CRM</p><h1>${esc(title)}</h1><p class="muted">${esc(text)}</p></main>`);
}

function page(title, inner) {
  return `<!doctype html><html lang="pl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title>
<link rel="icon" type="image/png" href="https://skaluj.ai/sygnet.png"><link rel="stylesheet" href="https://skaluj.ai/fonts.css">
<style>${CSS}</style></head><body>${inner}</body></html>`;
}

const CSS = `
:root{--bg:#fff;--elev:#f7f8fa;--elev2:#eef1f5;--text:#0b0d10;--muted:#565d68;--faint:#7a818c;--line:rgba(0,0,0,.09);
--accent:#2f6fe0;--accent-soft:rgba(47,111,224,.10);--ok:#1f8a4c;--bad:#c02c2c;--warn:#b26a00;
--sans:"Geist",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;--mono:"Azeret Mono",ui-monospace,Menlo,monospace}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--text);font:15px/1.55 var(--sans);letter-spacing:-.011em;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
.wrap{max-width:1180px;margin:0 auto;padding:0 clamp(16px,4vw,40px)}
code{font-family:var(--mono);font-size:.82em;background:var(--elev2);padding:1px 5px;border-radius:5px;word-break:break-all}
.muted{color:var(--muted)}.small{font-size:12.5px;margin-top:10px}
.eyebrow{font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
/* belka */
.top{position:sticky;top:0;z-index:5;background:rgba(255,255,255,.88);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.top-in{display:flex;align-items:center;gap:18px;padding-top:12px;padding-bottom:12px;flex-wrap:wrap}
.brand{display:inline-flex;align-items:center;gap:8px;font-weight:600;font-size:16px}
.brand img{height:17px;width:auto}
.brand span{font-family:var(--mono);font-size:10px;letter-spacing:.14em;color:var(--faint);font-weight:400}
.jump{display:flex;gap:16px;font-size:13.5px;color:var(--muted);margin-left:auto}
.jump a:hover{color:var(--text)}
.seg{display:inline-flex;background:var(--elev2);border-radius:999px;padding:3px}
.seg a{font-size:12.5px;padding:5px 11px;border-radius:999px;color:var(--muted)}
.seg a.on{background:#fff;color:var(--text);box-shadow:0 1px 3px rgba(15,30,60,.12);font-weight:550}
/* sekcje */
.sec{padding:34px 0 8px;scroll-margin-top:70px}
.sec-h{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:16px}
h2{font-size:1.5rem;letter-spacing:-.03em;font-weight:600;margin-top:4px}
h3{font-size:13.5px;font-weight:600;margin-bottom:12px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:12px}
.kpis.small{grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin:6px 0 14px}
.kpi{background:var(--elev);border:1px solid var(--line);border-radius:14px;padding:14px 15px}
.kpis.small .kpi{background:#fff;padding:10px 12px}
.kpi-l{font-size:12px;color:var(--muted)}
.kpi-v{font-size:1.6rem;font-weight:600;letter-spacing:-.03em;margin-top:2px;font-variant-numeric:tabular-nums}
.kpis.small .kpi-v{font-size:1.2rem}
.kpi-s{font-size:11.5px;color:var(--faint);margin-top:2px}
.tr{font-weight:600;color:var(--faint)}.tr.up{color:var(--ok)}.tr.down{color:var(--bad)}
.bad{color:var(--bad)}
.grid2{display:grid;grid-template-columns:1.3fr 1fr;gap:12px;margin-bottom:12px}
.card{border:1px solid var(--line);border-radius:16px;padding:16px 18px;background:#fff;margin-bottom:12px}
.grid2 .card{margin-bottom:0}
.card-h{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:4px}
.card-h h3{margin:0}
/* wykresy */
.chart{margin:0}
.bars{display:flex;align-items:flex-end;gap:2px;height:110px;border-bottom:1px solid var(--line)}
.bar{flex:1;background:linear-gradient(180deg,#3d7ef0,#2158c8);border-radius:3px 3px 0 0;min-width:2px}
.chart figcaption{display:flex;justify-content:space-between;font-family:var(--mono);font-size:10px;color:var(--faint);margin-top:6px;gap:8px}
.hb{display:grid;gap:9px}
.hb-row{display:grid;grid-template-columns:minmax(80px,140px) 1fr auto;gap:10px;align-items:center;font-size:13px}
.hb-l{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hb-t{height:8px;background:var(--elev2);border-radius:9px;overflow:hidden}
.hb-t i{display:block;height:100%;background:var(--accent);border-radius:9px}
.hb-v{font-variant-numeric:tabular-nums;color:var(--muted);font-size:12.5px}
.meter{height:10px;background:var(--elev2);border-radius:9px;overflow:hidden;margin-bottom:8px}
.meter i{display:block;height:100%;background:var(--accent)}
.tw{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);font-weight:500;padding:6px 8px;border-bottom:1px solid var(--line)}
td{padding:8px;border-bottom:1px solid var(--line);font-variant-numeric:tabular-nums}
td:first-child{max-width:340px}
/* komunikaty */
.note{border-radius:12px;padding:12px 14px;font-size:13.5px;margin-bottom:12px;line-height:1.5}
.note.off{background:var(--accent-soft);color:#1d3f7a}
.note.err{background:rgba(192,44,44,.08);color:#7d1d1d}
/* leady */
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:18px 0 10px}
.chip{font-size:12.5px;border:1px solid var(--line);border-radius:999px;padding:5px 11px;color:var(--muted)}
.chip b{color:var(--text);font-weight:600;margin-left:3px}
.chip.on{background:var(--text);color:#fff;border-color:var(--text)}.chip.on b{color:#fff}
.chip.ghost{margin-left:auto;border-style:dashed}
.leads{border-top:1px solid var(--line)}
.empty{padding:20px 0}
.lead{border-bottom:1px solid var(--line)}
.lead summary{list-style:none;cursor:pointer;display:grid;grid-template-columns:96px minmax(0,1.6fr) minmax(0,1fr) 120px 90px;gap:14px;align-items:center;padding:12px 6px;font-size:13.5px}
.lead summary::-webkit-details-marker{display:none}
.lead summary:hover{background:var(--elev)}
.lead[open] summary{background:var(--elev)}
.l-date{font-family:var(--mono);font-size:11px;color:var(--faint)}
.l-who{display:flex;flex-direction:column;min-width:0}
.l-who b{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.l-who small{color:var(--muted);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.l-svc{color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.l-val{text-align:right;font-variant-numeric:tabular-nums;font-weight:550}
.badge{font-size:11.5px;font-weight:550;border-radius:999px;padding:3px 9px;white-space:nowrap;justify-self:start}
.s-nowy{background:var(--accent-soft);color:#1d4fb0}.s-kontakt{background:#fff4dc;color:#8a5a00}.s-oferta{background:#f1e8ff;color:#5b2fb0}
.s-klient{background:#e3f6ea;color:#17703d}.s-przegrany{background:#f3f4f6;color:#5b616b}
.l-body{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:6px 6px 18px}
.l-info p{display:grid;grid-template-columns:90px 1fr;gap:8px;font-size:13.5px;padding:3px 0}
.l-info p span{color:var(--faint);font-size:12px}
.l-info a{color:var(--accent)}
.l-msg{margin-top:10px;background:var(--elev);border-radius:12px;padding:12px 14px;font-size:13.5px;white-space:pre-wrap;word-break:break-word}
.l-form{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-content:start}
.l-form label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted)}
.l-form .full{grid-column:1/-1}
select,input,textarea{font:inherit;font-size:14px;color:var(--text);border:1px solid var(--line);border-radius:10px;padding:8px 10px;background:#fff}
textarea{resize:vertical}
.l-actions{grid-column:1/-1;display:flex;align-items:center;gap:12px;font-size:12px}
button{font:550 13.5px var(--sans);border:none;border-radius:10px;padding:9px 16px;cursor:pointer;background:linear-gradient(135deg,#3d7ef0,#2158c8);color:#fff}
button.danger{background:#fff;color:var(--bad);border:1px solid rgba(192,44,44,.35);padding:6px 12px;font-size:12.5px}
.l-del{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12px;color:var(--muted);border-top:1px dashed var(--line);padding-top:12px}
.l-del label{display:flex;gap:8px;align-items:center}
.foot{font-size:12px;color:var(--faint);padding-top:30px;padding-bottom:40px}
.msg{padding-top:18vh;max-width:520px}.msg h1{font-size:1.8rem;letter-spacing:-.03em;margin:6px 0 8px}
@media(max-width:860px){.grid2,.l-body{grid-template-columns:1fr}.jump{display:none}.seg{margin-left:auto}
.lead summary{grid-template-columns:1fr auto;gap:4px 10px}.l-date{grid-column:1/-1}.l-svc,.l-val{display:none}}
@media(max-width:520px){.l-form{grid-template-columns:1fr}.kpi-v{font-size:1.35rem}.chip.ghost{margin-left:0}}
`;
