@echo off
chcp 65001 >nul
echo [Broadcast QC] Запуск удаления расширения...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall.ps1"
pause
