/**
 * Reading Speed QC for Broadcast & Video Titling
 * Calculates Words-Per-Minute (WPM) and Characters-Per-Second (CPS) against broadcast standards.
 */

export class ReadingSpeedChecker {
  constructor(options = {}) {
    this.options = {
      maxCPS: options.maxCPS || 17, // Максимум 17 символов в секунду (ТВ стандарт EBU/BBC)
      maxWPM: options.maxWPM || 200, // Максимум 200 слов в минуту
      minDurationSeconds: options.minDurationSeconds || 1.2, // Минимальное время удержания любого титра в кадре
      ...options
    };
  }

  /**
   * Проверка длительности показа текста
   * @param {string} text - текст титра
   * @param {number} duration - длительность отображения в секундах
   */
  check(text, duration) {
    if (!text || typeof text !== 'string' || duration <= 0) {
      return { status: 'ok', issues: [] };
    }

    const trimmed = text.trim();
    if (!trimmed) return { status: 'ok', issues: [] };

    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const charCount = trimmed.replace(/\s+/g, ' ').length;

    const cps = Number((charCount / duration).toFixed(1));
    const wpm = Math.round((wordCount / duration) * 60);

    const issues = [];

    // 1. Слишком короткая общая длительность для непустого текста
    if (duration < this.options.minDurationSeconds && wordCount > 1) {
      issues.push({
        type: 'reading-speed',
        code: 'TOO_SHORT_DURATION',
        message: `Титр отображается слишком мало времени (${duration.toFixed(2)} с). Рекомендуемый минимум: ${this.options.minDurationSeconds} с.`,
        duration,
        wordCount,
        cps,
        wpm,
        severity: 'warning'
      });
    }

    // 2. Превышение скорости чтения (символов в секунду)
    if (cps > this.options.maxCPS && charCount > 10) {
      issues.push({
        type: 'reading-speed',
        code: 'EXCEEDS_MAX_CPS',
        message: `Скорость чтения ${cps} симв/с превышает ТВ-стандарт (${this.options.maxCPS} симв/с). Зритель может не успеть прочесть текст (${wordCount} сл. за ${duration.toFixed(2)} с).`,
        duration,
        wordCount,
        cps,
        wpm,
        severity: 'warning'
      });
    }

    return {
      status: issues.length > 0 ? 'warning' : 'ok',
      duration,
      wordCount,
      charCount,
      cps,
      wpm,
      issues
    };
  }
}
