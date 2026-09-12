/**
 * skaluj.ai — chatbot backend (Cloudflare Worker) — OPENROUTER
 *
 * Sekret w Cloudflare:  OPENROUTER_API_KEY = sk-or-...   (openrouter.ai/keys)
 * Opcjonalnie:          KNOWLEDGE_URL      = adres wiedza.txt
 *                       DEBUG              = "1"  (pokazuje szczegoly bledu w odpowiedzi)
 *
 * WYMAGANE: konto OpenRouter musi miec kredyty (min. 10 USD jednorazowo).
 * Modele PLATNE — bez sufiksu ":free". Darmowe warianty sa wycofywane bez ostrzezenia
 * i wlasnie to powodowalo bledy 404 "This model is unavailable for free".
 */

const KNOWLEDGE_URL_DEFAULT = "https://michal113.github.io/skaluj-ai2/wiedza.txt";

/* Kolejnosc = priorytet. Worker idzie w dol listy, dopoki ktorys nie odpowie. */
const MODELS = [
  "google/gemini-2.5-flash-lite",        // tani, szybki, dwoch dostawcow = wysoka dostepnosc
  "meta-llama/llama-3.3-70b-instruct",   // zapas: mocniejszy
  "google/gemini-2.0-flash-001",         // zapas ostatniej szansy
];

const REQ_TIMEOUT_MS = 25000;   // limit na jedno zapytanie do modelu
const MAX_TRIES_PER_MODEL = 2;  // ponowienie przy bledzie PRZEJSCIOWYM (429 / 5xx)
const RETRY_DELAY_MS = 900;     // odstep przed ponowieniem
const KB_MAX_CHARS = 14000;     // limit wiedzy wysylanej w prompcie
const KB_TTL_MS = 5 * 60 * 1000;

const FRIENDLY_ERROR =
  "Przepraszam, chwilowo nie moge odpowiedziec — sprobuj ponownie za momencik. " +
  "Jesli sprawa jest pilna, napisz na kontakt@skaluj.ai albo wypelnij formularz, odezwiemy sie szybko.";

const SYSTEM_RULES = `Jesteś asystentem na stronie skaluj.ai — agencji transformacji cyfrowej dla firm B2B (strony pod SEO i GEO, automatyzacje AI, chatboty, branding).

ZASADY:
- Odpowiadaj po polsku, krótko i konkretnie (2–5 zdań), w tonie partnerskim i pomocnym.
- Opieraj się na sekcji WIEDZA poniżej oraz na ogólnej, bezpiecznej wiedzy o marketingu/AI.
- Jeśli pytanie dotyczy szczegółu o skaluj.ai, którego NIE MA w WIEDZY (dokładna cena, termin, gwarancja) — NIE ZMYŚLAJ. Powiedz, że ustalacie to indywidualnie i zaproponuj bezpłatną konsultację.
- Naturalnie zachęcaj do umówienia bezpłatnej 30-minutowej konsultacji, gdy to pasuje.
- Nie polecaj konkurencji ani zewnętrznych narzędzi jako alternatywy dla skaluj.ai.`;

