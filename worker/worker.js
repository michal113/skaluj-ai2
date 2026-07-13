/**
 * skaluj.ai — chatbot backend (Cloudflare Worker)
 * -------------------------------------------------
 * Trzyma klucz API (jako sekret), pobiera wiedzę z wiedza.txt na GitHub Pages,
 * woła model Claude i zwraca odpowiedź + flagę "book" (intencja umówienia spotkania).
 *
 * WDROŻENIE (skrót — pełne kroki w instrukcji):
 *   1. Zaloguj się na dash.cloudflare.com → Workers & Pages → Create Worker
 *   2. Wklej ten kod (Edit code) → Deploy
 *   3. Settings → Variables → dodaj SEKRET: ANTHROPIC_API_KEY = sk-ant-...
 *   4. (opcjonalnie) zmienna KNOWLEDGE_URL jeśli inna niż domyślna
 *   5. Skopiuj adres workera (https://twoj-worker.twoj-subdomen.workers.dev)
 *      i wklej go w widżecie jako WORKER_URL.
 */

const KNOWLEDGE_URL_DEFAULT = "https://michal113.github.io/skaluj-ai2/wiedza.txt";
const MODEL = "claude-3-5-haiku-20241022"; // szybki i tani; można dać sonnet dla lepszej jakości

const SYSTEM_RULES = `Jesteś asystentem na stronie skaluj.ai — agencji transformacji cyfrowej dla firm B2B (strony pod SEO i GEO, automatyzacje AI, chatboty, branding).

ZASADY:
- Odpowiadaj po polsku, krótko i konkretnie (2–5 zdań), w tonie partnerskim i pomocnym.
- Opieraj się WYŁĄCZNIE na sekcji WIEDZA poniżej oraz na ogólnej, bezpiecznej wiedzy o marketingu/AI.
- Jeśli pytanie dotyczy szczegółu o skaluj.ai, którego NIE MA w WIEDZY (np. dokładna cena, termin, gwarancja, konkretna realizacja) — NIE ZMYŚLAJ. Powiedz, że to ustalacie indywidualnie i zaproponuj bezpłatną konsultację.
- Zawsze delikatnie prowadź do umówienia bezpłatnej 30-minutowej konsultacji, gdy to naturalne.
- Nie wymyślaj cen ani obietnic. Nie podawaj informacji o konkurencji ani zewnętrznych narzędziach jako alternatywie dla skaluj.ai.
- Jeśli użytkownik chce umówić spotkanie/rozmowę/demo — potwierdź i zachęć do wyboru terminu (interfejs pokaże kalendarz).`;

function cors(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extra,
  };
}

let KB_CACHE = { text: "", at: 0 };
async function getKnowledge(url) {
  const now = Date.now();
  if (KB_CACHE.text && now - KB_CACHE.at < 5 * 60 * 1000) return KB_CACHE.text; // cache 5 min
  try {
    const r = await fetch(url, { cf: { cacheTtl: 300 } });
    const t = await r.text();
    KB_CACHE = { text: t, at: now };
    return t;
  } catch (e) {
    return KB_CACHE.text || "";
  }
}

function detectBooking(text) {
  const t = (text || "").toLowerCase();
  return /(umów|umow|spotkani|konsultacj|rezerw|termin|zadzwoń|porozmawia|demo|kalendarz|zarezerw)/.test(t);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors() });
    if (request.method !== "POST")
      return new Response("skaluj.ai chatbot backend — POST { question, history }", { headers: cors() });

    let payload;
    try { payload = await request.json(); } catch { payload = {}; }
    const question = (payload.question || "").toString().slice(0, 2000);
    const history = Array.isArray(payload.history) ? payload.history.slice(-10) : [];
    if (!question) return new Response(JSON.stringify({ answer: "Zadaj proszę pytanie 🙂", book: false }), { headers: cors({ "Content-Type": "application/json" }) });

    const knowledge = await getKnowledge(env.KNOWLEDGE_URL || KNOWLEDGE_URL_DEFAULT);
    const system = `${SYSTEM_RULES}\n\n=== WIEDZA (źródło prawdy o skaluj.ai) ===\n${knowledge}`;

    const messages = [
      ...history.filter(m => m && (m.role === "user" || m.role === "assistant"))
                .map(m => ({ role: m.role, content: String(m.content).slice(0, 2000) })),
      { role: "user", content: question },
    ];

    let answer = "Przepraszam, chwilowo nie mogę odpowiedzieć. Napisz na kontakt@skaluj.ai albo umów bezpłatną konsultację.";
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ model: MODEL, max_tokens: 400, system, messages }),
      });
      const data = await res.json();
      if (data && data.content && data.content[0] && data.content[0].text) answer = data.content[0].text.trim();
    } catch (e) { /* fallback answer already set */ }

    const book = detectBooking(question) || detectBooking(answer);
    return new Response(JSON.stringify({ answer, book }), {
      headers: cors({ "Content-Type": "application/json" }),
    });
  },
};
