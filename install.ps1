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

# 2. Определение путей (поддержка как архива релиза, так и корня репозитория)
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

if (Test-Path (Join-Path $projectRoot "CSXS\manifest.xml")) {
    # Скрипт запущен внутри распакованного архива релиза
    $sourceExtensionDir = $projectRoot
    $isReleasePackage = $true
} elseif (Test-Path (Join-Path $projectRoot "apps\ae-extension\CSXS\manifest.xml")) {
    # Скрипт запущен из корня репозитория разработки
    $sourceExtensionDir = Join-Path $projectRoot "apps\ae-extension"
    $isReleasePackage = $false
} else {
    Write-Host "`n[ОШИБКА] Исходные файлы расширения не найдены (отсутствует CSXS\manifest.xml)." -ForegroundColor Red
    exit 1
}

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

if ($isReleasePackage) {
    # Копируем всё содержимое архива релиза (CSXS, client, host, packages), исключая установочные скрипты
    $items = Get-ChildItem -Path $sourceExtensionDir -Exclude "*.bat", "*.ps1", "*.zip", ".git*"
    foreach ($item in $items) {
        Copy-Item -Path $item.FullName -Destination $targetExtensionDir -Recurse -Force
    }
} else {
    # Режим разработки: копируем apps\ae-extension и актуальные packages из корня репозитория
    Copy-Item -Path "$sourceExtensionDir\*" -Destination $targetExtensionDir -Recurse -Force
    $packagesDir = Join-Path $projectRoot "packages"
    if (Test-Path $packagesDir) {
        $extPackagesDir = Join-Path $targetExtensionDir "packages"
        if (Test-Path $extPackagesDir) {
            Remove-Item -Path $extPackagesDir -Recurse -Force
        }
        New-Item -Path $extPackagesDir -ItemType Directory -Force | Out-Null
        Copy-Item -Path "$packagesDir\*" -Destination $extPackagesDir -Recurse -Force
    }
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
