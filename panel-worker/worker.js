/**
 * skaluj.ai — PANEL: backend (Cloudflare Worker)
 *
 * Panel NIE laczy sie z arkuszem bezposrednio. Najpierw wysyla haslo tutaj,
 * Worker je sprawdza i dopiero wtedy pobiera dane. Dzieki temu ani token do
 * arkusza, ani jego adres nigdy nie trafiaja do przegladarki.
 *
 * SEKRETY do ustawienia w Cloudflare (Settings -> Variables -> Encrypt):
 *   PANEL_PASSWORD  = haslo do panelu (wymysl dlugie)
 *   SHEET_API_URL   = adres wdrozenia Apps Script (konczy sie na /exec)
 *   SHEET_TOKEN     = ten sam TOKEN co w Apps Script
 */

const ALLOWED_ORIGINS = [
  'https://michal113.github.io',
  'https://skaluj.ai',
  'https://www.skaluj.ai',
];

function cors(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { ...cors(origin), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/* porownanie odporne na mierzenie czasu */
function safeEqual(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- pomocnicze do statystyk ---------- */
function toDate(v) {
  if (!v) return null;
  const s = String(v).trim().replace(' ', 'T');
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function inThisMonth(v) {
  const d = toDate(v);
  if (!d) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function inLastDays(v, days) {
  const d = toDate(v);
  if (!d) return false;
  return (Date.now() - d.getTime()) <= days * 24 * 60 * 60 * 1000;
}

/* pierwsza pasujaca kolumna z listy nazw */
function pick(row, names) {
  for (const n of names) {
    for (const key of Object.keys(row)) {
      if (key.toLowerCase() === n.toLowerCase()) return row[key];
    }
  }
  return '';
}

function buildStats(data) {
  const leady = Array.isArray(data.Leady) ? data.Leady : [];
  const mailing = Array.isArray(data.Mailing) ? data.Mailing : [];
  const chatbot = Array.isArray(data.Chatbot) ? data.Chatbot : [];

  const dateOf = (r) => pick(r, ['Data', 'data', 'Date', 'Timestamp']);

  /* mailing: zliczanie wg rodzaju zdarzenia */
  const ev = { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 };
  mailing.forEach((r) => {
    const t = String(pick(r, ['Zdarzenie', 'Event', 'type', 'Typ'])).toLowerCase();
    if (t.includes('sent')) ev.sent++;
    else if (t.includes('delivered')) ev.delivered++;
    else if (t.includes('opened')) ev.opened++;
    else if (t.includes('clicked')) ev.clicked++;
    else if (t.includes('bounced') || t.includes('complained')) ev.bounced++;
  });

  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

  return {
    leady: {
      total: leady.length,
      thisMonth: leady.filter((r) => inThisMonth(dateOf(r))).length,
      last7: leady.filter((r) => inLastDays(dateOf(r), 7)).length,
      zTerminem: leady.filter((r) => String(pick(r, ['Termin'])).trim() !== '').length,
    },
    mailing: {
      ...ev,
      deliveryRate: pct(ev.delivered, ev.sent || ev.delivered),
      clickRate: pct(ev.clicked, ev.delivered || ev.sent),
      openRate: pct(ev.opened, ev.delivered || ev.sent),
    },
    chatbot: {
      total: chatbot.length,
      thisMonth: chatbot.filter((r) => inThisMonth(dateOf(r))).length,
      last7: chatbot.filter((r) => inLastDays(dateOf(r), 7)).length,
    },
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }
    if (request.method !== 'POST') {
      return new Response('skaluj.ai panel API — POST { password }', { headers: cors(origin) });
    }

    if (!env.PANEL_PASSWORD || !env.SHEET_API_URL || !env.SHEET_TOKEN) {
      console.log('BRAK SEKRETOW: ustaw PANEL_PASSWORD, SHEET_API_URL, SHEET_TOKEN');
      return json({ error: 'Panel nie jest jeszcze skonfigurowany.' }, 500, origin);
    }

    let body;
    try { body = await request.json(); } catch { body = {}; }

    if (!safeEqual(body.password, env.PANEL_PASSWORD)) {
      await sleep(700); // spowalnia zgadywanie hasla
      return json({ error: 'Nieprawidłowe hasło.' }, 401, origin);
    }

    try {
      const url = env.SHEET_API_URL + (env.SHEET_API_URL.includes('?') ? '&' : '?')
                + 'token=' + encodeURIComponent(env.SHEET_TOKEN);

      const res = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(20000),
      });

      const raw = await res.text();
      let data;
      try { data = JSON.parse(raw); } catch {
        console.log('Arkusz nie zwrocil JSON:', raw.slice(0, 200));
        return json({ error: 'Nie udało się pobrać danych z arkusza.' }, 502, origin);
      }

      if (data.error) {
        console.log('Arkusz odrzucil token:', data.error);
        return json({ error: 'Brak dostępu do arkusza.' }, 502, origin);
      }

      return json({
        ok: true,
        generatedAt: data.generatedAt || '',
        stats: buildStats(data),
        leady: (data.Leady || []).slice(0, 200),
        mailing: (data.Mailing || []).slice(0, 200),
        chatbot: (data.Chatbot || []).slice(0, 200),
      }, 200, origin);

    } catch (e) {
      console.log('Blad pobierania:', String(e));
      return json({ error: 'Chwilowy problem z pobraniem danych. Spróbuj ponownie.' }, 502, origin);
    }
  },
};
