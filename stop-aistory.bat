@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-aistory.ps1"
set EXIT_CODE=%ERRORLEVEL%
if not "%EXIT_CODE%"=="0" (
  echo.
  echo AIStory stop script failed. Code: %EXIT_CODE%
  echo.
  pause
)
endlocal
exit /b %EXIT_CODE%
