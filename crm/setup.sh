#!/usr/bin/env bash
# skaluj.ai CRM — jednorazowa konfiguracja i wdrozenie (macOS / Linux).
#
#   bash crm/setup.sh               # pierwsze uruchomienie albo aktualizacja kodu
#   bash crm/setup.sh --klucze      # zapytaj ponownie o wszystkie klucze do statystyk
#   bash crm/setup.sh --nowe-haslo  # wygeneruj nowe haslo do panelu
#
# Mozna uruchamiac wielokrotnie: istniejaca baza, zgloszenia i hasla zostaja.
# Hasla i klucze trafiaja prosto do Cloudflare (wrangler secret put) — nie do repo i nie do plikow.
set -euo pipefail
cd "$(dirname "$0")"

W="npx --yes wrangler@4"
DB_NAME="skaluj-crm"
ASK_ALL=0; NEW_PASS=0
for a in "$@"; do
  case "$a" in
    --klucze) ASK_ALL=1 ;;
    --nowe-haslo) NEW_PASS=1 ;;
    *) echo "Nieznana opcja: $a"; exit 1 ;;
  esac
done

step() { printf '\n\033[1;34m▸ %s\033[0m\n' "$1"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }
gen()  { openssl rand -base64 33 | tr -dc 'A-Za-z0-9' | cut -c1-32; }

command -v npx >/dev/null 2>&1 || { echo "Brak Node.js. Zainstaluj wersje LTS z https://nodejs.org i uruchom skrypt ponownie."; exit 1; }
command -v openssl >/dev/null 2>&1 || { echo "Brak openssl (potrzebny do wygenerowania hasla)."; exit 1; }

step "1/6 Logowanie do Cloudflare"
WHO="$($W whoami 2>&1 || true)"
if printf '%s' "$WHO" | grep -q "not authenticated"; then
  echo "  Otworzy sie przegladarka — zaloguj sie na konto Cloudflare, na ktorym stoi chatbot, i kliknij Allow."
  $W login
fi
ok "zalogowano"

step "2/6 Baza zgloszen (D1, dane tylko w UE)"
db_id() {
  $W d1 list --json 2>/dev/null | node -e '
    let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
      try { const db = JSON.parse(s.slice(s.indexOf("["))).find((d) => d.name === process.argv[1]); process.stdout.write(db ? db.uuid : ""); } catch {}
    });' "$DB_NAME"
}
ID="$(db_id || true)"
if [ -z "$ID" ]; then
  $W d1 create "$DB_NAME" --jurisdiction eu
  ID="$(db_id || true)"
fi
[ -n "$ID" ] || { echo "Nie udalo sie ustalic ID bazy $DB_NAME."; exit 1; }
if grep -q "WKLEJ_ID_BAZY_PO_UTWORZENIU" wrangler.toml; then
  sed -i.bak "s/WKLEJ_ID_BAZY_PO_UTWORZENIU/$ID/" wrangler.toml && rm -f wrangler.toml.bak
fi
ok "baza $DB_NAME ($ID)"

step "3/6 Tabela zgloszen"
$W d1 execute "$DB_NAME" --remote --yes --file=schema.sql >/dev/null
ok "gotowa (istniejace zgloszenia nie sa ruszane)"

step "4/6 Wdrozenie panelu"
DEPLOY_LOG="$($W deploy 2>&1)" || { echo "$DEPLOY_LOG"; echo "Wdrozenie nie powiodlo sie."; exit 1; }
URL="$(printf '%s' "$DEPLOY_LOG" | grep -Eo 'https://[a-z0-9.-]+\.workers\.dev' | head -1 || true)"
ok "wdrozono ${URL:-(adres znajdziesz w Cloudflare: Workers -> skaluj-crm)}"

EXISTING="$($W secret list --format json 2>/dev/null || echo '[]')"
has() { printf '%s' "$EXISTING" | grep -q "\"name\": *\"$1\""; }
put() { printf '%s' "$2" | $W secret put "$1" >/dev/null && ok "$1 zapisany"; }

