/**
 * skaluj.ai — prywatny CRM i statystyki (Cloudflare Worker + D1).
 *
 * Trasy (wszystko poza /api/lead wymaga hasla: HTTP Basic, sekret ADMIN_PASSWORD):
 *   GET  /                  panel: leady + strona (GA4/GSC) + Make + chatbot (OpenRouter)
 *   POST /leady/<id>        zmiana statusu, wartosci i notatki
 *   POST /leady/<id>/usun   usuniecie zgloszenia (np. zadanie usuniecia danych, art. 17 RODO)
 *   GET  /leady.csv         eksport (kopia zapasowa, zadanie kopii danych, art. 15/20 RODO)
 *   POST /api/lead          zgloszenie z Make (naglowek Authorization: Bearer <INGEST_TOKEN>)
 *
 * Cron: codzienna retencja zgodna z polityka prywatnosci (12 miesiecy bez kontaktu).
 * Panel nie uzywa JavaScriptu — CSP blokuje wszystkie skrypty, wiec nawet zlosliwa tresc
 * w zgloszeniu nie ma czego uruchomic (i tak wszystko jest escapowane).
 */
import { collectStats } from "./sources.js";
import { renderDashboard, renderMessage } from "./render.js";

export const STATUSES = ["nowy", "kontakt", "oferta", "klient", "przegrany"];
const PERIODS = [7, 30, 90];
const ID_RE = /^[A-Za-z0-9-]{8,40}$/;
const RETENTION_DAYS = 365;
const MAX_INGEST_BYTES = 64 * 1024;
const LIMITS = { name: 120, email: 160, phone: 40, company: 160, service: 60, message: 5000, termin: 120, marketing_text: 300, note: 2000 };

const clip = (v, n) => String(v ?? "").trim().slice(0, n);

function headers(type, extra) {
  return {
    "Content-Type": type,
    "Cache-Control": "private, no-store, max-age=0",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Content-Type-Options": "nosniff",
    /* same-origin, nie no-referrer: przy no-referrer przegladarka wysyla "Origin: null" w formularzach */
    "Referrer-Policy": "same-origin",
    "Content-Security-Policy":
      "default-src 'none'; style-src 'unsafe-inline' https://skaluj.ai; font-src https://skaluj.ai; " +
      "img-src https://skaluj.ai; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    ...extra,
  };
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: headers("application/json; charset=UTF-8") });

const html = (body, status = 200, extra) =>
  new Response(body, { status, headers: headers("text/html; charset=UTF-8", extra) });

const redirect = (to) => new Response(null, { status: 303, headers: headers("text/plain", { Location: to }) });

/* ---------- uwierzytelnianie ---------- */

async function sha256(s) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}

/** Porownanie w stalym czasie (przez skroty, wiec dlugosc hasla tez nie wycieka). */
async function safeEqual(a, b) {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

function basicPassword(request) {
  const h = request.headers.get("Authorization") || "";
  if (!h.startsWith("Basic ")) return null;
  try {
    /* przegladarki koduja login:haslo w UTF-8 - bez tego haslo z polskimi znakami nigdy by nie pasowalo */
    const bytes = Uint8Array.from(atob(h.slice(6).trim()), (c) => c.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    return decoded.slice(decoded.indexOf(":") + 1);
  } catch {
    return null;
  }
}

/* awaryjny limit w pamieci, gdy binding AUTH_LIMITER nie jest skonfigurowany */
const failures = new Map();
async function tooManyFailures(env, ip) {
  if (env.AUTH_LIMITER) {
    const { success } = await env.AUTH_LIMITER.limit({ key: "auth:" + ip });
    return !success;
  }
  const now = Date.now();
  const e = failures.get(ip);
  if (!e || now - e.t > 60000) {
    failures.set(ip, { t: now, n: 1 });
    return false;
  }
  return ++e.n > 10;
}

async function checkAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) {
    return html(renderMessage("Panel jest zablokowany", "Ustaw sekret ADMIN_PASSWORD (npx wrangler secret put ADMIN_PASSWORD)."), 503);
  }
  const unauthorized = () =>
    html(renderMessage("Wymagane logowanie", "Przeglądarka pokaże okienko logowania: wpisz dowolną nazwę użytkownika i hasło do panelu. Nie widzisz okienka? Odśwież stronę."), 401, {
      "WWW-Authenticate": 'Basic realm="skaluj CRM", charset="UTF-8"',
    });
  const password = basicPassword(request);
  if (password === null) return unauthorized();
  /* spacje na koncach to prawie zawsze artefakt kopiowania z terminala, nie czesc hasla */
  if (await safeEqual(password.trim(), String(env.ADMIN_PASSWORD).trim())) return null;
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (await tooManyFailures(env, ip)) {
    return html(renderMessage("Za dużo prób", "Spróbuj ponownie za minutę."), 429, { "Retry-After": "60" });
  }
  return unauthorized();
}

