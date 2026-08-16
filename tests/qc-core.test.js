import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { BroadcastQCCore } from '../packages/qc-core/index.js';

describe('Broadcast QC Core Pipeline Tests', () => {
  const qcCore = new BroadcastQCCore({
    checkSpelling: true,
    checkSafeZone: true
  });

  test('Full QC Analysis: detects spelling mistake and safe zone overflow on stable state', async () => {
    const mockScanData = {
      composition: {
        id: 1,
        name: 'Main_Promo_16x9',
        width: 1920,
        height: 1080,
        duration: 10.0,
        frameRate: 30
      },
      layers: [
        {
          id: 1,
          name: 'Title_Error_Spelling',
          index: 1,
          inPoint: 0,
          outPoint: 5.0,
          text: 'Наша новая програма',
          samples: [
            {
              time: 2.0,
              position: [960, 540],
              scale: [100, 100],
              opacity: 100,
              rotation: 0,
              compAABB: { left: 400, top: 400, right: 1500, bottom: 600, width: 1100, height: 200 },
              text: 'Наша новая програма'
            },
            {
              time: 2.5,
              position: [960, 540],
              scale: [100, 100],
              opacity: 100,
              rotation: 0,
              compAABB: { left: 400, top: 400, right: 1500, bottom: 600, width: 1100, height: 200 },
              text: 'Наша новая програма'
            },
            {
              time: 3.0,
              position: [960, 540],
              scale: [100, 100],
              opacity: 100,
              rotation: 0,
              compAABB: { left: 400, top: 400, right: 1500, bottom: 600, width: 1100, height: 200 },
              text: 'Наша новая програма'
            }
          ]
        },
        {
          id: 2,
          name: 'Lower_Third_Outside_SafeZone',
          index: 2,
          inPoint: 3.0,
          outPoint: 8.0,
          text: 'Телевидение и эфир',
          samples: [
            {
              time: 4.0,
              position: [200, 1040],
              scale: [100, 100],
              opacity: 100,
              rotation: 0,
              compAABB: { left: 100, top: 1000, right: 600, bottom: 1060, width: 500, height: 60 },
              text: 'Телевидение и эфир'
            },
            {
              time: 4.5,
              position: [200, 1040],
              scale: [100, 100],
              opacity: 100,
              rotation: 0,
              compAABB: { left: 100, top: 1000, right: 600, bottom: 1060, width: 500, height: 60 },
              text: 'Телевидение и эфир'
            },
            {
              time: 5.0,
              position: [200, 1040],
              scale: [100, 100],
              opacity: 100,
              rotation: 0,
              compAABB: { left: 100, top: 1000, right: 600, bottom: 1060, width: 500, height: 60 },
              text: 'Телевидение и эфир'
            }
          ]
        }
      ]
    };

    const report = await qcCore.analyze(mockScanData);

    assert.equal(report.success, true);
    assert.equal(report.summary.spellingErrors, 1, 'Should find 1 spelling error');
    assert.equal(report.summary.safeZoneErrors, 1, 'Should find 1 safe zone error');
    assert.equal(report.summary.status, 'error');
    assert.equal(report.issues.length, 2);
  });
});
