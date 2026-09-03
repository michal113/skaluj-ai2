# Panel wyników klienta

Prywatny panel z realnymi danymi, wysyłany klientowi po wdrożeniu. Osobny Cloudflare
Worker — strona `skaluj.ai` (statyczny HTML na GitHub Pages) pozostaje nietknięta.

**Zasada nadrzędna: nigdy nie renderujemy zmyślonej ani zastępczej liczby.**
Brak danych to `—`, nie `0`. Zero czyta się jak prawdziwy zły wynik.

Cztery zakładki są widoczne od razu; te bez podłączonego źródła pokazują nazwy
przyszłych metryk, myślnik zamiast liczby i CTA do kontaktu. Realne dane ma dziś
tylko **Strona + SEO** (GA4 + Search Console).

## Stan wdrożenia (3 września 2026)

Worker działa. Konfiguracja jednorazowa jest **zrobiona** — poniższą sekcję „Konfiguracja
jednorazowa" zostawiamy jako dokumentację, nie jako listę zadań.

| | |
|---|---|
| Adres | `https://skaluj-panel.ni4324234fdsfd.workers.dev` |
| Konto serwisowe | `panel-reader@skaluj-panel.iam.gserviceaccount.com` |
| Projekt GCP | `skaluj-panel`, oba API włączone |
| Namespace KV | `896bbe772c8548d1a3c7653381aa0e06` (wpisany w `wrangler.toml`) |
| Sekret | `GOOGLE_SERVICE_ACCOUNT_KEY` wgrany, podpis RS256 zweryfikowany na żywym API Google |

**Własna domena odpada w v1.** Strefa DNS `skaluj.ai` jest w lh.pl (`ns.lh.pl`,
`ns2.lighthosting.net`), nie w Cloudflare, a custom domain w Workers tego wymaga.
Przeniesienie strefy oznaczałoby ruszanie DNS-ów, na których wisi działająca strona
i rekordy pocztowe Resend od formularza kontaktowego — nie warto tego ryzyka dla
ładniejszego adresu. Link i tak trafia do klienta mailem.

## Pliki

| Plik | Rola |
|---|---|
| `worker.js` | routing `/<slug>`, odczyt KV, cache, nagłówki prywatności |
| `google.js` | JWT konta serwisowego → token → GA4 Data API + Search Console API |
| `render.js` | budowa HTML, formatowanie pl-PL, trendy, stany „wkrótce" i błędu |
| `styles.js` | CSS (język wizualny `.pa-*` wspólny ze stroną główną) |
| `provision.mjs` | dodanie klienta: slug + zapis JSON do KV |

## Konfiguracja jednorazowa

### 1. Konto serwisowe Google

