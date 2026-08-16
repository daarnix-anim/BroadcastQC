import test from 'node:test';
import assert from 'node:assert/strict';
import { AutoUpdater, compareSemver } from '../packages/updater/index.js';

test('AutoUpdater Module Tests', async (t) => {
  await t.test('SemVer version comparison', () => {
    assert.equal(compareSemver('2.0.0', '2.0.1'), 1, '2.0.1 should be newer than 2.0.0');
    assert.equal(compareSemver('2.0.0', '2.1.0'), 1, '2.1.0 should be newer than 2.0.0');
    assert.equal(compareSemver('2.0.0', '3.0.0'), 1, '3.0.0 should be newer than 2.0.0');
    assert.equal(compareSemver('v2.0.0', 'v2.0.0'), 0, 'Equal versions should return 0');
    assert.equal(compareSemver('2.1.0', '2.0.9'), -1, '2.0.9 should be older than 2.1.0');
  });

  await t.test('Parses GitHub Releases API response correctly', async () => {
    const mockRelease = {
      tag_name: 'v2.1.0',
      name: 'Broadcast QC v2.1.0 - Major Improvements',
      body: '### What is new:\n- Added auto-updater\n- Improved safe zone',
      published_at: '2026-08-16T12:00:00Z',
      html_url: 'https://github.com/daarnix-anim/BroadcastQC/releases/tag/v2.1.0',
      assets: [
        {
          name: 'broadcast-qc-v2.1.0.zip',
          browser_download_url: 'https://github.com/daarnix-anim/BroadcastQC/releases/download/v2.1.0/broadcast-qc-v2.1.0.zip',
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
      currentVersion: '2.0.0',
      fetchFn: mockFetch
    });

    const result = await updater.checkForUpdates();

    assert.equal(result.hasUpdate, true);
    assert.equal(result.latestVersion, '2.1.0');
    assert.equal(result.releaseName, 'Broadcast QC v2.1.0 - Major Improvements');
    assert.equal(result.downloadUrl, 'https://github.com/daarnix-anim/BroadcastQC/releases/download/v2.1.0/broadcast-qc-v2.1.0.zip');
    assert.equal(result.assetSize, 1540000);
  });

  await t.test('Reports no update when current version is equal to or greater than release', async () => {
    const mockRelease = {
      tag_name: 'v2.0.0',
      name: 'Broadcast QC v2.0.0',
      body: 'Initial release',
      published_at: '2026-08-16T12:00:00Z',
      html_url: 'https://github.com/daarnix-anim/BroadcastQC/releases/tag/v2.0.0',
      assets: []
    };

    const mockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => mockRelease
    });

    const updater = new AutoUpdater({
      repo: 'daarnix-anim/BroadcastQC',
      currentVersion: '2.0.0',
      fetchFn: mockFetch
    });

    const result = await updater.checkForUpdates();
    assert.equal(result.hasUpdate, false);
    assert.equal(result.latestVersion, '2.0.0');
  });
});
