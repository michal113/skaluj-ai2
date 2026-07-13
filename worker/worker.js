/**
 * skaluj.ai — chatbot backend (Cloudflare Worker) — GEMINI (Vertex Express, klucz AQ... + billing ON)
 * Sekret w Cloudflare:  GEMINI_API_KEY = AQ...  (klucz z aistudio.google.com)
 */

const KNOWLEDGE_URL_DEFAULT = "https://michal113.github.io/skaluj-ai2/wiedza.txt";
const MODEL = "gemini-2.5-flash"; // jak nie działa, zmień na "gemini-2.0-flash"

const SYSTEM_RULES = `Jesteś asystentem na stronie skaluj.ai — agencji transformacji cyfrowej dla firm B2B (strony pod SEO i GEO, automatyzacje AI, chatboty, branding).

ZASADY:
- Odpowiadaj po polsku, krótko i konkretnie (2–5 zdań), w tonie partnerskim i pomocnym.
- Opieraj się na sekcji WIEDZA poniżej oraz na ogólnej, bezpiecznej wiedzy o marketingu/AI.
- Jeśli pytanie dotyczy szczegółu o skaluj.ai, którego NIE MA w WIEDZY (dokładna cena, termin, gwarancja) — NIE ZMYŚLAJ. Powiedz, że ustalacie to indywidualnie i zaproponuj bezpłatną konsultację.
- Naturalnie zachęcaj do umówienia bezpłatnej 30-minutowej konsultacji, gdy to pasuje.
- Nie polecaj konkurencji ani zewnętrznych narzędzi jako alternatywy dla skaluj.ai.`;

function cors(extra = {}) {
  return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", ...extra };
}
let KB_CACHE = { text: "", at: 0 };
async function getKnowledge(url) {
  const now = Date.now();
  if (KB_CACHE.text && now - KB_CACHE.at < 5 * 60 * 1000) return KB_CACHE.text;
  try { const r = await fetch(url, { cf: { cacheTtl: 300 } }); const t = await r.text(); KB_CACHE = { text: t, at: now }; return t; }
  catch (e) { return KB_CACHE.text || ""; }
}
function detectBooking(text) {
  return /(umów|umow|spotkani|konsultacj|rezerw|termin|zadzwoń|porozmawia|demo|kalendarz|zarezerw)/.test((text || "").toLowerCase());
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors() });
    if (request.method !== "POST") return new Response("skaluj.ai chatbot backend (Gemini) — POST { question, history }", { headers: cors() });

    let payload; try { payload = await request.json(); } catch { payload = {}; }
    const question = (payload.question || "").toString().slice(0, 2000);
    const history = Array.isArray(payload.history) ? payload.history.slice(-10) : [];
    if (!question) return new Response(JSON.stringify({ answer: "Zadaj proszę pytanie 🙂", book: false }), { headers: cors({ "Content-Type": "application/json" }) });
    if (!env.GEMINI_API_KEY) return new Response(JSON.stringify({ answer: "[DEBUG] Brak sekretu GEMINI_API_KEY.", book: false }), { headers: cors({ "Content-Type": "application/json" }) });

    const knowledge = await getKnowledge(env.KNOWLEDGE_URL || KNOWLEDGE_URL_DEFAULT);
    const contents = [
      { role: "user", parts: [{ text: `${SYSTEM_RULES}\n\n=== WIEDZA ===\n${knowledge}\n\n(Odpowiadaj zgodnie z powyższym. Potwierdź krótko, że rozumiesz.)` }] },
      { role: "model", parts: [{ text: "Rozumiem. Jestem asystentem skaluj.ai i odpowiadam zgodnie z wiedzą." }] },
      ...history.filter(m => m && (m.role === "user" || m.role === "assistant"))
                .map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: String(m.content).slice(0, 2000) }] })),
      { role: "user", parts: [{ text: question }] },
    ];

    try {
      const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 400, temperature: 0.4 } }) });
      const raw = await res.text();
      let data; try { data = JSON.parse(raw); } catch { data = null; }
      const t = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (t) return new Response(JSON.stringify({ answer: t.trim(), book: detectBooking(question) || detectBooking(t) }), { headers: cors({ "Content-Type": "application/json" }) });
      const errMsg = data?.error?.message || raw.slice(0, 300) || `HTTP ${res.status}`;
      return new Response(JSON.stringify({ answer: `[DEBUG ${res.status}] ${errMsg}`, book: false }), { headers: cors({ "Content-Type": "application/json" }) });
    } catch (e) {
      return new Response(JSON.stringify({ answer: `[DEBUG wyjątek] ${String(e).slice(0, 200)}`, book: false }), { headers: cors({ "Content-Type": "application/json" }) });
    }
  },
};
