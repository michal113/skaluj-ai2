/**
 * skaluj.ai CRM — zrodla statystyk.
 *
 * Kazde zrodlo zwraca { state: "ok" | "off" | "error", ... }:
 *   off   = brak konfiguracji (pole `missing` mowi, co ustawic),
 *   error = zrodlo nie odpowiedzialo (pole `error` z komunikatem — panel jest wewnetrzny).
 * Zrodla pobieramy niezaleznie (Promise.allSettled), wiec awaria jednego nie wywala panelu.
 * Zasada jak w panelu klienta: brak danych to null, nigdy 0.
 */
import { getAccessToken, fetchGa4Summary, fetchGa4Channels, fetchGscTotals, fetchGscQueries } from "../panel/google.js";

const DAY = 86400000;
const isoDaysAgo = (n) => new Date(Date.now() - n * DAY).toISOString();
const ymd = (d) => d.toISOString().slice(0, 10);

/** Lista dni okresu (YYYY-MM-DD), od najstarszego. `endOffset` = ile dni od dzis konczy okres. */
function dayList(days, endOffset = 0) {
  const out = [];
  for (let i = days - 1 + endOffset; i >= endOffset; i--) out.push(ymd(new Date(Date.now() - i * DAY)));
  return out;
}

const off = (...missing) => ({ state: "off", missing });
const settled = (r) => (r.status === "fulfilled" ? r.value : { state: "error", error: String(r.reason?.message || r.reason).slice(0, 300) });

/* ---------- leady (D1) ---------- */

async function leadStats(env, days) {
  const from = isoDaysAgo(days);
  const prevFrom = isoDaysAgo(days * 2);
  const [byStatus, period, byService, byDay] = await env.DB.batch([
    env.DB.prepare("SELECT status, COUNT(*) AS n, SUM(value_pln) AS value FROM leads GROUP BY status"),
    env.DB.prepare(
      `SELECT SUM(created_at >= ?1) AS cur,
              SUM(created_at >= ?2 AND created_at < ?1) AS prev,
              SUM(created_at >= ?1 AND marketing = 1) AS marketing
         FROM leads`
    ).bind(from, prevFrom),
    env.DB.prepare(
      `SELECT COALESCE(NULLIF(service, ''), 'inne') AS label, COUNT(*) AS n
         FROM leads WHERE created_at >= ?1 GROUP BY label ORDER BY n DESC LIMIT 6`
    ).bind(from),
    env.DB.prepare("SELECT substr(created_at, 1, 10) AS d, COUNT(*) AS n FROM leads WHERE created_at >= ?1 GROUP BY d").bind(from),
  ]);

  const status = {};
  let total = 0;
  for (const r of byStatus.results) {
    status[r.status] = { n: r.n, value: r.value };
    total += r.n;
  }
  const p = period.results[0] || {};
  const perDay = Object.fromEntries(byDay.results.map((r) => [r.d, r.n]));
  return {
    state: "ok",
    total,
    status,
    current: p.cur || 0,
    previous: p.prev || 0,
    marketing: p.marketing || 0,
    services: byService.results,
    daily: dayList(days).map((d) => ({ d, n: perDay[d] || 0 })),
  };
}

/* ---------- strona: GA4 + Search Console (to samo konto serwisowe co panel klienta) ---------- */