W [Google Cloud Console](https://console.cloud.google.com/):

1. Utwórz projekt (albo użyj istniejącego).
2. Włącz **Google Analytics Data API** oraz **Google Search Console API**.
3. IAM → Konta serwisowe → utwórz konto, np. `skaluj-panel-reader`.
4. Klucze → dodaj klucz → **JSON** → pobierz plik.
5. Zapisz adres e-mail konta (`...@....iam.gserviceaccount.com`) — będziesz go
   podawać każdemu klientowi.

Konto serwisowe nie potrzebuje żadnych ról w samym projekcie GCP. Dostęp nadaje
klient po swojej stronie (patrz „Dodanie klienta").

### 2. Namespace KV

```bash
npx wrangler kv namespace create PANEL_CLIENTS
```

Wygenerowane `id` wklej do `wrangler.toml` w miejsce `WKLEJ_ID_NAMESPACE_PO_UTWORZENIU`.

### 3. Sekret

```bash
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_KEY
```

Wklej **całą** zawartość pobranego pliku JSON (jedna wartość, wieloliniowa).

### 4. Wdrożenie

```bash
npx wrangler deploy
```

Worker działa pod adresem `*.workers.dev`. Podpięcie `panel.skaluj.ai` wymaga, żeby
strefa DNS `skaluj.ai` była w Cloudflare — jeśli jest, dodaj custom domain w ustawieniach
Workera. Jeśli nie, adres `workers.dev` działa identycznie, tylko wygląda gorzej.

## Dodanie klienta

```bash
node provision.mjs "Nazwa klienta" --ga4 123456789 --gsc https://klient.pl/
```

- `--ga4` — **numer usługi** GA4 (Administracja → Ustawienia usługi), np. `123456789`.
  To nie jest identyfikator `G-XXXXXXX`.
- `--gsc` — adres witryny **dokładnie tak, jak w Search Console**: `https://klient.pl/`
  (z ukośnikiem) albo `sc-domain:klient.pl` dla właściwości domenowej.
- `--dni` — długość okresu, domyślnie 28.

Bez `--ga4` klient dostaje panel ze wszystkimi zakładkami w stanie „wkrótce” — sensowne,
gdy chcesz wysłać link przed nadaniem dostępów. Później uruchom to samo polecenie
z `--slug <istniejący>`, żeby nadpisać wpis bez zmiany linku.

Skrypt wypisze gotowy link. **Zanim go wyślesz**, klient musi nadać kontu serwisowemu
dostęp „Czytelnik” / Viewer:

- **GA4**: Administracja → Zarządzanie dostępem do usługi → dodaj e-mail konta serwisowego.
- **Search Console**: Ustawienia → Użytkownicy i uprawnienia → dodaj ten sam e-mail.

To wszystko po stronie klienta — bez ekranu zgody OAuth, bez haseł, bez odświeżania tokenów.

### Zmiana lub odwołanie linku

```bash
npx wrangler kv key delete --binding PANEL_CLIENTS --remote <slug>
```

Potem `provision.mjs` bez `--slug` wygeneruje nowy adres.

## Jak to działa

- **Slug** to losowe ~128 bitów (base64url), nigdy nazwa klienta. Slug jest kluczem KV;
  nieznany slug dostaje generyczne 404, nieodróżnialne od „prawie trafionego”.
- **Dostęp**: prywatny link bez logowania — poziom „link jak do Calendly”. Chroni przed
  zgadywaniem i indeksacją, nie przed kimś, komu link przekazano dalej. Każda odpowiedź
  ma `Cache-Control: private, no-store` i `X-Robots-Tag: noindex`, a `/robots.txt`
  zabrania całości.
- **Cache**: pobrane dane leżą w KV przez 6 h (`cache:<slug>:<dni>`), żeby wejścia klienta
  nie biły w limity API Google. Błędów nie cache'ujemy — kolejne wejście ponawia próbę.
  `?odswiez=1` wymusza pobranie na świeżo.
- **Częściowe dane**: GA4 i Search Console pobierane są niezależnie (`Promise.allSettled`).
  Gdy klient nadał dostęp tylko do jednego, drugie pokaże `—` zamiast wywalić stronę.
  Dopiero brak GA4 przełącza panel w stan błędu — też bez żadnych liczb.
- **Search Console** raportuje z 2–3-dniowym opóźnieniem, więc jego okno jest przesunięte
  o 3 dni względem GA4. Jest to napisane wprost pod panelem.

## Podgląd lokalny bez Cloudflare i Google

`render.js` nie zależy od środowiska Workers — można go zaimportować w Node i zapisać
HTML do pliku, podstawiając atrapę danych w kształcie zwracanym przez `google.js`.
Przydatne przy zmianach w wyglądzie: sprawdza stan z danymi, stan „wkrótce”, stan błędu
i 404 bez dotykania czyichkolwiek prawdziwych danych.

## Poza zakresem v1

Zakładki Automatyzacja / Mailing / Chatbot czekają na źródło danych (logi z Make.com,
ESP, backend bota). Świadomie nie budujemy pod nie abstrakcji, zanim nie wiadomo, jak
te zdarzenia wyglądają. Poza zakresem też: logowanie, konta, panel administracyjny,
samoobsługowa aktywacja zakładek.
