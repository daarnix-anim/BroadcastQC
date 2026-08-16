import test from 'node:test';
import assert from 'node:assert/strict';
import { AutoUpdater, compareSemver } from '../packages/updater/index.js';

test('AutoUpdater Module Tests', async (t) => {
  await t.test('SemVer version comparison', () => {
    assert.equal(compareSemver('0.8.2', '0.8.3'), 1, '0.8.3 should be newer than 0.8.2');
    assert.equal(compareSemver('0.8.2', '0.9.0'), 1, '0.9.0 should be newer than 0.8.2');
    assert.equal(compareSemver('0.8.2', '1.0.0'), 1, '1.0.0 should be newer than 0.8.2');
    assert.equal(compareSemver('v0.8.2', 'v0.8.2'), 0, 'Equal versions should return 0');
    assert.equal(compareSemver('0.8.2', '0.8.1'), -1, '0.8.1 should be older than 0.8.2');
  });

  await t.test('Parses GitHub Releases API response correctly', async () => {
    const mockRelease = {
      tag_name: 'v0.9.0',
      name: 'Broadcast QC v0.9.0 - Major Improvements',
      body: '### What is new:\n- Added auto-updater\n- Improved safe zone',
      published_at: '2026-08-16T12:00:00Z',
      html_url: 'https://github.com/daarnix-anim/BroadcastQC/releases/tag/v0.9.0',
      assets: [
        {
          name: 'broadcast-qc-v0.9.0.zip',
          browser_download_url: 'https://github.com/daarnix-anim/BroadcastQC/releases/download/v0.9.0/broadcast-qc-v0.9.0.zip',
          size: 1540000
        }
      ]
    };

    const mockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => mockRelease
    });

    const updater = new AutoUpdater({
      repo: 'daarnix-anim/BroadcastQC',
      currentVersion: '0.8.2',
      fetchFn: mockFetch
    });

    const result = await updater.checkForUpdates();

    assert.equal(result.hasUpdate, true);
    assert.equal(result.latestVersion, '0.9.0');
    assert.equal(result.releaseName, 'Broadcast QC v0.9.0 - Major Improvements');
    assert.equal(result.downloadUrl, 'https://github.com/daarnix-anim/BroadcastQC/releases/download/v0.9.0/broadcast-qc-v0.9.0.zip');
    assert.equal(result.assetSize, 1540000);
  });

  await t.test('Reports no update when current version is equal to or greater than release', async () => {
    const mockRelease = {
      tag_name: 'v0.8.2',
      name: 'Broadcast QC v0.8.2',
      body: 'Initial release',
      published_at: '2026-08-16T12:00:00Z',
      html_url: 'https://github.com/daarnix-anim/BroadcastQC/releases/tag/v0.8.2',
      assets: []
    };

    const mockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => mockRelease
    });

    const updater = new AutoUpdater({
      repo: 'daarnix-anim/BroadcastQC',
      currentVersion: '0.8.2',
      fetchFn: mockFetch
    });

    const result = await updater.checkForUpdates();
    assert.equal(result.hasUpdate, false);
    assert.equal(result.latestVersion, '0.8.2');
  });
});