/** Ochrona przed CSRF: zmiany tylko z formularzy z tej samej domeny (przegladarka i tak dokleja haslo Basic).
 *  Sec-Fetch-Site wysylaja wszystkie wspolczesne przegladarki; Origin to zapas dla starszych. */
function sameOrigin(request, url) {
  const site = request.headers.get("Sec-Fetch-Site");
  if (site) return site === "same-origin";
  return request.headers.get("Origin") === url.origin;
}

/* ---------- przyjmowanie zgloszen z Make ---------- */

async function readBody(request) {
  const type = request.headers.get("Content-Type") || "";
  let body = null;
  if (type.includes("application/json")) body = await request.json();
  else if (type.includes("form")) body = Object.fromEntries(await request.formData());
  if (!body || typeof body !== "object") return null;
  /* nazwy pol wpisywane recznie w Make: "Email", " email " i "e-mail" traktujemy jak "email" */
  const out = {};
  for (const [k, v] of Object.entries(body)) out[String(k).trim().toLowerCase().replace(/^e-mail$/, "email")] = v;
  return out;
}

async function ingest(request, env) {
  if (!env.INGEST_TOKEN) return json({ error: "INGEST_TOKEN not set" }, 503);
  /* wyrozumiale dla recznej konfiguracji w Make: "Bearer <t>", "Bearer Bearer <t>", sam "<t>" albo naglowek X-Api-Key */
  const raw = request.headers.get("Authorization") || request.headers.get("X-Api-Key") || "";
  const given = raw.trim().replace(/^(Bearer\s+)+/i, "").replace(/^["']+|["']+$/g, "").trim();
  if (!given || !(await safeEqual(given, String(env.INGEST_TOKEN).trim()))) {
    return json({ error: "unauthorized" }, 401);
  }
  if (Number(request.headers.get("Content-Length") || 0) > MAX_INGEST_BYTES) return json({ error: "too large" }, 413);

  let b = null;
  try {
    b = await readBody(request);
  } catch {}
  if (!b || typeof b !== "object") return json({ error: "expected JSON or form body" }, 400);

  /* pole-pulapka z formularza: czlowiek go nie widzi, bot wypelnia */
  if (clip(b._gotcha, 10)) return json({ ok: true, skipped: "spam" });

  const email = clip(b.email, LIMITS.email).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    /* same nazwy pol (bez wartosci) - pomaga znalezc blad w mapowaniu w Make */
    return json({ error: "invalid email", received_fields: Object.keys(b).slice(0, 30), email_empty: !email }, 400);
  }

  const marketing = /^(tak|true|1|on|yes)$/i.test(clip(b.marketing, 10)) ? 1 : 0;
  const now = new Date().toISOString();
  const result = await env.DB.prepare(
    `INSERT OR IGNORE INTO leads
       (id, created_at, sent_at, name, email, phone, company, service, message, termin, marketing, marketing_text, status, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 'nowy', ?2)`
  )
    .bind(
      crypto.randomUUID(),
      now,
      clip(b.wyslano, 40) || null,
      clip(b.name, LIMITS.name),
      email,
      clip(b.phone, LIMITS.phone),
      clip(b.company, LIMITS.company),
      clip(b.svc ?? b.service, LIMITS.service),
      clip(b.message, LIMITS.message),
      clip(b.termin, LIMITS.termin),
      marketing,
      marketing ? clip(b.marketing_tresc ?? b.marketing_text, LIMITS.marketing_text) : null
    )
    .run();

  const created = result.meta.changes > 0;
  return json({ ok: true, duplicate: !created }, created ? 201 : 200);
}

/* ---------- operacje w panelu ---------- */

async function updateLead(env, id, form) {
  const status = STATUSES.includes(form.get("status")) ? form.get("status") : null;
  const raw = clip(form.get("value"), 16).replace(/[\s zł]/gi, "").replace(",", ".");
  const value = raw && Number.isFinite(Number(raw)) ? Math.round(Number(raw)) : null;
  await env.DB.prepare(
    "UPDATE leads SET status = COALESCE(?2, status), value_pln = ?3, note = ?4, updated_at = ?5 WHERE id = ?1"
  )
    .bind(id, status, value, clip(form.get("note"), LIMITS.note) || null, new Date().toISOString())
    .run();
}

const CSV_COLS = ["created_at", "sent_at", "status", "name", "email", "phone", "company", "service", "termin", "value_pln", "marketing", "marketing_text", "note", "message", "updated_at"];

function csvCell(v) {
  let s = v == null ? "" : String(v);
  /* Excel wykonuje komorki zaczynajace sie od = + - @ jako formuly — neutralizujemy */
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

async function exportCsv(env) {
  const { results } = await env.DB.prepare("SELECT * FROM leads ORDER BY created_at DESC").all();
  /* srednik + BOM: polski Excel otwiera to poprawnie dwuklikiem */
  const lines = [CSV_COLS.join(";"), ...results.map((r) => CSV_COLS.map((c) => csvCell(r[c])).join(";"))];
  const day = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + lines.join("\r\n"), {
    headers: headers("text/csv; charset=UTF-8", { "Content-Disposition": `attachment; filename="skaluj-leady-${day}.csv"` }),
  });
}

async function dashboard(env, url) {
  const days = PERIODS.includes(Number(url.searchParams.get("dni"))) ? Number(url.searchParams.get("dni")) : 30;
  const status = STATUSES.includes(url.searchParams.get("status")) ? url.searchParams.get("status") : "";
  const listQuery = status
    ? env.DB.prepare("SELECT * FROM leads WHERE status = ?1 ORDER BY created_at DESC LIMIT 300").bind(status)
    : env.DB.prepare("SELECT * FROM leads ORDER BY created_at DESC LIMIT 300");
  const [{ results: leads }, stats] = await Promise.all([listQuery.all(), collectStats(env, days)]);
  return html(renderDashboard({ leads, stats, days, status, periods: PERIODS, statuses: STATUSES, generatedAt: new Date() }));
}

/* ---------- routing ---------- */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/robots.txt") {
      return new Response("User-agent: *\nDisallow: /\n", { headers: headers("text/plain; charset=UTF-8") });
    }
    if (path === "/api/lead") {
      return request.method === "POST" ? ingest(request, env) : json({ error: "method" }, 405);
    }

    const denied = await checkAdmin(request, env);
    if (denied) return denied;

    if (request.method === "GET" && path === "/") return dashboard(env, url);
    if (request.method === "GET" && path === "/leady.csv") return exportCsv(env);

    const m = path.match(/^\/leady\/([^/]+)(\/usun)?$/);
    if (request.method === "POST" && m && ID_RE.test(m[1])) {
      if (!sameOrigin(request, url)) return html(renderMessage("Odrzucono", "Żądanie spoza panelu."), 403);
      const form = await request.formData();
      /* powrot do tego samego widoku (?dni=..&status=..), bez mozliwosci przekierowania gdzie indziej */
      const q = String(form.get("back") || "").replace(/[^a-z0-9=&?]/gi, "");
      const back = "/" + (q.startsWith("?") ? q : "");
      if (m[2]) {
        if (form.get("confirm") !== "tak") return redirect(back);
        await env.DB.prepare("DELETE FROM leads WHERE id = ?1").bind(m[1]).run();
        return redirect(back);
      }
      await updateLead(env, m[1], form);
      /* zmiana statusu w przefiltrowanej liscie: zgloszenie wypadloby z filtra i "zapisano" nie mialoby gdzie sie pokazac */
      const p = new URLSearchParams(q.startsWith("?") ? q.slice(1) : "");
      if (p.get("status") && p.get("status") !== form.get("status")) p.delete("status");
      const qs = p.toString();
      return redirect("/" + (qs ? "?" + qs : "") + "#l-" + m[1]);
    }

    return html(renderMessage("Nie ma takiej strony", ""), 404);
  },

  /** Retencja: zgloszenia bez wspolpracy i bez zgody marketingowej znikaja po 12 miesiacach od ostatniej zmiany. */
  async scheduled(controller, env) {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();
    const r = await env.DB.prepare(
      "DELETE FROM leads WHERE status IN ('nowy','kontakt','oferta','przegrany') AND marketing = 0 AND updated_at < ?1"
    )
      .bind(cutoff)
      .run();
    console.log("crm: retencja, usuniete zgloszenia:", r.meta.changes);
  },
};
