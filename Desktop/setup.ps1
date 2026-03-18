# Stream HUB Desktop — Setup Script (Windows)
# Chạy: powershell -ExecutionPolicy Bypass -File setup.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== Stream HUB Desktop Setup ===" -ForegroundColor Cyan

# 1. Kiểm tra Rust
Write-Host "`n[1/4] Kiểm tra Rust..." -ForegroundColor Yellow
if (-not (Get-Command rustc -ErrorAction SilentlyContinue)) {
    Write-Host "Rust chưa được cài. Đang tải rustup..." -ForegroundColor Yellow
    $rustupUrl = "https://win.rustup.rs/x86_64"
    $rustupExe = "$env:TEMP\rustup-init.exe"
    Invoke-WebRequest -Uri $rustupUrl -OutFile $rustupExe
    & $rustupExe -y --default-toolchain stable --profile minimal
    # Reload PATH
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
    Write-Host "Rust đã cài xong." -ForegroundColor Green
} else {
    Write-Host "Rust $(rustc --version) — OK" -ForegroundColor Green
}

# 2. Kiểm tra WebView2 (Windows)
Write-Host "`n[2/4] Kiểm tra WebView2..." -ForegroundColor Yellow
$wv2 = Get-ItemProperty "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" -ErrorAction SilentlyContinue
if (-not $wv2) {
    Write-Host "WebView2 chưa cài. Đang tải..." -ForegroundColor Yellow
    $wv2Url = "https://go.microsoft.com/fwlink/p/?LinkId=2124703"
    $wv2Exe = "$env:TEMP\MicrosoftEdgeWebview2Setup.exe"
    Invoke-WebRequest -Uri $wv2Url -OutFile $wv2Exe
    & $wv2Exe /silent /install
    Write-Host "WebView2 đã cài xong." -ForegroundColor Green
} else {
    Write-Host "WebView2 $($wv2.pv) — OK" -ForegroundColor Green
}

# 3. Cài npm deps
Write-Host "`n[3/4] Cài Desktop npm dependencies..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
npm install
Write-Host "npm install — OK" -ForegroundColor Green

# 4. Cài Frontend npm deps (nếu chưa có)
Write-Host "`n[4/4] Kiểm tra Frontend dependencies..." -ForegroundColor Yellow
$frontendModules = Join-Path $PSScriptRoot "..\Frontend\node_modules"
if (-not (Test-Path $frontendModules)) {
    Write-Host "Cài Frontend npm dependencies..." -ForegroundColor Yellow
    Set-Location (Join-Path $PSScriptRoot "..\Frontend")
    npm install
    Set-Location $PSScriptRoot
}
Write-Host "Frontend deps — OK" -ForegroundColor Green

Write-Host "`n=== Setup hoàn tất! ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Để chạy dev:   cd Desktop && npm run dev"   -ForegroundColor White
Write-Host "Để build:      cd Desktop && npm run build" -ForegroundColor White
Write-Host ""
Write-Host "Lưu ý: Backend phải đang chạy trên port 7880" -ForegroundColor DarkYellow
