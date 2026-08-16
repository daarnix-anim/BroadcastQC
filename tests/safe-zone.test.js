import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SafeZoneChecker, BROADCAST_PRESETS } from '../packages/safe-zone/index.js';

describe('Safe Zone Checker Tests', () => {
  const checker = new SafeZoneChecker({
    preset: BROADCAST_PRESETS.EBU_R95_TITLE_SAFE // 90% (5% margin)
  });

  const compW = 1920;
  const compH = 1080;

  test('Calculates correct EBU R95 safe area margins for 1920x1080', () => {
    const safeArea = checker.getSafeArea(compW, compH);
    // 5% of 1920 = 96 px, 5% of 1080 = 54 px
    assert.equal(safeArea.left, 96);
    assert.equal(safeArea.top, 54);
    assert.equal(safeArea.right, 1824);
    assert.equal(safeArea.bottom, 1026);
  });

  test('Layer inside safe zone passes without violations', () => {
    // Layer centered: left=400, right=1500, top=200, bottom=400
    const aabb = { left: 400, right: 1500, top: 200, bottom: 400, width: 1100, height: 200 };
    const result = checker.check(aabb, compW, compH);

    assert.equal(result.status, 'ok');
    assert.equal(result.passed, true);
    assert.equal(result.violations.length, 0);
  });

  test('Layer violating left and bottom safe boundaries reports exact overflow in px', () => {
    // Left boundary safe is 96, layer left is 50 -> overflow 46px
    // Bottom boundary safe is 1026, layer bottom is 1050 -> overflow 24px
    const aabb = { left: 50, right: 1200, top: 200, bottom: 1050, width: 1150, height: 850 };
    const result = checker.check(aabb, compW, compH);

    assert.equal(result.status, 'error');
    assert.equal(result.passed, false);
    assert.equal(result.violations.length, 2);

    const leftV = result.violations.find(v => v.side === 'left');
    assert.ok(leftV, 'Must report left violation');
    assert.equal(leftV.overflowPx, 46);

    const bottomV = result.violations.find(v => v.side === 'bottom');
    assert.ok(bottomV, 'Must report bottom violation');
    assert.equal(bottomV.overflowPx, 24);

    assert.equal(result.maxOverflow, 46);
  });

  test('Custom pixel margins config', () => {
    const customChecker = new SafeZoneChecker({
      customMarginPx: { left: 120, right: 120, top: 68, bottom: 68 }
    });

    const safeArea = customChecker.getSafeArea(compW, compH);
    assert.equal(safeArea.left, 120);
    assert.equal(safeArea.top, 68);
    assert.equal(safeArea.right, 1800);
    assert.equal(safeArea.bottom, 1012);
  });
});
