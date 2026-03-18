# Stream-HUB dev server helper
# Usage:
#   .\dev.ps1          — kill + build + start
#   .\dev.ps1 kill     — kill only
#   .\dev.ps1 build    — build only (no restart)
#   .\dev.ps1 restart  — kill + start (skip build)

param([string]$Action = "all")

$ServerBin  = "$PSScriptRoot\Backend\bin\livekit-server.exe"
$ServerArgs = @("--dev", "--config", "config.yaml", "--bind", "127.0.0.1")
$BackendDir  = "$PSScriptRoot\Backend"

function Kill-Server {
    $procs = Get-Process -Name "livekit-server" -ErrorAction SilentlyContinue
    if ($procs) {
        $procs | Stop-Process -Force
        Write-Host "[kill]  livekit-server stopped" -ForegroundColor Yellow
    } else {
        Write-Host "[kill]  no running livekit-server found" -ForegroundColor DarkGray
    }
}

function Build-Server {
    Write-Host "[build] building..." -ForegroundColor Cyan
    $result = & go build -o "$ServerBin" ./cmd/server/ 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[build] FAILED:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        return $false
    }
    Write-Host "[build] OK -> $ServerBin" -ForegroundColor Green
    return $true
}

function Start-Server {
    if (-not (Test-Path $ServerBin)) {
        Write-Host "[start] binary not found: $ServerBin" -ForegroundColor Red
        return
    }
    Write-Host "[start] starting livekit-server..." -ForegroundColor Cyan
    Set-Location $BackendDir
    & $ServerBin @ServerArgs
}

switch ($Action) {
    "kill"    { Kill-Server }
    "build"   { Set-Location $BackendDir; Build-Server }
    "restart" { Kill-Server; Start-Server }
    default   {
        Kill-Server
        Set-Location $BackendDir
        $ok = Build-Server
        if ($ok) { Start-Server }
    }
}
