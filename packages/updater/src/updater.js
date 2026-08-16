/**
 * Broadcast QC 2.0 - GitHub Auto-Updater Module
 * Checks GitHub Releases API, compares SemVer, downloads release assets,
 * and updates the extension in-place within %APPDATA%/Adobe/CEP/extensions/com.broadcast.qc.
 */

/**
 * Сравнивает две версии в формате SemVer (например, "2.0.1" и "2.0.0" или "v2.1.0" и "v2.0.0")
 * @param {string} v1 Текущая версия
 * @param {string} v2 Новая версия
 * @returns {number} 1 если v2 > v1 (есть обновление), 0 если равны, -1 если v2 < v1
 */
export function compareSemver(v1, v2) {
  const clean = (v) => String(v || '').replace(/^[vV]/, '').split('-')[0].trim();
  const parts1 = clean(v1).split('.').map(n => parseInt(n, 10) || 0);
  const parts2 = clean(v2).split('.').map(n => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(parts1.length, parts2.length, 3); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num2 > num1) return 1;
    if (num2 < num1) return -1;
  }
  return 0;
}

export class AutoUpdater {
  /**
   * @param {Object} options
   * @param {string} [options.repo='daarnix-anim/BroadcastQC'] Имя репозитория GitHub
   * @param {string} [options.currentVersion='0.8.3'] Текущая версия расширения
   * @param {Function} [options.fetchFn] Опциональная функция fetch для тестов
   */
  constructor(options = {}) {
    this.repo = options.repo || 'daarnix-anim/BroadcastQC';
    this.currentVersion = options.currentVersion || '0.8.3';
    this.fetchFn = options.fetchFn || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
    this.isNode = typeof process !== 'undefined' && Boolean(process.versions && process.versions.node);
  }

  /**
   * Проверяет наличие новой версии на GitHub Releases
   * @returns {Promise<Object>} Информация об обновлении
   */
  async checkForUpdates() {
    if (!this.fetchFn) {
      throw new Error('Функция fetch недоступна в текущем окружении');
    }

    const url = `https://api.github.com/repos/${this.repo}/releases/latest`;
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'BroadcastQC-AutoUpdater'
    };

