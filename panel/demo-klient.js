/* Przykladowe dane panelu klienta (zakladka Strona + SEO), w ksztalcie 1:1 z tym, co zwraca google.js.
   Uzywane przez lokalny podglad (podglad.mjs) i przez Worker WYLACZNIE dla wpisu KV z "demo": true —
   taki panel ma w naglowku etykiete "Demo · przykladowe dane". Nigdy dla prawdziwego klienta. */
export function demoStrona(teraz = new Date()) {
  const tyg = [236, 241, 229, 252, 248, 263, 258, 271, 266, 289, 301, 318];
  /* pelne tygodnie od poniedzialku, konczace sie przed biezacym tygodniem — jak fetchGa4Weekly */
  const start = new Date(Date.UTC(teraz.getUTCFullYear(), teraz.getUTCMonth(), teraz.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7) - 7 * tyg.length);
  return {
    ga4: {
      current: { sessions: 1174, totalUsers: 902, newUsers: 664, bounceRate: 0.412, averageSessionDuration: 118, screenPageViews: 3391 },
      previous: { sessions: 1031, totalUsers: 823, newUsers: 618, bounceRate: 0.436, averageSessionDuration: 121, screenPageViews: 2944 },
    },
    channels: [
      { label: "Organic Search", sessions: 612, pct: 52 }, { label: "Direct", sessions: 247, pct: 21 },
      { label: "Referral", sessions: 152, pct: 13 }, { label: "Organic Social", sessions: 105, pct: 9 },
      { label: "Paid Search", sessions: 58, pct: 5 },
    ],
    gsc: { clicks: 538, impressions: 18240, ctr: 0.0295, position: 11.8 },
    queries: [
      { query: "kuchnie na wymiar rzeszów", clicks: 84, impressions: 1902, position: 4.1 },
      { query: "meble kuchenne na zamówienie", clicks: 51, impressions: 2410, position: 8.7 },
      { query: "projekt kuchni cena", clicks: 33, impressions: 1288, position: 6.2 },
      { query: "kuchnia w zabudowie", clicks: 21, impressions: 940, position: 12.4 },
    ],
    weeks: tyg.map((sesje, i) => { const d = new Date(start); d.setUTCDate(d.getUTCDate() + 7 * i); return { start: d.toISOString().slice(0, 10), sesje }; }),
    pages: [
      { sciezka: "/", odslony: 1104 }, { sciezka: "/kuchnie-na-wymiar", odslony: 812 },
      { sciezka: "/realizacje", odslony: 604 }, { sciezka: "/blog/jak-zaplanowac-kuchnie-krok-po-kroku", odslony: 431 },
      { sciezka: "/kontakt", odslony: 288 },
    ],
    gscConfigured: true,
  };
}
