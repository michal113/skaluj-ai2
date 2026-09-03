/**
 * skaluj.ai — panel wynikow klienta (Cloudflare Worker).
 *
 * Trasa:   GET /<slug>   -> panel klienta
 *          wszystko inne -> generyczne 404 (nie zdradza, czy slug istnieje)
 *
 * Dane:    GA4 + Google Search Console przez wspolne konto serwisowe.
 * Konfig:  KV PANEL_CLIENTS, klucz = slug, wartosc = JSON (patrz README.md).
 *
 * Sekret:  GOOGLE_SERVICE_ACCOUNT_KEY  (npx wrangler secret put ...)
 * Zmienne: BRAND_NAME, CONTACT_URL, DEFAULT_RANGE_DAYS  (wrangler.toml)
 *
 * Zasada: brak danych => "—". Nigdy nie renderujemy zmyslonej ani zerowej liczby.
 */
import {
  getAccessToken,
  fetchGa4Summary,
  fetchGa4Channels,
  fetchGscTotals,
  fetchGscQueries,
} from "./google.js";
import { renderPage, renderNotFound } from "./render.js";

/* Slugi generujemy sami (base64url, ~128 bit) — odrzucamy wszystko innego ksztaltu,
   zeby nie robic zapytan do KV dla przypadkowego ruchu i botow. */
const SLUG_RE = /^[A-Za-z0-9_-]{16,64}$/;

/** 6 godzin — na tyle swiezo, zeby klient widzial "dzis", na tyle rzadko, zeby nie bic w limity Google. */
const CACHE_TTL = 21600;

function baseHeaders(type) {
  return {
    "Content-Type": type,
    /* panel jest prywatny: zadnych posrednikow, zadnej indeksacji */
    "Cache-Control": "private, no-store, max-age=0",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
}

function notFound() {
  return new Response(renderNotFound(), {
    status: 404,
    headers: baseHeaders("text/html; charset=UTF-8"),
  });
}

/**
 * Pobiera dane dla panelu "Strona + SEO".
 * Promise.allSettled celowo: gdy klient nadal dostep tylko do GA4, a jeszcze nie do
 * Search Console, chcemy pokazac to, co mamy — a reszte jako "—", nie wywalic calej strony.
 */
async function fetchWebsiteData(env, cfg, days) {
  const token = await getAccessToken(env);
  const [ga4, channels, gsc, queries] = await Promise.allSettled([
    fetchGa4Summary(token, cfg.ga4PropertyId, days),
    fetchGa4Channels(token, cfg.ga4PropertyId, days),
    cfg.gscSiteUrl ? fetchGscTotals(token, cfg.gscSiteUrl, days) : Promise.resolve(null),
    cfg.gscSiteUrl ? fetchGscQueries(token, cfg.gscSiteUrl, days) : Promise.resolve([]),
  ]);

  /* GA4 to podstawa panelu — bez niego nie mamy czego pokazac. */
  if (ga4.status === "rejected") {
    console.log("panel: GA4 nieosiagalne —", ga4.reason?.message);
    return { error: true };
  }
  if (gsc.status === "rejected") console.log("panel: GSC nieosiagalne —", gsc.reason?.message);

  return {
    ga4: ga4.value,
    channels: channels.status === "fulfilled" ? channels.value : [],
    gsc: gsc.status === "fulfilled" ? gsc.value : null,
    queries: queries.status === "fulfilled" ? queries.value : [],
    /* Rozroznienie "Search Console nie jest czescia tego wdrozenia" (karty pomijamy)
       od "jest, ale nie odpowiedzial" (karty pokazujemy z myslnikiem) — inaczej brak
       dostepu wygladalby identycznie jak brak uslugi. */
    gscConfigured: !!cfg.gscSiteUrl,
  };
}

/** Cache danych (nie gotowej strony — strona nigdy nie trafia do zadnego cache'u). */
async function getWebsiteData(env, slug, cfg, days, force) {
  const key = "cache:" + slug + ":" + days;
  if (!force) {
    const hit = await env.PANEL_CLIENTS.get(key, "json");
    if (hit) return hit;
  }
  const data = await fetchWebsiteData(env, cfg, days);
  /* Bledu nie cache'ujemy — nastepne wejscie ma dostac kolejna szanse na prawdziwe dane. */
  if (!data.error) {
    await env.PANEL_CLIENTS.put(key, JSON.stringify(data), { expirationTtl: CACHE_TTL });
  }
  return data;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nDisallow: /\n", {
        headers: baseHeaders("text/plain; charset=UTF-8"),
      });
    }

    if (request.method !== "GET" && request.method !== "HEAD") return notFound();

    const slug = url.pathname.replace(/^\/+|\/+$/g, "");
    if (!SLUG_RE.test(slug)) return notFound();

    let config;
    try {
      config = await env.PANEL_CLIENTS.get(slug, "json");
    } catch (e) {
      console.log("panel: blad odczytu KV —", e.message);
      return notFound();
    }
    if (!config || !config.clientName) return notFound();

    const site = config.panels?.website;
    const days = Number(site?.dateRangeDays) || Number(env.DEFAULT_RANGE_DAYS) || 28;

    let data = {};
    if (site?.status === "live" && site.ga4PropertyId) {
      try {
        data = await getWebsiteData(env, slug, site, days, url.searchParams.get("odswiez") === "1");
      } catch (e) {
        console.log("panel: blad pobierania danych —", e.message);
        data = { error: true };
      }
    } else if (site?.status === "live") {
      /* oznaczony jako "live", ale bez ga4PropertyId — blad konfiguracji, nie zmyslamy liczb */
      data = { error: true };
    }

    const html = renderPage({
      config,
      data,
      days,
      brand: env.BRAND_NAME || "skaluj.ai",
      contactUrl: env.CONTACT_URL || "https://skaluj.ai/kontakt",
      generatedAt: new Date(),
    });

    return new Response(request.method === "HEAD" ? null : html, {
      headers: baseHeaders("text/html; charset=UTF-8"),
    });
  },
};
