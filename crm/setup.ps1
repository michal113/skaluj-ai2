# skaluj.ai CRM - jednorazowa konfiguracja i wdrozenie (Windows PowerShell).
#
#   powershell -ExecutionPolicy Bypass -File crm\setup.ps1              # pierwsze uruchomienie albo aktualizacja kodu
#   powershell -ExecutionPolicy Bypass -File crm\setup.ps1 -Klucze      # zapytaj ponownie o wszystkie klucze do statystyk
#   powershell -ExecutionPolicy Bypass -File crm\setup.ps1 -NoweHaslo   # wygeneruj nowe haslo do panelu
#
# Mozna uruchamiac wielokrotnie: istniejaca baza, zgloszenia i hasla zostaja.
# Hasla i klucze trafiaja prosto do Cloudflare - nie do repo. Ten sam skrypt dla macOS/Linux: crm/setup.sh
param([switch]$Klucze, [switch]$NoweHaslo)

$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot
$DbName = "skaluj-crm"

function Step($t) { Write-Host ""; Write-Host "> $t" -ForegroundColor Cyan }
function Ok($t)   { Write-Host "  OK  $t" -ForegroundColor Green }
function Warn($t) { Write-Host "  !   $t" -ForegroundColor Yellow }
function Fail($t) { Write-Host ""; Write-Host "BLAD: $t" -ForegroundColor Red; exit 1 }

# npx.cmd, a nie npx.ps1: przy domyslnych zasadach wykonywania skryptow npx.ps1 bywa blokowany
$npx = Get-Command npx.cmd -ErrorAction SilentlyContinue
if (-not $npx) { $npx = Get-Command npx -ErrorAction SilentlyContinue }
if (-not $npx) { Fail "Brak Node.js. Zainstaluj wersje LTS (https://nodejs.org albo: winget install OpenJS.NodeJS.LTS), otworz NOWE okno PowerShell i uruchom skrypt ponownie." }
$npx = $npx.Source

function Wr { & $npx --yes wrangler@4 @args }
function WrText { (& $npx --yes wrangler@4 @args 2>&1 | Out-String) }

function New-Secret {
  $b = New-Object byte[] 48
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  ([Convert]::ToBase64String($b) -replace '[^A-Za-z0-9]', '').Substring(0, 32)
}

function Get-DbId {
  $raw = (& $npx --yes wrangler@4 d1 list --json 2>$null | Out-String)
  $i = $raw.IndexOf("[")
  if ($i -lt 0) { return "" }
  try { $list = $raw.Substring($i) | ConvertFrom-Json } catch { return "" }
  foreach ($d in @($list)) { if ($d.name -eq $DbName) { return $d.uuid } }
  return ""
}

Step "1/6 Logowanie do Cloudflare"
Write-Host "  Pobieram narzedzie Cloudflare (wrangler) - za pierwszym razem trwa to 1-3 minuty..."
Wr --version
if ((WrText whoami) -match "not authenticated") {
  Write-Host "  Otworzy sie przegladarka - zaloguj sie na konto Cloudflare, na ktorym stoi chatbot, i kliknij Allow."
  Wr login
  if ($LASTEXITCODE -ne 0) { Fail "logowanie nie powiodlo sie" }
}
Ok "zalogowano"

# Kilka kont pod jednym loginem: bez wskazania konta wrangler przerywa w trybie bez pytan.
$who = WrText whoami
$ids = @([regex]::Matches($who, '[0-9a-f]{32}') | ForEach-Object { $_.Value } | Select-Object -Unique)
if (-not $env:CLOUDFLARE_ACCOUNT_ID -and $ids.Count -gt 1) {
  Write-Host "  Masz kilka kont Cloudflare:"
  $lines = $who -split "`n"
  for ($k = 0; $k -lt $ids.Count; $k++) {
    $line = @($lines | Where-Object { $_ -match $ids[$k] })[0]
    $name = (($line -replace $ids[$k], '') -replace '[^\p{L}\p{N} ._''@()-]', ' ').Trim() -replace '\s{2,}', ' '
    Write-Host ("   [{0}] {1}  ({2})" -f ($k + 1), $name, $ids[$k])
  }
  $c = Read-Host "  Numer konta, na ktorym ma stac CRM (to samo, na ktorym jest chatbot botszkalu)"
  $n = 0
  if (-not [int]::TryParse($c, [ref]$n) -or $n -lt 1 -or $n -gt $ids.Count) { Fail "nieprawidlowy numer konta" }
  $env:CLOUDFLARE_ACCOUNT_ID = $ids[$n - 1]
  Ok "konto $($ids[$n - 1])"
}

Step "2/6 Baza zgloszen (D1, dane tylko w UE)"
$id = Get-DbId
if (-not $id) {
  Wr d1 create $DbName --jurisdiction eu
  $id = Get-DbId
}
if (-not $id) { Fail "nie udalo sie ustalic ID bazy $DbName" }
$tomlPath = Join-Path $PSScriptRoot "wrangler.toml"
$toml = [IO.File]::ReadAllText($tomlPath)
# zawsze ID bazy z AKTUALNEGO konta (np. po przelogowaniu na inne konto); zapis bez BOM - inaczej wrangler nie przeczyta pliku
$newToml = [regex]::Replace($toml, '(?m)^database_id = "[^"]*"', ('database_id = "' + $id + '"'))
if ($newToml -ne $toml) { [IO.File]::WriteAllText($tomlPath, $newToml, (New-Object Text.UTF8Encoding $false)) }
Ok "baza $DbName ($id)"

