-- skaluj.ai CRM: zgloszenia z formularza (Make -> POST /api/lead).
-- Wgranie:  npx wrangler d1 execute skaluj-crm --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS leads (
  id             TEXT PRIMARY KEY,
  created_at     TEXT NOT NULL,                 -- kiedy zgloszenie trafilo do CRM (ISO, UTC)
  sent_at        TEXT,                          -- pole "wyslano" z formularza
  name           TEXT,
  email          TEXT,
  phone          TEXT,
  company        TEXT,
  service        TEXT,                          -- pole "svc" (strona, seo, automatyzacje...)
  message        TEXT,
  termin         TEXT,
  marketing      INTEGER NOT NULL DEFAULT 0,    -- 1 = zgoda na informacje handlowe
  marketing_text TEXT,                          -- tresc i wersja zgody (dowod)
  status         TEXT NOT NULL DEFAULT 'nowy',  -- nowy | kontakt | oferta | klient | przegrany
  value_pln      INTEGER,                       -- wartosc oferty / umowy
  note           TEXT,
  updated_at     TEXT NOT NULL                  -- ostatnia zmiana; od niej liczymy retencje
);

-- Make potrafi ponowic wywolanie: ten sam e-mail + ten sam znacznik "wyslano" = duplikat.
CREATE UNIQUE INDEX IF NOT EXISTS leads_dedupe ON leads (email, sent_at);
CREATE INDEX IF NOT EXISTS leads_created ON leads (created_at);
CREATE INDEX IF NOT EXISTS leads_status ON leads (status);

-- Strona: zbiorcze dzienne sumy odwiedzin (POST /api/hit z cookies.js). Bez cookies, bez IP i bez identyfikatorow.
-- entries = wejscia z zewnatrz albo bezposrednio (przyblizenie liczby wizyt); time_* = czas na podstronie.
CREATE TABLE IF NOT EXISTS site_daily (
  day      TEXT NOT NULL,
  path     TEXT NOT NULL,
  source   TEXT NOT NULL,
  device   TEXT NOT NULL,
  country  TEXT NOT NULL,
  views    INTEGER NOT NULL DEFAULT 0,
  entries  INTEGER NOT NULL DEFAULT 0,
  time_sum INTEGER NOT NULL DEFAULT 0,
  time_n   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, path, source, device, country)
);

-- Chatbot: zbiorcze dzienne liczniki zapisywane przez worker botszkalu. Bez tresci rozmow i bez IP.
CREATE TABLE IF NOT EXISTS chat_daily (
  day           TEXT PRIMARY KEY,
  conversations INTEGER NOT NULL DEFAULT 0,   -- pierwsza wiadomosc w rozmowie
  messages      INTEGER NOT NULL DEFAULT 0,
  booking       INTEGER NOT NULL DEFAULT 0,   -- odpowiedzi z propozycja umowienia konsultacji
  errors        INTEGER NOT NULL DEFAULT 0,   -- bot nie odpowiedzial (np. brak kredytow, awaria modeli)
  limited       INTEGER NOT NULL DEFAULT 0    -- odrzucone przez limit wiadomosci
);
