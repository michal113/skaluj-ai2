# CRM i statystyki skaluj.ai

Prywatny panel w jednym miejscu:

| Sekcja | Skąd dane |
|---|---|
| **Zgłoszenia (CRM)** | formularz na stronie → Make → `POST /api/lead` → baza D1 (w UE) |
| **Strona** | własny licznik odwiedzin bez cookies (`cookies.js` → `POST /api/hit` → baza D1); opcjonalnie Search Console i GA4 |
| **Automatyzacje** | Make API: uruchomienia, błędy, operacje, limit planu |
| **Chatbot** | dzienne liczniki z workera chatbota (rozmowy, wiadomości, propozycje konsultacji, awarie); opcjonalnie koszty z OpenRouter |

W CRM każde zgłoszenie ma status (Nowy → W kontakcie → Oferta wysłana → Klient / Przegrany), wartość w zł i notatkę. Jest też eksport CSV i przycisk usuwania (gdy ktoś poprosi o usunięcie danych).

Osobny Cloudflare Worker (`skaluj-crm`), bez wpływu na stronę. Działa na darmowych limitach Workers i D1.

**Bezpieczeństwo w skrócie**
- Hasło (HTTP Basic) jest sekretem w Cloudflare. Po 10 błędnych próbach na minutę z jednego IP panel blokuje dalsze logowanie.
- Zmiany przyjmowane są tylko z samego panelu (ochrona CSRF).
- Panel nie ma JavaScriptu, a CSP blokuje skrypty, więc treść ze zgłoszenia nie może niczego uruchomić.
- Ma ustawione `noindex` i `no-store`.
- Eksport CSV neutralizuje formuły Excela.
- Make wysyła zgłoszenia z osobnym tokenem, a zgłoszenia z wypełnionym `_gotcha` (boty) są odrzucane.
- **Retencja**: codziennie o 3:17 UTC panel usuwa zgłoszenia bez współpracy i bez zgody marketingowej, nieruszane od 12 miesięcy. Tak obiecuje polityka prywatności. Klientów i osób ze zgodą marketingową nie usuwa automatycznie.

## Najszybciej: jeden skrypt (ok. 5 minut)

**Windows** — otwórz **PowerShell** i wklej po kolei (każdą linię osobno):

```powershell
git clone https://github.com/michal113/skaluj-ai2.git "$HOME\skaluj-ai2"
cd "$HOME\skaluj-ai2"
powershell -ExecutionPolicy Bypass -File crm\setup.ps1
```

**Mac / Linux** — otwórz **Terminal** i wklej:

```bash
git clone https://github.com/michal113/skaluj-ai2.git ~/skaluj-ai2   # pomiń, jeśli masz już repo
cd ~/skaluj-ai2 && git pull && bash crm/setup.sh
```

Skrypt sam:
- zaloguje Cię do Cloudflare (przeglądarka → Allow);
- założy bazę w UE i tabelę;
- wdroży panel;
- wygeneruje hasło i token dla Make;
- zapyta o klucze do statystyk. Na każde pytanie możesz nacisnąć Enter i dodać klucz później przez `bash crm/setup.sh --klucze`.

Na końcu wypisze **adres panelu, hasło** (skopiowane do schowka) i gotowe ustawienia modułu HTTP do Make. Hasło zapisz w menedżerze haseł. Na Windows panel sam otworzy się w przeglądarce.

Skrypt możesz uruchamiać wielokrotnie, np. po aktualizacji kodu. Baza i zgłoszenia zostają, a hasło zmienisz flagą `--nowe-haslo`. Potrzebny jest Node.js (wersja LTS z nodejs.org).

Poniżej te same kroki ręcznie, gdybyś wolał bez skryptu. Komendy uruchamiaj w folderze `crm/`, zalogowany na konto Cloudflare (`npx wrangler login`).
**Sekrety wpisujesz tylko w terminalu po `secret put`.** Nigdy nie wklejaj ich do plików ani do czatu.

---

## 1. Baza danych (dane tylko w UE)

```bash
npx wrangler d1 create skaluj-crm --jurisdiction eu
```

Skopiuj `database_id` z wyniku do `wrangler.toml`, w miejsce `WKLEJ_ID_BAZY_PO_UTWORZENIU`. Potem utwórz tabelę:

```bash
npx wrangler d1 execute skaluj-crm --remote --file=schema.sql
```

## 2. Hasło i token dla Make

Wygeneruj dwa losowe ciągi, np. `openssl rand -base64 24` (dwa razy), i zapisz oba w menedżerze haseł.

```bash
npx wrangler secret put ADMIN_PASSWORD   # hasło do panelu
npx wrangler secret put INGEST_TOKEN     # token, którym Make wysyła zgłoszenia
```

## 3. Wdrożenie

```bash
npx wrangler deploy
```

Adres panelu to `https://skaluj-crm.<twoja-subdomena>.workers.dev`. Przy logowaniu nazwa użytkownika może być dowolna, liczy się tylko hasło.

## 4. Make → CRM (zgłoszenia)

W scenariuszu formularza, po module webhooka, dodaj moduł **HTTP → Make a request**:

