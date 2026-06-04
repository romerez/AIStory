# Launches ComfyUI from its venv. Runs in the foreground so logs are visible.

param(
    [string]$ComfyRoot = "E:\AI\ComfyUI",
    [int]$Port = 8188
)

$ErrorActionPreference = "Stop"

$venvPython = Join-Path $ComfyRoot ".venv\Scripts\python.exe"
$mainScript = Join-Path $ComfyRoot "main.py"

if (-not (Test-Path $venvPython)) {
    Write-Host "ComfyUI venv not found at $venvPython" -ForegroundColor Red
    Write-Host "Run .\scripts\setup-comfyui.ps1 first." -ForegroundColor Red
    exit 1
}

Push-Location $ComfyRoot
try {
    Write-Host "Starting ComfyUI on http://127.0.0.1:$Port" -ForegroundColor Cyan
    & $venvPython $mainScript --listen 127.0.0.1 --port $Port
} finally {
    Pop-Location
}