    const response = await this.fetchFn(url, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          hasUpdate: false,
          currentVersion: this.currentVersion,
          latestVersion: this.currentVersion,
          message: 'Релизы в репозитории пока не опубликованы'
        };
      }
      throw new Error(`GitHub API вернул статус ${response.status}: ${response.statusText}`);
    }

    const releaseData = await response.json();
    const latestTag = releaseData.tag_name || releaseData.name || '0.0.0';
    const latestVersion = latestTag.replace(/^[vV]/, '');

    const hasUpdate = compareSemver(this.currentVersion, latestVersion) === 1;

    // Поиск zip-ассета сборки или fallback на zipball
    let downloadUrl = releaseData.zipball_url || '';
    let assetSize = 0;

    if (Array.isArray(releaseData.assets) && releaseData.assets.length > 0) {
      const zipAsset = releaseData.assets.find(a => a.name && a.name.endsWith('.zip'));
      if (zipAsset) {
        downloadUrl = zipAsset.browser_download_url;
        assetSize = zipAsset.size || 0;
      }
    }

    return {
      hasUpdate,
      currentVersion: this.currentVersion,
      latestVersion,
      tag: latestTag,
      releaseName: releaseData.name || latestTag,
      releaseNotes: releaseData.body || 'Описание релиза отсутствует.',
      publishedAt: releaseData.published_at,
      htmlUrl: releaseData.html_url,
      downloadUrl,
      assetSize
    };
  }

  /**
   * Скачивает и устанавливает обновление в целевую папку
   * @param {Object} updateInfo Информация из checkForUpdates
   * @param {string} targetExtensionDir Путь к папке com.broadcast.qc
   * @param {Function} [onProgress] Callback прогресса (percent, bytesLoaded, totalBytes)
   */
  async downloadAndInstall(updateInfo, targetExtensionDir, onProgress = () => {}) {
    if (!updateInfo || !updateInfo.downloadUrl) {
      throw new Error('Отсутствует URL для скачивания обновления');
    }

    // Если среда CEP с Node.js
    const nodeRequire = (typeof window !== 'undefined' && window.require) || (typeof require !== 'undefined' ? require : null);

    if (nodeRequire) {
      return await this._downloadAndInstallNode(updateInfo, targetExtensionDir, onProgress, nodeRequire);
    }

    // Standalone mock fallback
    for (let p = 10; p <= 100; p += 20) {
      await new Promise(r => setTimeout(r, 80));
      onProgress({ percent: p, bytesLoaded: p * 10000, totalBytes: 1000000, step: 'Имитация скачивания...' });
    }
    return { success: true, simulated: true };
  }

  /**
   * Внутренний метод установки через Node.js и PowerShell Expand-Archive
   */
  async _downloadAndInstallNode(updateInfo, targetExtensionDir, onProgress, req) {
    const fs = req('fs');
    const path = req('path');
    const os = req('os');
    const https = req('https');
    const child_process = req('child_process');

    const tempZipPath = path.join(os.tmpdir(), `broadcast-qc-${updateInfo.latestVersion}.zip`);
    const tempExtractDir = path.join(os.tmpdir(), `broadcast-qc-extract-${Date.now()}`);

    onProgress({ percent: 5, bytesLoaded: 0, totalBytes: updateInfo.assetSize || 1, step: 'Подключение к GitHub...' });

    // 1. Скачивание с редиректами (GitHub CDN)
    await new Promise((resolve, reject) => {
      const downloadFile = (curUrl) => {
        https.get(curUrl, { headers: { 'User-Agent': 'BroadcastQC-Updater' } }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return downloadFile(res.headers.location);
          }

          if (res.statusCode !== 200) {
            return reject(new Error(`Ошибка скачивания: HTTP ${res.statusCode}`));
          }

          const totalBytes = parseInt(res.headers['content-length'] || '0', 10) || updateInfo.assetSize || 0;
          let bytesLoaded = 0;
          const fileStream = fs.createWriteStream(tempZipPath);

          res.on('data', (chunk) => {
            bytesLoaded += chunk.length;
            const percent = totalBytes > 0 ? Math.min(90, Math.round((bytesLoaded / totalBytes) * 85) + 5) : 50;
            onProgress({
              percent,
              bytesLoaded,
              totalBytes,
              step: `Скачивание: ${(bytesLoaded / (1024 * 1024)).toFixed(1)} МБ ${totalBytes > 0 ? `/ ${(totalBytes / (1024 * 1024)).toFixed(1)} МБ` : ''}`
            });
          });

          res.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close();
            resolve();
          });

          fileStream.on('error', (err) => {
            fs.unlink(tempZipPath, () => {});
            reject(err);
          });
        }).on('error', reject);
      };

      downloadFile(updateInfo.downloadUrl);
    });

    onProgress({ percent: 92, bytesLoaded: 0, totalBytes: 0, step: 'Распаковка и замена файлов...' });

    // 2. Распаковка архива во временную папку через PowerShell
    const psCmd = `
      $ProgressPreference = 'SilentlyContinue';
      if (Test-Path '${tempExtractDir}') { Remove-Item -Path '${tempExtractDir}' -Recurse -Force };
      New-Item -Path '${tempExtractDir}' -ItemType Directory -Force | Out-Null;
      Expand-Archive -Path '${tempZipPath}' -DestinationPath '${tempExtractDir}' -Force;
      
      # Определение корневой папки внутри архива (если zip содержит вложенную папку)
      $sourceDir = '${tempExtractDir}';
      $subDirs = Get-ChildItem -Path $sourceDir -Directory;
      if ($subDirs.Count -eq 1 -and (Test-Path (Join-Path $subDirs[0].FullName 'CSXS\\manifest.xml'))) {
          $sourceDir = $subDirs[0].FullName;
      }
      
      # Копирование в целевую папку расширения
      Copy-Item -Path "$sourceDir\\*" -Destination '${targetExtensionDir}' -Recurse -Force;
      
      # Очистка
      Remove-Item -Path '${tempZipPath}' -Force -ErrorAction SilentlyContinue;
      Remove-Item -Path '${tempExtractDir}' -Recurse -Force -ErrorAction SilentlyContinue;
    `;

    await new Promise((resolve, reject) => {
      child_process.exec(`powershell -ExecutionPolicy Bypass -Command "${psCmd.replace(/\n/g, ' ')}"`, (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`Ошибка распаковки: ${stderr || err.message}`));
        } else {
          resolve();
        }
      });
    });

    onProgress({ percent: 100, bytesLoaded: 0, totalBytes: 0, step: 'Обновление успешно установлено!' });
    return { success: true };
  }
}