- **URL:** `https://skaluj-crm.<twoja-subdomena>.workers.dev/api/lead`
- **Method:** POST
- **Headers:** `Authorization` = `Bearer <INGEST_TOKEN>` (ten sam co w kroku 2)
- **Body content type:** `application/x-www-form-urlencoded`
- **Fields:** przypisz pola z webhooka 1:1. Nazwy pól to `name`, `email`, `company`, `phone`, `message`, `svc`, `termin`, `marketing`, `marketing_tresc`, `wyslano`, `_gotcha`.

Wyślij testowe zgłoszenie z formularza. W panelu powinno pojawić się w sekcji „Zgłoszenia”. Duplikaty są pomijane: Make może ponowić wysyłkę, a ten sam e-mail z tym samym czasem `wyslano` zapisze się tylko raz.

## 5. Statystyki Make

1. W Make: avatar → **Profile → API access → Add token**. Zaznacz zakresy `scenarios:read` i `organizations:read`.
   ```bash
   npx wrangler secret put MAKE_API_TOKEN
   ```
2. W Cloudflare (Worker → Settings → Variables) dodaj zmienne:
   - `MAKE_SCENARIO_IDS` — ID scenariusza z adresu w Make (`…/scenarios/1234567/edit`). Kilka ID oddziel przecinkami.
   - `MAKE_ORG_ID` — ID organizacji z adresu (`…/organization/123456/…`).
   - `MAKE_ZONE` — domyślnie `eu1.make.com`, zgodnie z adresem webhooka.

## 6. Statystyki chatbota (OpenRouter)

1. Na openrouter.ai: **Settings → Management Keys** (dawniej „Provisioning Keys”) → utwórz klucz. Ten klucz służy tylko do odczytu statystyk i zarządzania kluczami. Czatu nim nie obsłużysz, więc nie wpisuj go do workera chatbota.
   ```bash
   npx wrangler secret put OPENROUTER_MANAGEMENT_KEY
   ```
2. W **Keys** nadaj kluczowi chatbota nazwę, np. `chatbot`. W zmiennych workera ustaw `OPENROUTER_KEY_NAME = chatbot`. Wtedy panel pokaże tylko ruch chatbota. Bez tej zmiennej pokaże całe konto.

OpenRouter udostępnia historię z ostatnich 30 pełnych dni, więc przy okresie „90 dni” sekcja chatbota pokazuje 30.

## 7. Statystyki strony (GA4 + Search Console)

Używamy tego samego konta serwisowego co panel klienta: `panel-reader@skaluj-panel.iam.gserviceaccount.com`.

1. **Klucz konta serwisowego:**
   ```bash
   npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_KEY
   ```
   Wklej cały plik JSON. Jeśli go nie masz, utwórz nowy klucz: Google Cloud → IAM → Konta serwisowe → `panel-reader` → Klucze → Dodaj klucz → JSON. Plik usuń z dysku po wgraniu.
2. **GA4:**
   - na analytics.google.com utwórz usługę dla skaluj.ai i strumień danych „Sieć”;
   - identyfikator pomiaru `G-XXXXXXXXXX` wpisz w `cookies.js` w linii `var GA4_ID = "";`. To jawny identyfikator, nie sekret. GA4 ładuje się tylko u osób, które zgodzą się na analitykę;
   - w Administracji ustaw **Przechowywanie danych → 14 miesięcy** i wyłącz **Google Signals**. Tak opisuje to polityka prywatności;
   - w **Zarządzaniu dostępem do usługi** dodaj e-mail konta serwisowego z rolą „Wyświetlający”;
   - numer usługi (Ustawienia usługi, sama liczba) wpisz w zmienną `GA4_PROPERTY_ID`.
3. **Search Console:**
   - w Ustawieniach → Użytkownicy i uprawnienia dodaj ten sam e-mail z uprawnieniem „Ograniczone”;
   - w zmiennej `GSC_SITE_URL` wpisz właściwość dokładnie tak, jak w Search Console: `sc-domain:skaluj.ai` albo `https://skaluj.ai/`.

---

## Klucze do statystyk bez terminala

Własne statystyki strony i chatbota działają od razu, bez kluczy. Klucze są potrzebne tylko do Make (obowiązkowo dla sekcji Automatyzacje) i do dodatków: kosztów z OpenRouter, Search Console i GA4.

Najprościej dodać je jako **sekrety repo w GitHubie** (Settings → Secrets and variables → Actions → New repository secret). Automat wdrożenia sam przeniesie każdy z nich do CRM przy najbliższym wdrożeniu, czyli po pushu na `main` albo po ręcznym **Actions → Wdrozenie workerow → Run workflow**:

