# Minimalny serwer statyczny do podglądu (bez zależności zewnętrznych)
# Port: z env PORT (autoPort podglądu), fallback 4173 przy ręcznym odpaleniu
$port = if ($env:PORT) { [int]$env:PORT } else { 4173 }
$root = "D:\skaluj-ai"

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".ico"  = "image/x-icon"
  ".woff2" = "font/woff2"
  ".mp4"  = "video/mp4"
  ".webm" = "video/webm"
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
$listener.Start()
Write-Host "Serving $root at http://localhost:$port/"

function Send-Response($stream, $status, $contentType, [byte[]]$body) {
  $head = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nConnection: close`r`nCache-Control: no-store`r`n`r`n"
  $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
  $stream.Write($hb, 0, $hb.Length)
  $stream.Write($body, 0, $body.Length)
  $stream.Flush()
}

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $stream.ReadTimeout = 3000
    $reader = New-Object System.IO.StreamReader($stream)
    $requestLine = $reader.ReadLine()
    while ($true) { $line = $reader.ReadLine(); if ($null -eq $line -or $line -eq "") { break } }

    if ($requestLine -match '^GET\s+(\S+)') {
      $path = [Uri]::UnescapeDataString(($Matches[1] -split '\?')[0])
      if ($path -eq '/') { $path = '/index.html' }
      $file = [System.IO.Path]::GetFullPath((Join-Path $root ($path.TrimStart('/') -replace '/', '\')))
      # directory index fallback: /blog/ or /blog -> blog/index.html (mirrors GitHub Pages)
      if ($file.StartsWith($root) -and (Test-Path $file -PathType Container)) {
        $idx = Join-Path $file "index.html"
        if (Test-Path $idx -PathType Leaf) { $file = $idx }
      }
      # extensionless URL fallback: try .html (mirrors GitHub Pages behaviour)
      if ($file.StartsWith($root) -and !(Test-Path $file -PathType Leaf) -and [System.IO.Path]::GetExtension($file) -eq "") {
        $candidate = $file + ".html"
        if (Test-Path $candidate -PathType Leaf) { $file = $candidate }
      }
      if ($file.StartsWith($root) -and (Test-Path $file -PathType Leaf)) {
        $ext = [System.IO.Path]::GetExtension($file).ToLower()
        $ct = $mime[$ext]; if (-not $ct) { $ct = "application/octet-stream" }
        Send-Response $stream "200 OK" $ct ([System.IO.File]::ReadAllBytes($file))
      } else {
        Send-Response $stream "404 Not Found" "text/plain; charset=utf-8" ([System.Text.Encoding]::UTF8.GetBytes("404"))
      }
    } else {
      Send-Response $stream "405 Method Not Allowed" "text/plain" ([System.Text.Encoding]::UTF8.GetBytes("405"))
    }
  } catch { } finally { $client.Close() }
}
