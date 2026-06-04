# Launches the full local AIStory stack:
#   - ComfyUI       (separate window)
#   - Image proxy   (separate window)
#   - Verifies Ollama is reachable
# AIStory itself you still launch with `npm run dev` from the repo root.

param(
    [string]$ComfyRoot = "E:\AI\ComfyUI",
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot ".."))
)

$ErrorActionPreference = "Stop"

function Test-Endpoint($Url, $Timeout = 2) {
    try {
        $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $Timeout -ErrorAction Stop
        return $resp.StatusCode -lt 500
    } catch {
        return $false
    }
}

Write-Host ""
Write-Host "AIStory local stack launcher" -ForegroundColor Cyan
Write-Host "============================"

# 1. ComfyUI
if (Test-Endpoint "http://127.0.0.1:8188/system_stats") {
    Write-Host "ComfyUI  already running on :8188" -ForegroundColor Green
} else {
    $comfyScript = Join-Path $PSScriptRoot "start-comfyui.ps1"
    Write-Host "ComfyUI  launching..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit","-File",$comfyScript,"-ComfyRoot",$ComfyRoot
}

# 2. Image proxy
if (Test-Endpoint "http://127.0.0.1:8989/health") {
    Write-Host "Proxy    already running on :8989" -ForegroundColor Green
} else {
    $proxyDir = Join-Path $PSScriptRoot "image-proxy"
    Write-Host "Proxy    launching..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit","-Command","cd `"$proxyDir`"; npm start"
}

# 3. Ollama
if (Test-Endpoint "http://127.0.0.1:11434/api/version") {
    Write-Host "Ollama   running on :11434" -ForegroundColor Green
} else {
    Write-Host "Ollama   NOT running on :11434 - start it (it usually runs on login)." -ForegroundColor Red
}

Write-Host ""
Write-Host "Wait 30-60 seconds for ComfyUI to finish loading models, then start AIStory:"
Write-Host "  cd $RepoRoot"
Write-Host "  npm run dev"
Write-Host ""
