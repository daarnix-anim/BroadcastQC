/**
 * SpellChecker module for Broadcast QC
 * Fully offline, high-speed spellchecker for Russian and English.
 */

import { RU_DICTIONARY_BASE } from '../dictionaries/ru_base.js';
import { EN_DICTIONARY_BASE } from '../dictionaries/en_base.js';
import { UserDictionary } from './user-dictionary.js';
import { TypographyLinter } from './typography.js';

export class SpellChecker {
  constructor(options = {}) {
    this.userDictionary = options.userDictionary || new UserDictionary();
    this.typographyLinter = options.typographyLinter || new TypographyLinter();
    this.language = options.language || 'auto'; // 'auto', 'ru', 'en'
    this.checkTypography = options.checkTypography !== false;

    // Сеты слов для мгновенного поиска O(1)
    this.ruWords = new Set();
    this.enWords = new Set();

    this.initDictionaries(options.additionalRuWords, options.additionalEnWords);
  }

  initDictionaries(addRu = [], addEn = []) {
    RU_DICTIONARY_BASE.forEach(w => this.ruWords.add(this.normalize(w)));
    EN_DICTIONARY_BASE.forEach(w => this.enWords.add(this.normalize(w)));

    if (Array.isArray(addRu)) {
      addRu.forEach(w => this.ruWords.add(this.normalize(w)));
    }
    if (Array.isArray(addEn)) {
      addEn.forEach(w => this.enWords.add(this.normalize(w)));
    }
  }

  normalize(word) {
    if (!word) return '';
    return word.trim().toLowerCase().replace(/ё/g, 'е');
  }

  /**
   * Разделение текста на токены слов с сохранением позиций
   */
  tokenize(text) {
    if (!text || typeof text !== 'string') return [];

    const tokens = [];
    // Регулярное выражение для извлечения слов (поддержка дефисных слов: по-русски, after-effects)
    const wordRegex = /([a-zA-Zа-яА-ЯёЁ]+(?:-[a-zA-Zа-яА-ЯёЁ]+)*)/g;
    let match;

    while ((match = wordRegex.exec(text)) !== null) {
      const word = match[1];
      const index = match.index;

      // Пропускаем технические токены (URL, спецсимволы, одиночные цифры)
      if (this.isTechnicalToken(word, text, index)) {
        continue;
      }

      tokens.push({
        word: word,
        index: index,
        length: word.length,
        isCyrillic: /[а-яА-ЯёЁ]/.test(word),
        isLatin: /[a-zA-Z]/.test(word)
      });
    }

    return tokens;
  }

  isTechnicalToken(word, fullText, index) {
    // Одиночные буквы латиницы часто являются переменными или индексами
    if (word.length === 1 && /[a-zA-Z]/.test(word)) return true;

    // Проверка на URL или Email рядом
    const before = fullText.slice(Math.max(0, index - 8), index);
    const after = fullText.slice(index + word.length, index + word.length + 8);
    if (/https?:\/\/|www\.|@|\.com|\.ru/i.test(before + word + after)) {
      return true;
    }

    return false;
  }

  /**
   * Проверка слова на корректность
   */
  isWordValid(word) {
    const raw = word.trim();
    if (!raw) return true;

    // 1. Проверка в пользовательском словаре и белом списке
    if (this.userDictionary.has(raw)) {
      return true;
    }

    const norm = this.normalize(raw);

    // 2. Проверка в словарях
    if (this.ruWords.has(norm) || this.enWords.has(norm)) {
      return true;
    }

    // 3. Проверка дефисных слов по частям (например "видео-дизайн", "кино-студия")
    if (norm.includes('-')) {
      const parts = norm.split('-');
      const allPartsValid = parts.every(part => 
        this.ruWords.has(part) || this.enWords.has(part) || this.userDictionary.has(part)
      );
      if (allPartsValid) return true;
    }

    return false;
  }

  /**
   * Расчет расстояния Левенштейна для подсказок
   */
  levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // замена
            matrix[i][j - 1] + 1,     // вставка
            matrix[i - 1][j] + 1      // удаление
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  /**
   * Поиск ближайших вариантов исправлений
   */
  getSuggestions(word, maxCount = 3) {
    const norm = this.normalize(word);
    const isCyrillic = /[а-яА-ЯёЁ]/.test(word);
    const targetDict = isCyrillic ? this.ruWords : this.enWords;

    const scored = [];
    for (const dictWord of targetDict) {
      if (Math.abs(dictWord.length - norm.length) > 2) continue;
      const dist = this.levenshteinDistance(norm, dictWord);
      if (dist <= 2) {
        scored.push({ word: dictWord, dist });
      }
    }

    scored.sort((a, b) => a.dist - b.dist);
    return scored.slice(0, maxCount).map(s => {
      // Сохраняем регистр исходного слова
      if (word[0] === word[0].toUpperCase() && word.slice(1) === word.slice(1).toLowerCase()) {
        return s.word.charAt(0).toUpperCase() + s.word.slice(1);
      }
      if (word === word.toUpperCase()) {
        return s.word.toUpperCase();
      }
      return s.word;
    });
  }

  /**
   * Полная проверка текста
   */
  check(text) {
    if (!text || typeof text !== 'string') {
      return { status: 'ok', issues: [] };
    }

    const issues = [];
    const tokens = this.tokenize(text);

    for (const token of tokens) {
      if (!this.isWordValid(token.word)) {
        const suggestions = this.getSuggestions(token.word);
        issues.push({
          type: 'spelling',
          code: 'SPELLING_ERROR',
          word: token.word,
          suggestion: suggestions[0] || null,
          suggestions: suggestions,
          message: `Возможная орфографическая ошибка: «${token.word}»`,
          index: token.index,
          length: token.length,
          severity: 'error'
        });
      }
    }

    // Проверка правил типографики
    if (this.checkTypography && this.typographyLinter) {
      const typoIssues = this.typographyLinter.lint(text);
      issues.push(...typoIssues);
    }

    let status = 'ok';
    if (issues.some(i => i.severity === 'error')) {
      status = 'error';
    } else if (issues.some(i => i.severity === 'warning')) {
      status = 'warning';
    } else if (issues.length > 0) {
      status = 'info';
    }

    return {
      text,
      status,
      issues
    };
  }
}
