@echo off
chcp 65001 >nul
echo [Broadcast QC] Запуск установки расширения...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
pause
