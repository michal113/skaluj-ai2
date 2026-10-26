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