Step "3/6 Tabela zgloszen"
$null = WrText d1 execute $DbName --remote --yes --file=schema.sql
if ($LASTEXITCODE -ne 0) { Fail "nie udalo sie utworzyc tabeli" }
Ok "gotowa (istniejace zgloszenia nie sa ruszane)"

Step "4/6 Wdrozenie panelu"
$deployLog = WrText deploy
if ($LASTEXITCODE -ne 0) { Write-Host $deployLog; Fail "wdrozenie nie powiodlo sie" }
$url = ""
if ($deployLog -match "https://[a-z0-9.-]+\.workers\.dev") { $url = $Matches[0] }
if ($url) { Ok "wdrozono $url" } else { Ok "wdrozono (adres znajdziesz w Cloudflare: Workers -> skaluj-crm)" }

$existing = @()
$rawSecrets = (& $npx --yes wrangler@4 secret list --format json 2>$null | Out-String)
$j = $rawSecrets.IndexOf("[")
if ($j -ge 0) { try { $existing = @($rawSecrets.Substring($j) | ConvertFrom-Json | ForEach-Object { $_.name }) } catch {} }
function Has($n) { return ($existing -contains $n) }

$secrets = @{}
Step "5/6 Haslo do panelu i token dla Make"
$pass = ""; $token = ""
if ($NoweHaslo -or -not (Has "ADMIN_PASSWORD")) { $pass = New-Secret; $secrets["ADMIN_PASSWORD"] = $pass } else { Ok "haslo juz ustawione (nowe: -NoweHaslo)" }
if (-not (Has "INGEST_TOKEN")) { $token = New-Secret; $secrets["INGEST_TOKEN"] = $token } else { Ok "token dla Make juz ustawiony" }

Step "6/6 Klucze do statystyk (Enter = pomin, mozesz dodac pozniej z opcja -Klucze)"
function Ask($name, $label, $hidden) {
  if (-not $Klucze -and (Has $name)) { Ok "$name juz ustawiony"; return }
  if ($hidden) {
    $s = Read-Host -AsSecureString "  $label"
    $v = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
  } else {
    $v = Read-Host "  $label"
  }
  if ($v -and $v.Trim()) { $script:secrets[$name] = $v.Trim() }
}
Ask "MAKE_API_TOKEN" "Token API Make (Profile -> API access, zakresy scenarios:read i organizations:read)" $true
Ask "MAKE_SCENARIO_IDS" "ID scenariusza formularza w Make (liczba z adresu .../scenarios/1234567/...)" $false
Ask "MAKE_ORG_ID" "ID organizacji w Make (liczba z adresu .../organization/123456/...)" $false
Ask "OPENROUTER_MANAGEMENT_KEY" "Klucz Management z OpenRouter (Settings -> Management Keys)" $true
Ask "OPENROUTER_KEY_NAME" "Nazwa klucza chatbota w OpenRouter (np. chatbot)" $false
Ask "GA4_PROPERTY_ID" "Numer uslugi GA4 skaluj.ai (sama liczba)" $false
Ask "GSC_SITE_URL" "Wlasciwosc Search Console (np. sc-domain:skaluj.ai)" $false
if ($Klucze -or -not (Has "GOOGLE_SERVICE_ACCOUNT_KEY")) {
  $f = Read-Host "  Plik JSON konta serwisowego Google (przeciagnij plik tutaj)"
  $f = $f.Trim().Trim('"').Trim("'")
  if ($f -and (Test-Path -LiteralPath $f)) { $secrets["GOOGLE_SERVICE_ACCOUNT_KEY"] = [IO.File]::ReadAllText($f) }
  elseif ($f) { Warn "nie ma takiego pliku: $f" }
} else { Ok "GOOGLE_SERVICE_ACCOUNT_KEY juz ustawiony" }

if ($secrets.Count -gt 0) {
  # jeden plik tymczasowy zamiast potoku: Windows PowerShell potrafi dokleic BOM do tekstu przekazanego potokiem
  $tmp = Join-Path ([IO.Path]::GetTempPath()) ("skaluj-crm-" + [Guid]::NewGuid().ToString() + ".json")
  try {
    [IO.File]::WriteAllText($tmp, ($secrets | ConvertTo-Json -Compress), (New-Object Text.UTF8Encoding $false))
    $out = WrText secret bulk $tmp
    if ($LASTEXITCODE -ne 0) { Write-Host $out; Fail "nie udalo sie zapisac sekretow" }
  } finally {
    Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
  }
  foreach ($k in $secrets.Keys) { Ok "$k zapisany" }
}

$base = $url
if (-not $base) { $base = "https://skaluj-crm.<twoja-subdomena>.workers.dev" }
Write-Host ""
Write-Host "================ GOTOWE ================" -ForegroundColor White
Write-Host "Panel:  $base"
Write-Host "Login:  dowolna nazwa (np. admin) + haslo"
if ($pass) {
  Write-Host "Haslo:  $pass"
  try { Set-Clipboard -Value $pass; Write-Host "        (skopiowane do schowka)" } catch {}
  Write-Host "        Zapisz je w menedzerze hasel - skrypt nie pokaze go ponownie."
}
if ($token) {
  Write-Host ""
  Write-Host "Make: w scenariuszu formularza dodaj modul HTTP -> Make a request:"
  Write-Host "  URL:     $base/api/lead"
  Write-Host "  Method:  POST"
  Write-Host "  Header:  Authorization = Bearer $token"
  Write-Host "  Body:    application/x-www-form-urlencoded, pola z webhooka 1:1"
  Write-Host "           (name, email, company, phone, message, svc, termin, marketing, marketing_tresc, wyslano, _gotcha)"
}
if ($url) { try { Start-Process $url } catch {} }
Write-Host ""
