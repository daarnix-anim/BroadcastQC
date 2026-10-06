import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Premiere Pro Standalone Safe Zone Overlay', () => {
  const jsxPath = path.resolve(__dirname, '../apps/ae-extension/host/index.jsx');
  const jsxCode = fs.readFileSync(jsxPath, 'utf8');

  it('ensures PProHostAdapter does not depend on After Effects DOM objects for Safe Zone', () => {
    // Extract PProHostAdapter object source
    const pproStart = jsxCode.indexOf('var PProHostAdapter = {');
    const pproEnd = jsxCode.indexOf('var BroadcastQCHost = {');
    assert.ok(pproStart !== -1 && pproEnd !== -1, 'PProHostAdapter must be present in index.jsx');
    const pproCode = jsxCode.slice(pproStart, pproEnd);

    // Extract toggleSafeZoneOverlay function inside PProHostAdapter
    const szStart = pproCode.indexOf('toggleSafeZoneOverlay:');
    const szEnd = pproCode.indexOf('getSafeZoneOverlayStatus:', szStart);
    assert.ok(szStart !== -1 && szEnd !== -1, 'toggleSafeZoneOverlay must be present in PProHostAdapter');
    const szCode = pproCode.slice(szStart, szEnd);

    // Must NOT use AE specific objects
    assert.equal(szCode.includes('CompItem'), false, 'PPro Safe Zone must not depend on AE CompItem');
    assert.equal(szCode.includes('addShape'), false, 'PPro Safe Zone must not depend on AE addShape');
    assert.equal(szCode.includes('ADBE Vector'), false, 'PPro Safe Zone must not depend on AE ADBE Vector properties');
    assert.equal(szCode.includes('app.project.activeItem'), false, 'PPro Safe Zone must use activeSequence, not AE activeItem');
  });

  it('correctly creates, enables, and disables safe zone overlay on active sequence in Premiere Pro environment', () => {
    // Mock Premiere Pro DOM environment
    const mockClips = [];
    const mockVideoTracks = [
      {
        clips: {
          numItems: 1,
          '0': { name: 'Main Video Clip.mp4', disabled: false }
        },
        overwriteClip(item, time) {
          const newClip = {
            name: item.name,
            projectItem: item,
            disabled: false,
            end: null
          };
          this.clips['1'] = newClip;
          this.clips.numItems = 2;
          mockClips.push(newClip);
        }
      },
      {
        clips: {
          numItems: 0
        },
        overwriteClip(item, time) {
          const newClip = {
            name: item.name,
            projectItem: item,
            disabled: false,
            end: null
          };
          this.clips['0'] = newClip;
          this.clips.numItems = 1;
          mockClips.push(newClip);
        }
      }
    ];

    const mockProjectItems = [];
    const mockBinChildren = [];
    const mockBin = {
      name: '[Broadcast QC Guides]',
      type: 2,
      children: {
        numItems: 0,
        get length() { return mockBinChildren.length; }
      }
    };

    const mockRootItem = {
      name: 'Root',
      type: 2,
      children: {
        numItems: 1,
        '0': mockBin
      },
      createBin(name) {
        return mockBin;
      }
    };

    const mockSequence = {
      id: 101,
      name: 'Test Sequence 1080p',
      frameSizeHorizontal: 1920,
      frameSizeVertical: 1080,
      end: '2540160000000',
      videoTracks: {
        numTracks: 2,
        '0': mockVideoTracks[0],
        '1': mockVideoTracks[1]
      }
    };

    // Create sandbox
    const sandbox = {
      BridgeTalk: { appName: 'premierepro' },
      app: {
        version: '2026.0.0',
        appName: 'Adobe Premiere Pro',
        project: {
          rootItem: mockRootItem,
          activeSequence: mockSequence,
          importFiles(paths, suppress, targetBin, asStills) {
            const importedItem = {
              name: path.basename(paths[0]),
              fsName: paths[0],
              changeMediaPath(p, s) { this.fsName = p; }
            };
            mockBin.children[mockBin.children.numItems] = importedItem;
            mockBin.children.numItems++;
            mockProjectItems.push(importedItem);
          }
        }
      },
      File: function(fsPath) {
        this.fsName = fsPath;
        this.name = path.basename(fsPath);
        this.exists = true;
      },
      Time: function() {
        this.seconds = 0;
      },
      writeLn: function() {},
      console: console
    };

    vm.createContext(sandbox);
    vm.runInContext(jsxCode, sandbox);

    // 1. Initial status should be inactive
    const statusBefore = JSON.parse(sandbox.BroadcastQCHost.getSafeZoneOverlayStatus());
    assert.equal(statusBefore.active, false);

    // 2. Toggle on Safe Zone overlay
    const fakeImagePath = 'C:/Users/test/AppData/Local/Temp/broadcast_qc_safezone_overlay.png';
    const marginsJson = JSON.stringify({ top: 5, bottom: 5, left: 5, right: 5 });

    const createRes = JSON.parse(sandbox.BroadcastQCHost.toggleSafeZoneOverlay(marginsJson, true, fakeImagePath));
    assert.equal(createRes.success, true, 'Creating overlay must succeed');
    assert.equal(createRes.active, true, 'Overlay must be active');
    assert.equal(createRes.trackIndex, 2, 'Should be placed on the empty video track V2');

    // Check status is now active
    const statusAfter = JSON.parse(sandbox.BroadcastQCHost.getSafeZoneOverlayStatus());
    assert.equal(statusAfter.active, true, 'getSafeZoneOverlayStatus must report active');

    // 3. Toggle off Safe Zone overlay
    const hideRes = JSON.parse(sandbox.BroadcastQCHost.toggleSafeZoneOverlay(marginsJson, false, fakeImagePath));
    assert.equal(hideRes.success, true);
    assert.equal(hideRes.active, false);

    const statusHidden = JSON.parse(sandbox.BroadcastQCHost.getSafeZoneOverlayStatus());
    assert.equal(statusHidden.active, false, 'Status must be inactive after hiding');

    // 4. Toggle back on without needing to re-import
    const reEnableRes = JSON.parse(sandbox.BroadcastQCHost.toggleSafeZoneOverlay(marginsJson, true, fakeImagePath));
    assert.equal(reEnableRes.success, true);
    assert.equal(reEnableRes.active, true);
  });
});
