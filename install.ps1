# Broadcast QC - PowerShell Installer for Adobe After Effects 2026.2+
# Extensions folder: %APPDATA%\Adobe\CEP\extensions\com.broadcast.qc

$ErrorActionPreference = "Stop"

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "   Broadcast QC - Установка расширения After Effects" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

# 1. Включение PlayerDebugMode в реестре для всех версий CSXS
Write-Host "`n[1/3] Настройка реестра Windows (PlayerDebugMode)..." -ForegroundColor Yellow
$csxsVersions = 8..18
foreach ($ver in $csxsVersions) {
    $regPath = "HKCU:\Software\Adobe\CSXS.$ver"
    if (-not (Test-Path $regPath)) {
        New-Item -Path $regPath -Force | Out-Null
    }
    Set-ItemProperty -Path $regPath -Name "PlayerDebugMode" -Value "1" -Type String -Force
}
Write-Host "  -> PlayerDebugMode успешно активирован для CSXS 8-18." -ForegroundColor Green

# 2. Определение путей из корня проекта
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceExtensionDir = Join-Path $projectRoot "apps\ae-extension"
$packagesDir = Join-Path $projectRoot "packages"
$presetsDir = Join-Path $projectRoot "presets"

$targetBase = Join-Path $env:APPDATA "Adobe\CEP\extensions"
$targetExtensionDir = Join-Path $targetBase "com.broadcast.qc"

if (-not (Test-Path $targetBase)) {
    New-Item -Path $targetBase -ItemType Directory -Force | Out-Null
}

# 3. Копирование файлов расширения
Write-Host "`n[2/3] Копирование файлов расширения в CEP директорию..." -ForegroundColor Yellow
Write-Host "  Назначение: $targetExtensionDir" -ForegroundColor Gray

if (Test-Path $targetExtensionDir) {
    Remove-Item -Path $targetExtensionDir -Recurse -Force
}

New-Item -Path $targetExtensionDir -ItemType Directory -Force | Out-Null

# Копируем само расширение
Copy-Item -Path "$sourceExtensionDir\*" -Destination $targetExtensionDir -Recurse -Force

# Копируем необходимые пакеты (packages) и пресеты (presets)
$extPackagesDir = Join-Path $targetExtensionDir "packages"
$extPresetsDir = Join-Path $targetExtensionDir "presets"

if (Test-Path $packagesDir) {
    Copy-Item -Path $packagesDir -Destination $extPackagesDir -Recurse -Force
}
if (Test-Path $presetsDir) {
    Copy-Item -Path $presetsDir -Destination $extPresetsDir -Recurse -Force
}

# 4. Проверка и завершение
Write-Host "`n[3/3] Проверка целостности установки..." -ForegroundColor Yellow
$manifestCheck = Join-Path $targetExtensionDir "CSXS\manifest.xml"
if (Test-Path $manifestCheck) {
    Write-Host "`n[УСПЕХ] Расширение 'Broadcast QC' успешно установлено!" -ForegroundColor Green
    Write-Host "Чтобы открыть в After Effects:" -ForegroundColor White
    Write-Host "  1. Запустите или перезапустите Adobe After Effects 2026." -ForegroundColor White
    Write-Host "  2. Перейдите в меню: Окно -> Расширения -> Broadcast QC (Window -> Extensions -> Broadcast QC)." -ForegroundColor Cyan
} else {
    Write-Host "`n[ОШИБКА] Файл манифеста не найден после копирования." -ForegroundColor Red
}

Write-Host "=====================================================`n" -ForegroundColor Cyan
