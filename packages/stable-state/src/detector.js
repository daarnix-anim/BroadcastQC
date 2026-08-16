/**
 * Stable State Detector for Motion Graphics Quality Control
 * Analyzes time-series samples of a layer and identifies windows where the layer is visually static.
 */

export class StableStateDetector {
  constructor(options = {}) {
    this.options = {
      minStableDurationSeconds: options.minStableDurationSeconds || 0.25, // минимум 1/4 секунды неподвижности
      minStableFrames: options.minStableFrames || 6,
      minOpacity: options.minOpacity !== undefined ? options.minOpacity : 5, // слой должен быть видим (>5% opacity)
      posThreshold: options.posThreshold || 0.5, // px
      scaleThreshold: options.scaleThreshold || 0.1, // %
      rotThreshold: options.rotThreshold || 0.1, // deg
      rectThreshold: options.rectThreshold || 0.5, // px
      ...options
    };
  }

  /**
   * Сравнение двух последовательных сэмплов на идентичность состояния
   */
  areSamplesEqual(s1, s2) {
    if (!s1 || !s2) return false;

    // 1. Проверка видимости
    const op1 = s1.opacity !== undefined ? s1.opacity : 100;
    const op2 = s2.opacity !== undefined ? s2.opacity : 100;
    if (op1 < this.options.minOpacity || op2 < this.options.minOpacity) {
      return false; // Скрытый/невидимый слой не считается стабильным отображением
    }

    // 2. Проверка изменения текста
    if (s1.text !== s2.text) {
      return false;
    }

    // 3. Проверка положения
    if (s1.position && s2.position) {
      const dx = Math.abs(s1.position[0] - s2.position[0]);
      const dy = Math.abs(s1.position[1] - s2.position[1]);
      const dz = Math.abs((s1.position[2] || 0) - (s2.position[2] || 0));
      if (dx > this.options.posThreshold || dy > this.options.posThreshold || dz > this.options.posThreshold) {
        return false;
      }
    }

    // 4. Проверка масштаба
    if (s1.scale && s2.scale) {
      const dsx = Math.abs(s1.scale[0] - s2.scale[0]);
      const dsy = Math.abs(s1.scale[1] - s2.scale[1]);
      if (dsx > this.options.scaleThreshold || dsy > this.options.scaleThreshold) {
        return false;
      }
    }

    // 5. Проверка поворота
    if (s1.rotation !== undefined && s2.rotation !== undefined) {
      const dr = Math.abs(s1.rotation - s2.rotation);
      if (dr > this.options.rotThreshold) {
        return false;
      }
    }

    // 6. Проверка Bounding Box в композиции (AABB)
    if (s1.compAABB && s2.compAABB) {
      const dl = Math.abs(s1.compAABB.left - s2.compAABB.left);
      const dt = Math.abs(s1.compAABB.top - s2.compAABB.top);
      const dw = Math.abs(s1.compAABB.width - s2.compAABB.width);
      const dh = Math.abs(s1.compAABB.height - s2.compAABB.height);
      if (dl > this.options.rectThreshold || dt > this.options.rectThreshold || dw > this.options.rectThreshold || dh > this.options.rectThreshold) {
        return false;
      }
    }

    return true;
  }

  /**
   * Анализ последовательности сэмплов и выделение стабильных окон
   * @param {Array<Object>} samples - упорядоченный по времени массив сэмплов слоя
   * @returns {Array<Object>} список обнаруженных стабильных состояний
   */
  detect(samples) {
    if (!Array.isArray(samples) || samples.length === 0) {
      return [];
    }

    if (samples.length === 1) {
      const sample = samples[0];
      const opacity = sample.opacity !== undefined ? sample.opacity : 100;
      if (opacity >= this.options.minOpacity) {
        return [{
          id: 'state_single',
          startTime: sample.time,
          endTime: sample.time,
          duration: 0,
          sampleCount: 1,
          checkTime: sample.time,
          checkSample: sample,
          text: sample.text
        }];
      }
      return [];
    }

    const stableStates = [];
    let windowStartIdx = 0;

    for (let i = 1; i < samples.length; i++) {
      const prev = samples[i - 1];
      const curr = samples[i];

      const isSame = this.areSamplesEqual(prev, curr);

      if (!isSame) {
        // Завершение предыдущего окна
        this.evaluateAndPushWindow(samples, windowStartIdx, i - 1, stableStates);
        windowStartIdx = i;
      }
    }

    // Проверяем последнее открытое окно
    this.evaluateAndPushWindow(samples, windowStartIdx, samples.length - 1, stableStates);

    return stableStates;
  }

  evaluateAndPushWindow(samples, startIdx, endIdx, resultList) {
    const count = (endIdx - startIdx) + 1;
    if (count <= 0) return;

    const startSample = samples[startIdx];
    const endSample = samples[endIdx];
    const duration = endSample.time - startSample.time;

    // Проверка видимости
    const op = startSample.opacity !== undefined ? startSample.opacity : 100;
    if (op < this.options.minOpacity) return;

    // Достаточная длительность
    if (duration >= this.options.minStableDurationSeconds || count >= this.options.minStableFrames) {
      const midIdx = Math.floor((startIdx + endIdx) / 2);
      const midSample = samples[midIdx];

      resultList.push({
        id: `state_${resultList.length + 1}`,
        startTime: startSample.time,
        endTime: endSample.time,
        duration: Number(duration.toFixed(3)),
        sampleCount: count,
        checkTime: Number(midSample.time.toFixed(3)),
        checkSample: midSample,
        text: midSample.text
      });
    }
  }
}
