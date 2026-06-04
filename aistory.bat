@echo off
setlocal
title AIStory
cd /d "%~dp0"

echo ============================================
echo   Starting AIStory
echo ============================================
echo.

rem 1) Stop stale dev servers so npm run dev never hits "address already in use".
echo Freeing ports 8787 and 5173 if busy...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -State Listen -LocalPort 8787,5173 -ErrorAction SilentlyContinue | ForEach-Object { $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue; if ($proc -and $proc.ProcessName -eq 'node') { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } }"

rem 2) Story model server (Ollama) - start if not already running.
tasklist /fi "imagename eq ollama.exe" | find /i "ollama.exe" >nul
if errorlevel 1 (
  echo Starting Ollama...
  start "" "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" serve
) else (
  echo Ollama already running.
)

rem 3) ComfyUI + image proxy (each in its own window; skipped if already up).
echo Starting ComfyUI and image proxy if needed...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0local-stack\start-all.ps1"

rem 4) Open the app in the browser once it has had a moment to boot.
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep 12; Start-Process 'http://127.0.0.1:5173'"

rem 5) Start the app. Keep THIS window open; close it to stop the app.
echo.
echo Starting the app. The browser opens in ~12 seconds.
echo Keep THIS window open while you use the app. Close it to stop.
echo.
call npm run dev
endlocal
