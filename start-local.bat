@echo off
REM Double-click to run Banglarfish locally (Windows).
REM Requires Docker Desktop running and Node.js installed.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-local.ps1"
echo.
echo Server stopped. Press any key to close.
pause >nul
