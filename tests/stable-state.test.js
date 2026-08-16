import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { StableStateDetector } from '../packages/stable-state/index.js';

describe('Stable State Detector Tests', () => {
  const detector = new StableStateDetector({
    minStableDurationSeconds: 0.2,
    minStableFrames: 4
  });

  test('Animation followed by stable pause followed by exit animation', () => {
    // 0.0s - 1.0s: In animation (moving position x from 0 to 960)
    // 1.0s - 3.0s: Static stable window at position [960, 540]
    // 3.0s - 4.0s: Out animation (moving position x from 960 to 1920)
    const samples = [];
    const fps = 10; // 0.1s step

    for (let t = 0; t <= 4.0; t = Number((t + 0.1).toFixed(1))) {
      let x = 960;
      let opacity = 100;

      if (t < 1.0) {
        // moving
        x = t * 960;
      } else if (t <= 3.0) {
        // static
        x = 960;
      } else {
        // moving out
        x = 960 + (t - 3.0) * 960;
      }

      samples.push({
        time: t,
        position: [x, 540],
        scale: [100, 100],
        rotation: 0,
        opacity,
        compAABB: { left: x - 100, top: 510, right: x + 100, bottom: 570, width: 200, height: 60 },
        text: 'Тестовый заголовок'
      });
    }

    const states = detector.detect(samples);
    assert.equal(states.length, 1, 'Should detect exactly 1 stable state');
    assert.ok(states[0].startTime >= 1.0 && states[0].endTime <= 3.0);
    assert.ok(states[0].checkTime >= 1.8 && states[0].checkTime <= 2.2, 'Check frame should be near center of stable window');
    assert.equal(states[0].text, 'Тестовый заголовок');
  });

  test('Text change creates distinct stable states', () => {
    // 0.0s - 1.0s: Stable Text A
    // 1.0s - 2.0s: Stable Text B
    const samples = [];
    for (let t = 0; t <= 2.0; t = Number((t + 0.1).toFixed(1))) {
      const text = t < 1.0 ? 'Текст 1' : 'Текст 2';
      samples.push({
        time: t,
        position: [960, 540],
        scale: [100, 100],
        rotation: 0,
        opacity: 100,
        compAABB: { left: 860, top: 510, right: 1060, bottom: 570, width: 200, height: 60 },
        text
      });
    }

    const states = detector.detect(samples);
    assert.equal(states.length, 2, 'Should detect 2 states due to text change');
    assert.equal(states[0].text, 'Текст 1');
    assert.equal(states[1].text, 'Текст 2');
  });

  test('Hidden layer (0% opacity) should not be considered stable visible state', () => {
    const samples = [];
    for (let t = 0; t <= 1.0; t = Number((t + 0.1).toFixed(1))) {
      samples.push({
        time: t,
        position: [960, 540],
        scale: [100, 100],
        rotation: 0,
        opacity: 0, // invisible
        compAABB: { left: 860, top: 510, right: 1060, bottom: 570, width: 200, height: 60 },
        text: 'Скрытый текст'
      });
    }

    const states = detector.detect(samples);
    assert.equal(states.length, 0, 'Hidden layers should not produce stable check states');
  });
});
