/**
 * skaluj.ai — chatbot backend (Cloudflare Worker) — wersja GEMINI (darmowa)
 * ------------------------------------------------------------------------
 * Trzyma klucz Gemini (jako sekret), pobiera wiedzę z wiedza.txt na GitHub Pages,
 * woła model Google Gemini i zwraca odpowiedź + flagę "book" (intencja umówienia).
 *
 * WDROŻENIE:
 *   1. dash.cloudflare.com → Workers & Pages → Create Worker → Deploy
 *   2. Edit code → wklej ten plik → Deploy
 *   3. Settings → Variables and Secrets → Add → typ "Secret":
 *        Nazwa:  GEMINI_API_KEY     Wartość: <klucz z aistudio.google.com>
 *   4. Skopiuj adres workera (https://...workers.dev) i wklej w chatbot.js jako WORKER_URL.
 */

const KNOWLEDGE_URL_DEFAULT = "https://michal113.github.io/skaluj-ai2/wiedza.txt";
const MODEL = "gemini-2.5-flash"; // Express mode (klucz AQ...) obsługuje modele 2.5

const SYSTEM_RULES = `Jesteś asystentem na stronie skaluj.ai — agencji transformacji cyfrowej dla firm B2B (strony pod SEO i GEO, automatyzacje AI, chatboty, branding).

ZASADY:
- Odpowiadaj po polsku, krótko i konkretnie (2–5 zdań), w tonie partnerskim i pomocnym.
- Opieraj się WYŁĄCZNIE na sekcji WIEDZA poniżej oraz na ogólnej, bezpiecznej wiedzy o marketingu/AI.
- Jeśli pytanie dotyczy szczegółu o skaluj.ai, którego NIE MA w WIEDZY (np. dokładna cena, termin, gwarancja, konkretna realizacja) — NIE ZMYŚLAJ. Powiedz, że ustalacie to indywidualnie i zaproponuj bezpłatną konsultację.
- Naturalnie zachęcaj do umówienia bezpłatnej 30-minutowej konsultacji, gdy to pasuje.
- Nie wymyślaj cen ani obietnic. Nie polecaj konkurencji ani zewnętrznych narzędzi jako alternatywy dla skaluj.ai.
- Jeśli użytkownik chce umówić spotkanie/rozmowę/demo — potwierdź krótko i zachęć do wyboru terminu (interfejs pokaże kalendarz).`;

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
  if (KB_CACHE.text && now - KB_CACHE.at < 5 * 60 * 1000) return KB_CACHE.text;
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
      return new Response("skaluj.ai chatbot backend (Gemini) — POST { question, history }", { headers: cors() });

    let payload;
    try { payload = await request.json(); } catch { payload = {}; }
    const question = (payload.question || "").toString().slice(0, 2000);
    const history = Array.isArray(payload.history) ? payload.history.slice(-10) : [];
    if (!question)
      return new Response(JSON.stringify({ answer: "Zadaj proszę pytanie 🙂", book: false }), { headers: cors({ "Content-Type": "application/json" }) });

    const knowledge = await getKnowledge(env.KNOWLEDGE_URL || KNOWLEDGE_URL_DEFAULT);
    const system = `${SYSTEM_RULES}\n\n=== WIEDZA (źródło prawdy o skaluj.ai) ===\n${knowledge}`;

    // historia -> format Gemini (role: user | model)
    const contents = history
      .filter(m => m && (m.role === "user" || m.role === "assistant"))
      .map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: String(m.content).slice(0, 2000) }] }));
    contents.push({ role: "user", parts: [{ text: question }] });

    let answer = "Przepraszam, chwilowo nie mogę odpowiedzieć. Napisz na kontakt@skaluj.ai albo umów bezpłatną konsultację.";
    try {
      const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { maxOutputTokens: 400, temperature: 0.4 },
        }),
      });
      const data = await res.json();
      const t = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (t) answer = t.trim();
    } catch (e) { /* fallback answer already set */ }

    const book = detectBooking(question) || detectBooking(answer);
    return new Response(JSON.stringify({ answer, book }), { headers: cors({ "Content-Type": "application/json" }) });
  },
};
