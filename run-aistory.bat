@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-aistory.ps1"
set EXIT_CODE=%ERRORLEVEL%
if not "%EXIT_CODE%"=="0" (
  echo.
  echo AIStory stopped with an error. Code: %EXIT_CODE%
  echo.
  pause
)
endlocal
exit /b %EXIT_CODE%
