/**
 * skaluj.ai — dodanie klienta do panelu.
 *
 * Uzycie:
 *   node provision.mjs "Nazwa klienta"
 *   node provision.mjs "Nazwa klienta" --ga4 123456789 --gsc https://klient.pl/ --dni 28
 *
 * Bez --ga4 klient dostaje panel ze wszystkimi czterema zakladkami w stanie "wkrotce"
 * (mozna dopisac GA4 pozniej — patrz --pokaz / ponowne uruchomienie z tym samym --slug).
 *
 * Skrypt generuje losowy slug (~128 bit), sklada JSON i zapisuje go do KV przez wrangler.
 * Wymaga zalogowanego wrangler CLI (npx wrangler login).
 */
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/* Adres, pod ktorym stoi Worker. Strefa DNS skaluj.ai jest w lh.pl, nie w Cloudflare,
   wiec panel.skaluj.ai wymagalby przeniesienia strefy — na niej wisi dzialajaca strona
   i rekordy pocztowe Resend, wiec na razie zostajemy na workers.dev. */
const BASE_URL = "https://skaluj-panel.ni4324234fdsfd.workers.dev";

const argv = process.argv.slice(2);
if (!argv.length || argv[0].startsWith("--")) {
  console.error('Uzycie: node provision.mjs "Nazwa klienta" [--ga4 ID] [--gsc URL] [--dziala website,auto] [--dni 28] [--slug ISTNIEJACY]');
  process.exit(1);
}

const clientName = argv[0];
const flag = (name) => {
  const i = argv.indexOf("--" + name);
  return i > -1 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null;
};

const ga4 = flag("ga4");
const gsc = flag("gsc");
const dni = Number(flag("dni")) || 28;
const slug = flag("slug") || randomBytes(16).toString("base64url");

/* --- walidacja: lepiej odmowic teraz niz wyslac klientowi zepsuty panel --- */
if (ga4 && !/^\d{6,}$/.test(ga4.replace(/^properties\//, ""))) {
  console.error('Blad: --ga4 ma byc numerem uslugi GA4 (np. 123456789), nie identyfikatorem "G-XXXX".');
  process.exit(1);
}
if (gsc && !/^(https?:\/\/|sc-domain:)/.test(gsc)) {
  console.error('Blad: --gsc musi byc dokladnie tak, jak w Search Console: "https://klient.pl/" albo "sc-domain:klient.pl".');
  process.exit(1);
}
if (ga4 && !gsc) console.warn('Uwaga: brak --gsc, wiec karty z Search Console pokaza "—".');

/* --dziala: uslugi, ktore u klienta JUZ PRACUJA, ale nie podlaczylismy pomiaru.
   Reszta dostaje "offer" — panel z propozycja uruchomienia. Rozroznienie jest
   istotne: klientowi, ktory za usluge zaplacil, nie wolno proponowac jej zakupu. */
const dziala = new Set((flag("dziala") || "").split(",").map((s) => s.trim()).filter(Boolean));
const ZNANE = ["website", "auto", "mail", "chatbot"];
for (const k of dziala) {
  if (!ZNANE.includes(k)) {
    console.error('Blad: --dziala zna tylko: ' + ZNANE.join(", ") + ' (dostalem "' + k + '")');
    process.exit(1);
  }
}
const stan = (k) => (dziala.has(k) ? "pending" : "offer");

const config = {
  slug,
  clientName,
  panels: {
    website: ga4
      ? { status: "live", ga4PropertyId: ga4.replace(/^properties\//, ""), gscSiteUrl: gsc || null, dateRangeDays: dni }
      : { status: stan("website") },
    auto: { status: stan("auto") },
    mail: { status: stan("mail") },
    chatbot: { status: stan("chatbot") },
  },
};

const json = JSON.stringify(config);
console.log("\nKonfiguracja:\n" + JSON.stringify(config, null, 2) + "\n");

/* JSON idzie przez plik tymczasowy, nie przez argument wiersza polecen: w cmd.exe
   cudzyslowy wewnatrz argumentu rozpadaja sie i wrangler dostaje smieci. */
const tmp = join(tmpdir(), "panel-" + slug + ".json");
writeFileSync(tmp, json, "utf8");

/* shell:true jest wymagane — Node >=20 nie uruchamia plikow .cmd (npx.cmd) bez powloki.
   -y, bo inaczej npx pyta o zgode na instalacje wranglera i wisi bez terminala. */
const res = spawnSync(
  ["npx", "-y", "wrangler@latest", "kv", "key", "put", "--binding", "PANEL_CLIENTS",
   "--remote", JSON.stringify(slug), "--path", JSON.stringify(tmp)].join(" "),
  { stdio: "inherit", shell: true }
);

try { unlinkSync(tmp); } catch {}

if (res.error) console.error("\nNie udalo sie uruchomic wranglera:", res.error.message);
if (res.status !== 0) {
  console.error("\nZapis do KV nie powiodl sie. Sprawdz, czy jestes zalogowany (npx wrangler login)");
  console.error("i czy w wrangler.toml jest wypelnione id namespace PANEL_CLIENTS.");
  process.exit(res.status || 1);
}

console.log("\n=================================================");
console.log("Klient:  " + clientName);
console.log("Link:    " + BASE_URL + "/" + slug);
console.log("=================================================");
if (ga4) {
  console.log("\nZanim wyslesz link, klient musi nadac dostep Viewer kontu serwisowemu:");
  console.log("  - GA4:            Administracja -> Zarzadzanie dostepem do uslugi");
  console.log("  - Search Console: Ustawienia -> Uzytkownicy i uprawnienia");
}