| Sekret | Skąd |
|---|---|
| `MAKE_API_TOKEN` | Make → Profile → API access → Add token (zakresy `scenarios:read`, `organizations:read`) |
| `MAKE_SCENARIO_IDS` | liczba z adresu scenariusza w Make (`…/scenarios/1234567/…`), kilka po przecinku |
| `MAKE_ORG_ID` | liczba z adresu organizacji w Make (`…/organization/123456/…`) |
| `OPENROUTER_MANAGEMENT_KEY` | OpenRouter → Settings → Management Keys |
| `OPENROUTER_KEY_NAME` | nazwa klucza chatbota w OpenRouter (np. `chatbot`) |
| `GSC_SITE_URL` | `sc-domain:skaluj.ai` |
| `GA4_PROPERTY_ID` | numer usługi GA4 (sama liczba) |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | cały plik JSON konta serwisowego (potrzebny do GSC i GA4) |

Możesz je też wpisać ręcznie w Cloudflare (Workers & Pages → skaluj-crm → Settings → Variables and Secrets). Automat nie rusza kluczy, których nie ma w GitHubie.

**Licznik odwiedzin** (`cookies.js`) nie używa cookies ani identyfikatorów. Wysyła podstronę, domenę strony odsyłającej, `utm_source` i czas na podstronie. Zapisywane są wyłącznie sumy dzienne, bez IP i bez User-Agenta. Przeglądarki z GPC/DNT, boty i przeglądarki automatyczne nie są liczone. Szczegóły w `hits.js` i w polityce prywatności.

## Codzienna praca

- **Okres** przełączasz u góry (7 / 30 / 90 dni). Dane pobierane są na żywo przy każdym wejściu.
- **Zgłoszenie** kliknij, żeby zobaczyć szczegóły. Możesz tam zmienić status, wpisać wartość i notatkę, potem „Zapisz”.
- **Prośba o usunięcie danych:** otwórz zgłoszenie, zaznacz potwierdzenie i kliknij „Usuń”. Pamiętaj, żeby usunąć też maile w skrzynce.
- **Prośba o kopię danych:** „Eksport CSV” i wyślij tej osobie tylko jej wiersz.
- **Kopia zapasowa:** raz w miesiącu „Eksport CSV” do bezpiecznego folderu. Możesz też zrobić pełny zrzut bazy:
  ```bash
  npx wrangler d1 export skaluj-crm --remote --output=kopia.sql
  ```
  Taki plik ma dane osobowe, więc nie wrzucaj go do repo.
- **Marketing** wysyłaj tylko do osób z „zgoda: …” w polu Marketing.

## Aktualizacje przez inne osoby (automatyczne wdrażanie)

Po jednorazowej konfiguracji każdy, kto ma prawo pushowania do repo, aktualizuje panel i chatbota zwykłym pushem na `main`. GitHub Actions (`.github/workflows/deploy-workers.yml`) sam wdraża zmiany z `crm/` i `worker/` na Cloudflare. Nikt nie musi odpalać skryptu u siebie ani logować się do Cloudflare.

Jednorazowo, robi to **właściciel repo** (michal113):
1. Cloudflare → My Profile → API Tokens → Create Token → szablon **Edit Cloudflare Workers**. Dodaj uprawnienie **Account → D1 → Edit** i w „Account Resources” zostaw tylko konto z chatbotem.
2. GitHub → repo → Settings → Secrets and variables → Actions → New repository secret:
   - `CLOUDFLARE_API_TOKEN`: token z punktu 1,
   - `CLOUDFLARE_ACCOUNT_ID`: ID konta (Cloudflare → Workers & Pages, prawa kolumna).

Bez tych sekretów workflow kończy się bez błędu i niczego nie wdraża. Hasło do panelu i klucze API zostają w Cloudflare, więc wdrożenie ich nie rusza. Baza i zgłoszenia też zostają.

Druga osoba może też wdrażać sama ze swojego komputera. Wtedy zaproś ją do konta Cloudflare (Manage Account → Members), a ona uruchamia `crm/setup.ps1` albo `crm/setup.sh`. Skrypt znajdzie istniejącą bazę i nie zmieni hasła.

**RODO:** kto ma dostęp do konta Cloudflare albo do tokenu, może odczytać zgłoszenia z bazy. Dawaj go tylko zaufanym osobom. Współpracownikowi daj pisemne upoważnienie do przetwarzania danych (art. 29 RODO), a z firmą zewnętrzną podpisz umowę powierzenia.

## Zmiana hasła lub tokenu

Uruchom skrypt z `-NoweHaslo` / `-NowyToken` (Windows) albo `--nowe-haslo` / `--nowy-token` (Mac/Linux). Po zmianie tokenu zaktualizuj nagłówek w module HTTP w Make.

## Pliki

| Plik | Rola |
|---|---|
| `worker.js` | trasy, logowanie, CSRF, przyjmowanie zgłoszeń, edycja, CSV, retencja (cron) |
| `sources.js` | statystyki: D1, GA4/GSC (`../panel/google.js`), Make API, OpenRouter API |
| `render.js` | HTML i CSS panelu, bez JavaScriptu |
| `schema.sql` | tabele `leads`, `site_daily` (odwiedziny), `chat_daily` (liczniki czatu) |
| `hits.js` | licznik odwiedzin `POST /api/hit`: normalizacja ścieżek, źródła, urządzenia, ochrona przed spamem |
| `setup.sh` / `setup.ps1` | konfiguracja i wdrożenie jednym poleceniem (Mac/Linux / Windows) |
