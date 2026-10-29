/**
 * skaluj.ai CRM — licznik odwiedzin strony (POST /api/hit). Bez cookies i bez identyfikatorow.
 *
 * Strona (cookies.js) wysyla navigator.sendBeacon przy wejsciu na podstrone { p, r, u } i przy wyjsciu
 * { p, r, u, t }: sciezka, domena strony odsylajacej, utm_source i czas na podstronie w sekundach.
 * Zapisujemy tylko zbiorcze sumy dzienne: podstrona, zrodlo, typ urzadzenia, kraj (z Cloudflare).
 * Adresu IP, User-Agenta ani niczego, co pozwala rozpoznac osobe, nie zapisujemy.
 * Przegladarki z wlaczonym Global Privacy Control / Do Not Track nie sa liczone.
 */

const ORIGINS = ["https://skaluj.ai", "https://www.skaluj.ai"];
const MAX_BYTES = 1024;
const MAX_SECONDS = 1800;
const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|curl|wget|python|go-http|java\/|httpclient|axios|node-fetch|phantom|selenium|puppeteer|playwright/i;

/* kolejnosc ma znaczenie: gemini.google.com przed google */
const SOURCES = [
  [/(^|\.)gemini\.google\./, "Gemini"],
  [/(^|\.)google\./, "Google"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)(chatgpt\.com|chat\.openai\.com)$|^chatgpt$/, "ChatGPT"],
  [/(^|\.)perplexity\.ai$|^perplexity$/, "Perplexity"],
  [/(^|\.)copilot\.microsoft\.com$/, "Copilot"],
  [/(^|\.)claude\.ai$/, "Claude"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$|^(facebook|fb)$/, "Facebook"],
  [/(^|\.)instagram\.com$|^(instagram|ig)$/, "Instagram"],
  [/(^|\.)(linkedin\.com|lnkd\.in)$|^linkedin$/, "LinkedIn"],
  [/(^|\.)(x\.com|twitter\.com|t\.co)$|^(twitter|x)$/, "X / Twitter"],
  [/(^|\.)(youtube\.com|youtu\.be)$|^youtube$/, "YouTube"],
  [/(^|\.)tiktok\.com$|^tiktok$/, "TikTok"],
];

const DIRECT = "Bezpośrednio";
const INTERNAL = "(wewnętrzne)";

export function cleanPath(p) {
  let s = String(p || "/").split(/[?#]/)[0];
  try {
    s = decodeURIComponent(s);
  } catch {}
  s = s.toLowerCase().replace(/\/{2,}/g, "/").replace(/\/index(\.html?)?$/, "/").replace(/\.html?$/, "");
  if (s.length > 1) s = s.replace(/\/$/, "");
  return s.startsWith("/") && s.length <= 80 && /^\/[a-z0-9/._-]*$/.test(s) ? s : "(inna)";
}

export function sourceOf(ref, utm) {
  const u = String(utm || "").trim().toLowerCase().slice(0, 40);
  const host = String(ref || "").trim().toLowerCase().replace(/^www\./, "").slice(0, 60);
  if (/(^|\.)skaluj\.ai$/.test(host) && !u) return INTERNAL;
  const key = u || host;
  if (!key) return DIRECT;
  for (const [re, name] of SOURCES) if (re.test(key)) return name;
  return /^[a-z0-9.-]+$/.test(key) ? key : "(inne)";
}

export function deviceOf(ua) {
  if (/ipad|tablet|kindle|silk|playbook|android(?!.*mobile)/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|phone/i.test(ua)) return "telefon";
  return "komputer";
}

/* awaryjny limit w pamieci, gdy brak bindingu HIT_LIMITER */
const seen = new Map();
async function tooMany(env, ip) {
  if (env.HIT_LIMITER) return !(await env.HIT_LIMITER.limit({ key: "hit:" + ip })).success;
  const now = Date.now();
  const e = seen.get(ip);
  if (!e || now - e.t > 60000) {
    if (seen.size > 5000) seen.clear();
    seen.set(ip, { t: now, n: 1 });
    return false;
  }
  return ++e.n > 60;
}

export async function hit(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = ORIGINS.concat(String(env.HIT_EXTRA_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean));
  const ok = allowed.includes(origin);
  const done = (status = 204) =>
    new Response(null, { status, headers: { "Access-Control-Allow-Origin": ok ? origin : "null", Vary: "Origin", "Cache-Control": "no-store" } });

  if (request.method === "OPTIONS") return done(ok ? 204 : 403);
  if (request.method !== "POST") return done(405);
  if (!ok) return done(403);

  const ua = request.headers.get("User-Agent") || "";
  if (!ua || BOT_RE.test(ua)) return done();
  if (request.headers.get("Sec-GPC") === "1" || request.headers.get("DNT") === "1") return done();
  if (Number(request.headers.get("Content-Length") || 0) > MAX_BYTES) return done(413);
  if (await tooMany(env, request.headers.get("CF-Connecting-IP") || "?")) return done(429);

  let b;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BYTES) return done(413);
    b = JSON.parse(raw);
  } catch {
    return done(400);
  }
  if (!b || typeof b !== "object") return done(400);

  const source = sourceOf(b.r, b.u);
  const t = Math.round(Number(b.t));
  const isTime = Number.isFinite(t) && t > 0;
  const country = /^[A-Z]{2}$/.test(request.cf?.country || "") ? request.cf.country : "XX";

  await env.DB.prepare(
    `INSERT INTO site_daily (day, path, source, device, country, views, entries, time_sum, time_n)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
     ON CONFLICT (day, path, source, device, country) DO UPDATE SET
       views = views + excluded.views, entries = entries + excluded.entries,
       time_sum = time_sum + excluded.time_sum, time_n = time_n + excluded.time_n`
  )
    .bind(
      new Date().toISOString().slice(0, 10),
      cleanPath(b.p),
      source,
      deviceOf(ua),
      country,
      isTime ? 0 : 1,
      isTime || source === INTERNAL ? 0 : 1,
      isTime ? Math.min(t, MAX_SECONDS) : 0,
      isTime ? 1 : 0
    )
    .run();
  return done();
}