function cors(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extra,
  };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: cors({ "Content-Type": "application/json; charset=utf-8" }),
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- wiedza ---------- */
let KB_CACHE = { text: "", at: 0 };
async function getKnowledge(url) {
  const now = Date.now();
  if (KB_CACHE.text && now - KB_CACHE.at < KB_TTL_MS) return KB_CACHE.text;
  try {
    const r = await fetch(url, {
      cf: { cacheTtl: 300 },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    let t = await r.text();
    if (t.length > KB_MAX_CHARS) t = t.slice(0, KB_MAX_CHARS);
    KB_CACHE = { text: t, at: now };
    return t;
  } catch (e) {
    console.log("KB fetch failed:", String(e));
    return KB_CACHE.text || "";   // stara kopia lepsza niz brak
  }
}

function detectBooking(text) {
  return /(umów|umow|spotkani|konsultacj|rezerw|termin|zadzwoń|porozmawia|demo|kalendarz|zarezerw)/
    .test((text || "").toLowerCase());
}

/* Czy blad da sie naprawic ponowieniem tego samego modelu? */
function isTransient(status) {
  return status === 408 || status === 409 || status === 425 ||
         status === 429 || status === 500 || status === 502 ||
         status === 503 || status === 504 || status === 529;
}

/* Jedno zapytanie do OpenRoutera. */
async function callModel(apiKey, model, messages) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://skaluj.ai",
      "X-Title": "skaluj.ai",
    },
    body: JSON.stringify({ model, max_tokens: 700, temperature: 0.4, messages }),
    signal: AbortSignal.timeout(REQ_TIMEOUT_MS),
  });

  const raw = await res.text();
  let data = null;
  try { data = JSON.parse(raw); } catch { /* nie-JSON = blad dostawcy */ }

  const text = data?.choices?.[0]?.message?.content;
  if (res.ok && text && text.trim()) return { ok: true, text: text.trim() };

  return {
    ok: false,
    status: res.status,
    message: data?.error?.message || raw.slice(0, 300) || "brak tresci w odpowiedzi",
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors() });
    if (request.method !== "POST") {
      return new Response("skaluj.ai chatbot backend (OpenRouter) — POST { question, history }", { headers: cors() });
    }

    let payload;
    try { payload = await request.json(); } catch { payload = {}; }

    const question = (payload.question || "").toString().slice(0, 2000);
    const history = Array.isArray(payload.history) ? payload.history.slice(-10) : [];
    const debug = env.DEBUG === "1";

    if (!question) return json({ answer: "Zadaj proszę pytanie 🙂", book: false });

    if (!env.OPENROUTER_API_KEY) {
      console.log("BLAD KONFIGURACJI: brak sekretu OPENROUTER_API_KEY");
      return json({ answer: FRIENDLY_ERROR, book: false });
    }

    const knowledge = await getKnowledge(env.KNOWLEDGE_URL || KNOWLEDGE_URL_DEFAULT);

    const messages = [
      { role: "system", content: `${SYSTEM_RULES}\n\n=== WIEDZA (źródło prawdy o skaluj.ai) ===\n${knowledge}` },
      ...history
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
        .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) })),
      { role: "user", content: question },
    ];

    const problems = [];

    for (const model of MODELS) {
      for (let attempt = 1; attempt <= MAX_TRIES_PER_MODEL; attempt++) {
        let r;
        try {
          r = await callModel(env.OPENROUTER_API_KEY, model, messages);
        } catch (e) {
          // timeout albo blad sieci — traktujemy jak przejsciowy
          r = { ok: false, status: 0, message: String(e).slice(0, 200) };
        }

        if (r.ok) {
          if (attempt > 1 || problems.length) {
            console.log(`OK na ${model} (proba ${attempt}); wczesniejsze problemy:`, problems.join(" | "));
          }
          return json({ answer: r.text, book: detectBooking(question) || detectBooking(r.text) });
        }

        problems.push(`${model} [${r.status}] ${r.message}`);

        // 402 = brak kredytow. Kolejne modele tez nie przejda — nie ma sensu probowac.
        if (r.status === 402) {
          console.log("BRAK KREDYTOW OpenRouter — doladuj konto:", r.message);
          return json({ answer: FRIENDLY_ERROR, book: false, ...(debug ? { debug: problems } : {}) });
        }

        // 401/403 = zly klucz. To samo.
        if (r.status === 401 || r.status === 403) {
          console.log("BLAD AUTORYZACJI OpenRouter:", r.message);
          return json({ answer: FRIENDLY_ERROR, book: false, ...(debug ? { debug: problems } : {}) });
        }

        const transient = r.status === 0 || isTransient(r.status);
        if (transient && attempt < MAX_TRIES_PER_MODEL) {
          await sleep(RETRY_DELAY_MS * attempt);
          continue;               // ponow ten sam model
        }
        break;                    // blad trwaly (np. 404 wycofany model) => nastepny model
      }
    }

    console.log("Wszystkie modele zawiodly:", problems.join(" | "));
    return json({ answer: FRIENDLY_ERROR, book: false, ...(debug ? { debug: problems } : {}) });
  },
};