async function website(env, days) {
  if (!env.GA4_PROPERTY_ID && !env.GSC_SITE_URL) return off("GA4_PROPERTY_ID", "GSC_SITE_URL");
  if (!env.GOOGLE_SERVICE_ACCOUNT_KEY) return off("GOOGLE_SERVICE_ACCOUNT_KEY");
  const token = await getAccessToken(env);
  const [ga4, channels, gsc, queries] = await Promise.allSettled([
    env.GA4_PROPERTY_ID ? fetchGa4Summary(token, env.GA4_PROPERTY_ID, days) : null,
    env.GA4_PROPERTY_ID ? fetchGa4Channels(token, env.GA4_PROPERTY_ID, days) : [],
    env.GSC_SITE_URL ? fetchGscTotals(token, env.GSC_SITE_URL, days) : null,
    env.GSC_SITE_URL ? fetchGscQueries(token, env.GSC_SITE_URL, days, 10) : [],
  ]);
  const err = (r) => (r.status === "rejected" ? String(r.reason?.message || r.reason).slice(0, 200) : null);
  return {
    state: "ok",
    ga4Configured: !!env.GA4_PROPERTY_ID,
    gscConfigured: !!env.GSC_SITE_URL,
    ga4: ga4.status === "fulfilled" ? ga4.value : null,
    ga4Error: err(ga4),
    channels: channels.status === "fulfilled" ? channels.value : [],
    gsc: gsc.status === "fulfilled" ? gsc.value : null,
    gscError: err(gsc),
    queries: queries.status === "fulfilled" ? queries.value : [],
  };
}

/* ---------- Make.com (API v2, token z zakresami scenarios:read + organizations:read) ---------- */

