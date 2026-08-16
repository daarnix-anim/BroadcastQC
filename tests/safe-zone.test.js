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

  test('Custom 4-sided percentage margins config (Left, Right, Top, Bottom)', () => {
    const customChecker = new SafeZoneChecker({
      customMarginPercent: { left: 8, right: 12, top: 6, bottom: 10 }
    });

    const safeArea = customChecker.getSafeArea(compW, compH);
    // 8% of 1920 = 153.6 -> 154, 12% = 230.4 -> 230, 6% of 1080 = 64.8 -> 65, 10% = 108
    assert.equal(safeArea.left, Math.round(1920 * 0.08));
    assert.equal(safeArea.top, Math.round(1080 * 0.06));
    assert.equal(safeArea.right, Math.round(1920 - 1920 * 0.12));
    assert.equal(safeArea.bottom, Math.round(1080 - 1080 * 0.10));
  });

  test('Instagram Reels 9:16 preset detects right action buttons cutout overlay', () => {
    const reelsChecker = new SafeZoneChecker({
      preset: BROADCAST_PRESETS.INSTAGRAM_REELS_9_16
    });

    const w916 = 1080;
    const h916 = 1920;

    // Layer in the right buttons area: left = 920, right = 1050, top = 1000, bottom = 1200
    const aabb = { left: 920, right: 1050, top: 1000, bottom: 1200, width: 130, height: 200 };
    const result = reelsChecker.check(aabb, w916, h916);

    assert.equal(result.passed, false);
    const cutoutV = result.violations.find(v => v.side === 'right_actions');
    assert.ok(cutoutV, 'Must detect right actions cutout violation in Instagram Reels');
  });

  test('TikTok 9:16 preset detects bottom caption & vinyl disc cutout', () => {
    const tiktokChecker = new SafeZoneChecker({
      preset: BROADCAST_PRESETS.TIKTOK_9_16
    });

    const w916 = 1080;
    const h916 = 1920;

    // Layer in bottom caption area: left = 50, right = 600, top = 1600, bottom = 1800
    const aabb = { left: 50, right: 600, top: 1600, bottom: 1800, width: 550, height: 200 };
    const result = tiktokChecker.check(aabb, w916, h916);

    assert.equal(result.passed, false);
    const bottomV = result.violations.find(v => v.side === 'bottom' || v.side === 'bottom_caption');
    assert.ok(bottomV, 'Must detect bottom caption violation in TikTok');
  });
});
