/**
 * Broadcast QC - Release Packaging Script
 * Packs all extension files, packages, and installers into dist/broadcast-qc-v<version>.zip
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const pkgJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
const version = pkgJson.version || '2.0.0';

const distDir = path.join(projectRoot, 'dist');
const zipFileName = `broadcast-qc-v${version}.zip`;
const zipFilePath = path.join(distDir, zipFileName);

console.log(`[Release Packager] Building ${zipFileName}...`);

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

if (fs.existsSync(zipFilePath)) {
  fs.unlinkSync(zipFilePath);
}

// Создаем временную папку сборки
const stagingDir = path.join(distDir, 'staging');
if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

// 1. Копируем расширение (CSXS, client, host)
const aeExtDir = path.join(projectRoot, 'apps', 'ae-extension');
fs.cpSync(aeExtDir, stagingDir, { recursive: true });

// 2. Копируем пакеты (packages)
const packagesDir = path.join(projectRoot, 'packages');
const stagingPackagesDir = path.join(stagingDir, 'packages');
fs.cpSync(packagesDir, stagingPackagesDir, { recursive: true });

// 3. Копируем инсталлеры и метаданные в корень дистрибутива
const rootFiles = ['install.bat', 'install.ps1', 'uninstall.bat', 'uninstall.ps1', 'package.json', 'README.md'];
for (const file of rootFiles) {
  const src = path.join(projectRoot, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(stagingDir, file));
  }
}

// 4. Архивируем через PowerShell Compress-Archive
console.log(`[Release Packager] Compressing staging files to ${zipFileName}...`);
const psCmd = `Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${zipFilePath}' -Force`;
execSync(`powershell -ExecutionPolicy Bypass -Command "${psCmd}"`, { stdio: 'inherit' });

// 5. Очистка временной папки сборки
fs.rmSync(stagingDir, { recursive: true, force: true });

const stats = fs.statSync(zipFilePath);
console.log(`[Release Packager] ✅ Successfully created: ${zipFilePath} (${(stats.size / 1024).toFixed(1)} KB)`);