async function makeGet(env, path, query) {
  const qs = query ? "?" + new URLSearchParams(query) : "";
  const res = await fetch(`https://${env.MAKE_ZONE || "eu1.make.com"}/api/v2${path}${qs}`, {
    headers: { Authorization: "Token " + env.MAKE_API_TOKEN, Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Make " + res.status + ": " + (await res.text()).slice(0, 160));
  return res.json();
}

const MAKE_PAGE = 100;
const MAKE_MAX_PAGES = 5;

/** Uruchomienia scenariusza w okresie. Status: 1 = OK, 2 = ostrzezenie, 3 = blad. */
async function makeScenario(env, id, days) {
  const from = Date.now() - days * DAY;
  const logs = [];
  for (let page = 0; page < MAKE_MAX_PAGES; page++) {
    const r = await makeGet(env, `/scenarios/${id}/logs`, {
      "pg[limit]": MAKE_PAGE,
      "pg[offset]": page * MAKE_PAGE,
      "pg[sortDir]": "desc",
      from,
      to: Date.now(),
    });
    const batch = r.scenarioLogs || [];
    logs.push(...batch);
    if (batch.length < MAKE_PAGE) break;
  }
  const { scenario = {} } = await makeGet(env, `/scenarios/${id}`);

  const perDay = {};
  let ok = 0, warn = 0, failed = 0, operations = 0, centicredits = 0, hasCredits = false;
  let lastError = null;
  for (const l of logs) {
    if (l.status === 1) ok++;
    else if (l.status === 2) warn++;
    else if (l.status === 3) {
      failed++;
      if (!lastError || l.timestamp > lastError) lastError = l.timestamp;
    }
    operations += Number(l.operations) || 0;
    if (typeof l.centicredits === "number") {
      hasCredits = true;
      centicredits += l.centicredits;
    }
    const d = String(l.timestamp || "").slice(0, 10);
    if (d) perDay[d] = (perDay[d] || 0) + 1;
  }
  return {
    id,
    name: scenario.name || "Scenariusz " + id,
    active: scenario.isActive ?? null,
    invalid: !!scenario.isinvalid,
    paused: !!scenario.isPaused,
    incomplete: scenario.dlqCount ?? null,
    runs: logs.length,
    truncated: logs.length >= MAKE_PAGE * MAKE_MAX_PAGES,
    ok,
    warn,
    failed,
    lastError,
    operations,
    credits: hasCredits ? centicredits / 100 : null,
    daily: dayList(days).map((d) => ({ d, n: perDay[d] || 0 })),
  };
}

async function make(env, days) {
  const ids = String(env.MAKE_SCENARIO_IDS || "").split(",").map((s) => s.trim()).filter((s) => /^\d+$/.test(s));
  if (!env.MAKE_API_TOKEN) return off("MAKE_API_TOKEN", "MAKE_SCENARIO_IDS");
  if (!ids.length) return off("MAKE_SCENARIO_IDS");

  const [scenarios, org] = await Promise.all([
    Promise.allSettled(ids.map((id) => makeScenario(env, id, days))),
    /^\d+$/.test(String(env.MAKE_ORG_ID || "")) ? makeGet(env, `/organizations/${env.MAKE_ORG_ID}`).catch((e) => ({ error: e.message })) : null,
  ]);
  const o = org?.organization;
  return {
    state: "ok",
    scenarios: scenarios.map((r, i) => (r.status === "fulfilled" ? r.value : { id: ids[i], error: String(r.reason?.message || r.reason).slice(0, 200) })),
    org: o
      ? {
          plan: o.productName || o.serviceName || null,
          used: Number.isFinite(Number(o.operations)) ? Number(o.operations) : null,
          limit: Number(o.license?.operations) || null,
          nextReset: o.nextReset || null,
        }
      : null,
    orgError: org?.error || null,
  };
}

/* ---------- chatbot: OpenRouter (klucz Management — tylko odczyt statystyk, nie do czatu) ---------- */

async function orGet(env, path) {
  const res = await fetch("https://openrouter.ai/api/v1" + path, {
    headers: { Authorization: "Bearer " + env.OPENROUTER_MANAGEMENT_KEY, Accept: "application/json" },
  });
  if (!res.ok) throw new Error("OpenRouter " + res.status + ": " + (await res.text()).slice(0, 160));
  return (await res.json()).data;
}

async function chatbot(env, days) {
  if (!env.OPENROUTER_MANAGEMENT_KEY) return off("OPENROUTER_MANAGEMENT_KEY");

  const [credits, keys] = await Promise.all([orGet(env, "/credits"), orGet(env, "/keys")]);
  const wanted = String(env.OPENROUTER_KEY_NAME || "").trim().toLowerCase();
  const key = wanted ? (keys || []).find((k) => [k.name, k.label].some((v) => String(v || "").toLowerCase() === wanted)) : null;

  /* /activity: ostatnie 30 pelnych dni UTC (bez dzisiaj), opcjonalnie tylko dla klucza chatbota */
  const rows = await orGet(env, "/activity" + (key ? "?api_key_hash=" + encodeURIComponent(key.hash) : ""));
  const span = Math.min(days, 30);
  const daysInRange = dayList(span, 1);
  const inRange = new Set(daysInRange);

  const perDay = {};
  const models = {};
  let requests = 0, cost = 0, tokens = 0;
  for (const r of rows || []) {
    if (!inRange.has(r.date)) continue;
    const t = (r.prompt_tokens || 0) + (r.completion_tokens || 0);
    requests += r.requests || 0;
    cost += r.usage || 0;
    tokens += t;
    perDay[r.date] = (perDay[r.date] || 0) + (r.requests || 0);
    const m = (models[r.model] ||= { model: r.model, requests: 0, cost: 0, tokens: 0 });
    m.requests += r.requests || 0;
    m.cost += r.usage || 0;
    m.tokens += t;
  }

  return {
    state: "ok",
    span,
    keyName: key ? key.name || key.label : null,
    keyMissing: !!wanted && !key,
    balance: credits ? credits.total_credits - credits.total_usage : null,
    key: key
      ? { today: key.usage_daily, week: key.usage_weekly, month: key.usage_monthly, limit: key.limit, remaining: key.limit_remaining, lastUsed: key.last_used_at }
      : null,
    requests,
    cost,
    tokens,
    models: Object.values(models).sort((a, b) => b.requests - a.requests),
    daily: daysInRange.map((d) => ({ d, n: perDay[d] || 0 })),
  };
}

/* ---------- wszystko naraz ---------- */

export async function collectStats(env, days) {
  const [leads, site, automations, chat] = await Promise.allSettled([
    leadStats(env, days),
    website(env, days),
    make(env, days),
    chatbot(env, days),
  ]);
  return { leads: settled(leads), site: settled(site), make: settled(automations), chat: settled(chat) };
}
