# Broadcast QC - PowerShell Uninstaller for Adobe After Effects
$ErrorActionPreference = "Continue"

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "   Broadcast QC - Удаление расширения After Effects" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

$targetExtensionDir = Join-Path $env:APPDATA "Adobe\CEP\extensions\com.broadcast.qc"

if (Test-Path $targetExtensionDir) {
    Write-Host "`nУдаление файлов расширения из: $targetExtensionDir" -ForegroundColor Yellow
    Remove-Item -Path $targetExtensionDir -Recurse -Force
    Write-Host "`n[УСПЕХ] Расширение 'Broadcast QC' полностью удалено из After Effects." -ForegroundColor Green
} else {
    Write-Host "`n[ИНФО] Расширение 'Broadcast QC' не найдено в папке CEP ($targetExtensionDir)." -ForegroundColor Gray
}

Write-Host "=====================================================`n" -ForegroundColor Cyan
