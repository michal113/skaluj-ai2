/* Lokalne podglady paneli (katalog panel/podglad/ jest w .gitignore):
     node panel/podglad.mjs
   -> wewnetrzny.html  panel wewnetrzny na danych demo (demo-internal.js)
   -> klient.html      panel klienta: Strona + SEO z danymi testowymi, reszta zakladek w trzech stanach
   -> klient-blad.html panel klienta, gdy GA4 nie odpowiedzial (zadnych liczb)
   Dane testowe klienta maja ksztalt tego, co zwraca google.js — nigdy nie trafiaja do Workera. */
import { writeFileSync, mkdirSync } from "node:fs";
import { renderInternal } from "./internal.js";
import { demoKlienci, ZRODLA } from "./demo-internal.js";
import { renderPage } from "./render.js";
import { demoStrona } from "./demo-klient.js";

const teraz = new Date();
const out = (plik, html) => writeFileSync(new URL("./podglad/" + plik, import.meta.url), html);
mkdirSync(new URL("./podglad/", import.meta.url), { recursive: true });

out("wewnetrzny.html", renderInternal({ klienci: demoKlienci(teraz), zrodla: ZRODLA, demo: true, generatedAt: teraz }));

/* panel klienta: dane z demo-klient.js (ksztalt 1:1 z google.js) */
const dane = demoStrona(teraz);
const config = {
  slug: "podglad", clientName: "Firma Demo",
  panels: { website: { status: "live" }, auto: { status: "pending" }, mail: { status: "offer" }, chatbot: { status: "offer" } },
};
const wspolne = { days: 28, brand: "skaluj.ai", contactUrl: "https://skaluj.ai/kontakt", generatedAt: teraz };
out("klient.html", renderPage({ config, data: dane, ...wspolne }));
out("klient-blad.html", renderPage({ config, data: { error: true }, ...wspolne }));
console.log("zapisano panel/podglad/: wewnetrzny.html, klient.html, klient-blad.html");
