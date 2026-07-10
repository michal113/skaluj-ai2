# Formularz kontaktowy → Resend (Cloudflare Worker)

Strona jest statyczna (GitHub Pages), a klucz Resend musi być trzymany po stronie serwera.
Ten Worker jest cienkim mostem: formularz POST-uje do Workera, Worker woła Resend z sekretnym kluczem.

## Setup (raz, ~5 min)

### 1. Resend
1. Załóż konto na https://resend.com i wygeneruj **API key** (https://resend.com/api-keys).
2. (Zalecane) Zweryfikuj domenę `skaluj.ai` w Resend → wtedy możesz wysyłać z `formularz@skaluj.ai`.
   Zanim zweryfikujesz, Worker wysyła z `onboarding@resend.dev` (działa od razu, ląduje w Twojej skrzynce).

### 2. Deploy Workera
Z folderu `contact-worker/`:
```bash
npm i -g wrangler        # jeśli nie masz
wrangler login
wrangler secret put RESEND_API_KEY   # wklej klucz z Resend
wrangler deploy
```
Dostaniesz URL, np. `https://skaluj-kontakt.twoj-subdomena.workers.dev`.

> Alternatywa bez CLI: Cloudflare Dashboard → Workers & Pages → Create → wklej `worker.js`,
> w Settings → Variables dodaj `RESEND_API_KEY` (typ **Secret**) oraz opcjonalnie `TO_EMAIL`/`FROM_EMAIL`.

### 3. Podłącz URL w stronie
W plikach `index.html` i `kontakt.html` znajdź stałą:
```js
var FORM_ENDPOINT = "";   // <-- wklej tu URL Workera
```
Wklej URL z kroku 2 (w obu plikach). Commit + push. Gotowe.

## Po weryfikacji domeny
W dashboardzie Workera zmień `FROM_EMAIL` na `skaluj.ai <formularz@skaluj.ai>` — maile będą szły z Twojej domeny (lepsza dostarczalność).

## Bezpieczeństwo
- Klucz Resend nigdy nie trafia do przeglądarki (siedzi w sekrecie Workera).
- Honeypot (`_gotcha`) odsiewa proste boty.
- Limit załącznika: 8 MB.