step "5/6 Haslo do panelu i token dla Make"
PASS=""; TOKEN=""
if [ "$NEW_PASS" = 1 ] || ! has ADMIN_PASSWORD; then PASS="$(gen)"; put ADMIN_PASSWORD "$PASS"; else ok "haslo juz ustawione (nowe: --nowe-haslo)"; fi
if ! has INGEST_TOKEN; then TOKEN="$(gen)"; put INGEST_TOKEN "$TOKEN"; else ok "token dla Make juz ustawiony"; fi

step "6/6 Klucze do statystyk (Enter = pomin, mozesz dodac pozniej: bash crm/setup.sh --klucze)"
if [ ! -t 0 ]; then
  warn "brak terminala — pomijam pytania o klucze"
else
  ask() { # nazwa, opis, ukryj(1/0)
    if [ "$ASK_ALL" = 0 ] && has "$1"; then ok "$1 juz ustawiony"; return; fi
    local v=""
    if [ "$3" = 1 ]; then read -r -s -p "  $2: " v; echo; else read -r -p "  $2: " v; fi
    [ -n "$v" ] && put "$1" "$v" || true
  }
  ask MAKE_API_TOKEN "Token API Make (Profile -> API access, zakresy scenarios:read i organizations:read)" 1
  ask MAKE_SCENARIO_IDS "ID scenariusza formularza w Make (liczba z adresu .../scenarios/1234567/...)" 0
  ask MAKE_ORG_ID "ID organizacji w Make (liczba z adresu .../organization/123456/...)" 0
  ask OPENROUTER_MANAGEMENT_KEY "Klucz Management z OpenRouter (Settings -> Management Keys)" 1
  ask OPENROUTER_KEY_NAME "Nazwa klucza chatbota w OpenRouter (np. chatbot)" 0
  ask GA4_PROPERTY_ID "Numer uslugi GA4 skaluj.ai (sama liczba)" 0
  ask GSC_SITE_URL "Wlasciwosc Search Console (np. sc-domain:skaluj.ai)" 0
  if [ "$ASK_ALL" = 1 ] || ! has GOOGLE_SERVICE_ACCOUNT_KEY; then
    read -r -p "  Plik JSON konta serwisowego Google (przeciagnij plik tutaj): " f
    f="$(printf '%s' "$f" | sed -e "s/^[\"']//" -e "s/[\"'] *$//" -e 's/\\ / /g' -e 's/ *$//')"
    if [ -n "$f" ] && [ -f "$f" ]; then $W secret put GOOGLE_SERVICE_ACCOUNT_KEY < "$f" >/dev/null && ok "GOOGLE_SERVICE_ACCOUNT_KEY zapisany"
    elif [ -n "$f" ]; then warn "nie ma takiego pliku: $f"; fi
  else ok "GOOGLE_SERVICE_ACCOUNT_KEY juz ustawiony"; fi
fi

printf '\n\033[1m================ GOTOWE ================\033[0m\n'
echo "Panel:  ${URL:-https://skaluj-crm.<twoja-subdomena>.workers.dev}"
echo "Login:  dowolna nazwa (np. admin) + haslo"
if [ -n "$PASS" ]; then
  echo "Haslo:  $PASS"
  command -v pbcopy >/dev/null 2>&1 && printf '%s' "$PASS" | pbcopy && echo "        (skopiowane do schowka)"
  echo "        Zapisz je w menedzerze hasel — skrypt nie pokaze go ponownie."
fi
if [ -n "$TOKEN" ]; then
  echo
  echo "Make: w scenariuszu formularza dodaj modul HTTP -> Make a request:"
  echo "  URL:     ${URL:-https://skaluj-crm.<twoja-subdomena>.workers.dev}/api/lead"
  echo "  Method:  POST"
  echo "  Header:  Authorization = Bearer $TOKEN"
  echo "  Body:    application/x-www-form-urlencoded, pola z webhooka 1:1"
  echo "           (name, email, company, phone, message, svc, termin, marketing, marketing_tresc, wyslano, _gotcha)"
fi
echo
