import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ReadingSpeedChecker } from '../packages/qc-core/index.js';

describe('Reading Speed QC Tests', () => {
  const checker = new ReadingSpeedChecker({
    maxCPS: 17,
    minDurationSeconds: 1.2
  });

  test('Short title with sufficient duration passes', () => {
    // 3 words, 2.5 seconds -> CPS ~6 -> PASS
    const res = checker.check('В эфире новости', 2.5);
    assert.equal(res.status, 'ok');
    assert.equal(res.issues.length, 0);
  });

  test('Title with too short duration triggers warning', () => {
    // 2 words, 0.5 seconds -> Too short duration
    const res = checker.check('Внимание всем', 0.5);
    assert.equal(res.status, 'warning');
    assert.ok(res.issues.some(i => i.code === 'TOO_SHORT_DURATION'));
  });

  test('Long paragraph disappearing too quickly triggers high CPS warning', () => {
    // 25 words in 1.0s -> high CPS
    const longText = 'Экстренное сообщение государственной комиссии по вопросам развития цифровых технологий и космического вещания в прямом эфире';
    const res = checker.check(longText, 1.0);
    assert.equal(res.status, 'warning');
    assert.ok(res.issues.some(i => i.code === 'EXCEEDS_MAX_CPS'));
  });
});
