/**
 * Broadcast QC - Yandex.Speller API Client
 * Fast online spellchecking for Russian and English texts with contextual awareness.
 * Includes timeout protection, caching, and graceful offline fallback.
 */

export class YandexSpellerClient {
  constructor(options = {}) {
    this.endpoint = options.endpoint || 'https://speller.yandex.net/services/spellservice.json/checkText';
    this.timeoutMs = options.timeoutMs || 3500;
    this.cache = new Map();
    this.enabled = options.enabled !== false;
  }

  /**
   * Проверка текста через Яндекс.Спеллер API
   * @param {string} text - текст для проверки
   * @param {string} lang - 'ru,en'
   * @returns {Promise<Array<{word: string, pos: number, len: number, suggestions: string[], message: string}>>}
   */
  async checkText(text, lang = 'ru,en') {
    if (!text || typeof text !== 'string' || !text.trim()) {
      return [];
    }

    const trimmed = text.trim();
    if (this.cache.has(trimmed)) {
      return this.cache.get(trimmed);
    }

    // Опции: IGNORE_URLS (4) + IGNORE_DIGITS (2) = 6
    const options = 6;
    const url = `${this.endpoint}?text=${encodeURIComponent(trimmed)}&lang=${encodeURIComponent(lang)}&options=${options}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Yandex.Speller HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        return [];
      }

      const formattedIssues = data.map(item => ({
        word: item.word,
        pos: item.pos,
        len: item.len,
        suggestion: item.s && item.s.length > 0 ? item.s[0] : null,
        suggestions: item.s || [],
        code: item.code === 2 ? 'REPEATED_WORD' : 'SPELLING_ERROR',
        message: `Возможная орфографическая ошибка: «${item.word}»`,
        severity: 'error'
      }));

      // Cache up to 300 entries
      if (this.cache.size > 300) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(trimmed, formattedIssues);

      return formattedIssues;
    } catch (err) {
      clearTimeout(timer);
      console.warn('[YandexSpeller] Network check failed, falling back to offline morphology:', err.message);
      return null; // Signals fallback to offline engine
    }
  }

  clearCache() {
    this.cache.clear();
  }
}
