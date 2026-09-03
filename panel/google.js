/**
 * skaluj.ai — panel klienta: dostep do danych Google (GA4 + Search Console).
 *
 * Model: JEDNO wspolne konto serwisowe dla wszystkich klientow.
 * Klient nadaje temu kontu dostep "Viewer" do swojej uslugi GA4 i witryny
 * w Search Console — nie ma per-klienckiego OAuth ani odswiezania tokenow.
 *
 * Sekret (Worker -> Settings -> Variables):
 *   GOOGLE_SERVICE_ACCOUNT_KEY (Secret) — cala zawartosc pliku JSON konta serwisowego
 *
 * WAZNE: gdy metryki nie da sie pobrac, zwracamy null — NIGDY 0.
 * Zero czyta sie jak prawdziwy (zly) wynik, a nie jak brak danych.
 */

const SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
].join(" ");

function b64url(input) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem) {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

/** Token dostepu Google z JWT konta serwisowego (RS256, podpis przez crypto.subtle). */
export async function getAccessToken(env) {
  if (!env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    throw new Error("Brak sekretu GOOGLE_SERVICE_ACCOUNT_KEY");
  }
  const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_KEY);
  const now = Math.floor(Date.now() / 1000);

  const unsigned =
    b64url(JSON.stringify({ alg: "RS256", typ: "JWT" })) +
    "." +
    b64url(
      JSON.stringify({
        iss: sa.client_email,
        scope: SCOPES,
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      })
    );

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned)
  );

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: unsigned + "." + b64url(sig),
    }),
  });
  if (!res.ok) {
    throw new Error("Token Google odrzucony (" + res.status + "): " + (await res.text()).slice(0, 200));
  }
  return (await res.json()).access_token;
}

/* ---------- GA4 ---------- */

const GA4_METRICS = [
  "sessions",
  "totalUsers",
  "newUsers",
  "bounceRate",
  "averageSessionDuration",
  "screenPageViews",
];

function ga4Rows(json) {
  /* Przy dwoch zakresach dat GA4 dokłada wymiar "dateRange" — mapujemy po jego wartosci. */
  const out = {};
  const names = (json.metricHeaders || []).map((h) => h.name);
  for (const row of json.rows || []) {
    const label = row.dimensionValues?.[0]?.value || "current";
    const vals = {};
    (row.metricValues || []).forEach((m, i) => {
      const n = parseFloat(m.value);
      vals[names[i]] = Number.isFinite(n) ? n : null;
    });
    out[label] = vals;
  }
  return out;
}

/** Glowne metryki GA4 dla biezacego i poprzedniego okresu (do policzenia trendow). */
export async function fetchGa4Summary(token, propertyId, days) {
  const property = propertyId.startsWith("properties/") ? propertyId : "properties/" + propertyId;
  const res = await fetch(
    "https://analyticsdata.googleapis.com/v1beta/" + property + ":runReport",
    {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [
          { startDate: days + "daysAgo", endDate: "yesterday", name: "current" },
          { startDate: days * 2 + "daysAgo", endDate: days + 1 + "daysAgo", name: "previous" },
        ],
        metrics: GA4_METRICS.map((name) => ({ name })),
      }),
    }
  );
  if (!res.ok) {
    throw new Error("GA4 " + res.status + ": " + (await res.text()).slice(0, 200));
  }
  return ga4Rows(await res.json());
}

/** Zrodla ruchu (kanaly) — do paskow procentowych. */
export async function fetchGa4Channels(token, propertyId, days) {
  const property = propertyId.startsWith("properties/") ? propertyId : "properties/" + propertyId;
  const res = await fetch(
    "https://analyticsdata.googleapis.com/v1beta/" + property + ":runReport",
    {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: days + "daysAgo", endDate: "yesterday" }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 6,
      }),
    }
  );
  if (!res.ok) throw new Error("GA4 kanaly " + res.status);
  const json = await res.json();
  const rows = (json.rows || []).map((r) => ({
    label: r.dimensionValues?.[0]?.value || "—",
    sessions: parseFloat(r.metricValues?.[0]?.value) || 0,
  }));
  const total = rows.reduce((s, r) => s + r.sessions, 0);
  return rows.map((r) => ({ ...r, pct: total > 0 ? Math.round((r.sessions / total) * 100) : 0 }));
}

/* ---------- Search Console ---------- */

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

/** Search Console raportuje z ~2-3 dniowym opoznieniem — cofamy okno o 3 dni. */
function gscRange(days) {
  const end = new Date(Date.now() - 3 * 86400000);
  const start = new Date(end.getTime() - (days - 1) * 86400000);
  return { startDate: ymd(start), endDate: ymd(end) };
}

async function gscQuery(token, siteUrl, body) {
  const res = await fetch(
    "https://www.googleapis.com/webmasters/v3/sites/" +
      encodeURIComponent(siteUrl) +
      "/searchAnalytics/query",
    {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    throw new Error("GSC " + res.status + ": " + (await res.text()).slice(0, 200));
  }
  return res.json();
}

/** Sumy z Search Console: klikniecia, wyswietlenia, CTR, srednia pozycja. */
export async function fetchGscTotals(token, siteUrl, days) {
  const json = await gscQuery(token, siteUrl, { ...gscRange(days), dimensions: [], rowLimit: 1 });
  const r = json.rows?.[0];
  if (!r) return null;
  return {
    clicks: r.clicks ?? null,
    impressions: r.impressions ?? null,
    ctr: r.ctr ?? null,
    position: r.position ?? null,
  };
}

/** Najlepsze frazy — do tabeli. */
export async function fetchGscQueries(token, siteUrl, days, limit = 8) {
  const json = await gscQuery(token, siteUrl, {
    ...gscRange(days),
    dimensions: ["query"],
    rowLimit: limit,
  });
  return (json.rows || []).map((r) => ({
    query: r.keys?.[0] || "—",
    clicks: r.clicks ?? null,
    impressions: r.impressions ?? null,
    position: r.position ?? null,
  }));
}
