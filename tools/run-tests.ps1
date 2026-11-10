# run-tests.ps1 - Prueft alle Typen (tsc) und fuehrt alle Tests aus.
# Aufruf aus dem Projektordner:  powershell -ExecutionPolicy Bypass -File tools\run-tests.ps1
# Ergebnis: Exit-Code 0 = alles gruen, 1 = Fehler. Pflicht vor jedem Commit (CLAUDE.md).
# (Datei bewusst ohne Umlaute: Windows PowerShell 5.1 liest .ps1 ohne BOM als ANSI.)

$ErrorActionPreference = 'Continue'
Set-Location (Join-Path $PSScriptRoot '..')

# Node direkt nach der Installation ist in alten Fenstern noch nicht im PATH.
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $env:Path = "C:\Program Files\nodejs;" + $env:Path
}

Write-Host '== Typpruefung (tsc) ==' -ForegroundColor Cyan
& npx --no-install tsc -p jsconfig.json
$typen = $LASTEXITCODE
if ($typen -eq 0) { Write-Host '  keine Typfehler' }

Write-Host ''
Write-Host '== Tests ==' -ForegroundColor Cyan
& node tools/run-tests.js
$tests = $LASTEXITCODE

Write-Host ''
if ($typen -ne 0 -or $tests -ne 0) {
    Write-Host 'FEHLGESCHLAGEN (Typen oder Tests)' -ForegroundColor Red
    exit 1
}
Write-Host 'ALLES GRUEN' -ForegroundColor Green
exit 0
