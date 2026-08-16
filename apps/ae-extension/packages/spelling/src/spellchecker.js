/**
 * SpellChecker module for Broadcast QC 2.0
 * High-speed hybrid offline & online spellchecker for Russian and English.
 * Combines Russian & English morphological affix engines, comprehensive
 * motion design / broadcast terminology whitelist, user dictionary,
 * and optional Yandex.Speller online verification with graceful fallback.
 */

import { RU_DICTIONARY_BASE } from '../dictionaries/ru_base.js';
import { RU_DICTIONARY_EXPANDED } from '../dictionaries/ru_expanded.js';
import { EN_DICTIONARY_BASE } from '../dictionaries/en_base.js';
import { MOTION_TERMS_WHITELIST } from '../dictionaries/motion_terms.js';
import { ABBREVIATIONS_WHITELIST } from '../dictionaries/abbreviations.js';
import { RussianMorphology } from './morphology-ru.js';
import { EnglishMorphology } from './morphology-en.js';
import { YandexSpellerClient } from './yandex-speller.js';
import { UserDictionary } from './user-dictionary.js';
import { TypographyLinter } from './typography.js';

export class SpellChecker {
  constructor(options = {}) {
    this.userDictionary = options.userDictionary || new UserDictionary();
    this.typographyLinter = options.typographyLinter || new TypographyLinter();
    this.language = options.language || 'auto'; // 'auto', 'ru', 'en'
    this.checkTypography = options.checkTypography !== false;
    this.useOnlineSpeller = options.useOnlineSpeller === true;

    // Fast O(1) Sets
    this.ruWords = new Set();
    this.enWords = new Set();
    this.motionTerms = new Set();
    this.abbreviations = new Set();

    this.ruMorphology = new RussianMorphology(this.ruWords);
    this.enMorphology = new EnglishMorphology(this.enWords);
    this.yandexSpeller = new YandexSpellerClient(options.yandexSpellerOptions || {});

    this.initDictionaries(options.additionalRuWords, options.additionalEnWords);
  }

  initDictionaries(addRu = [], addEn = []) {
    RU_DICTIONARY_BASE.forEach(w => this.ruWords.add(this.normalize(w)));
    RU_DICTIONARY_EXPANDED.forEach(w => this.ruWords.add(this.normalize(w)));
    EN_DICTIONARY_BASE.forEach(w => this.enWords.add(this.normalize(w)));
    MOTION_TERMS_WHITELIST.forEach(w => this.motionTerms.add(this.normalize(w)));
    ABBREVIATIONS_WHITELIST.forEach(w => this.abbreviations.add(this.normalize(w)));

    if (Array.isArray(addRu)) {
      addRu.forEach(w => this.ruWords.add(this.normalize(w)));
    }
    if (Array.isArray(addEn)) {
      addEn.forEach(w => this.enWords.add(this.normalize(w)));
    }

    const combinedRu = new Set([...this.ruWords, ...this.motionTerms, ...this.abbreviations]);
    const combinedEn = new Set([...this.enWords, ...this.motionTerms, ...this.abbreviations]);

    this.ruMorphology.setLexicon(combinedRu);
    this.enMorphology.setLexicon(combinedEn);
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
    // Регулярное выражение для извлечения слов (поддержка дефисных слов: по-русски, after-effects, 4k, mp4)
    const wordRegex = /([a-zA-Zа-яА-ЯёЁ0-9]+(?:-[a-zA-Zа-яА-ЯёЁ0-9]+)*)/g;
    let match;

    while ((match = wordRegex.exec(text)) !== null) {
      const word = match[1];
      const index = match.index;

      // Пропускаем технические токены (чистые числа, форматы, URL, email, спецсимволы)
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
    // Чистые цифры, телефонные номера и числовые диапазоны с дефисами: 2026, 000-00-00, 5/2, 10-20
    if (/^[\d-]+$/.test(word)) {
      return true;
    }

    // Номера домов и строений с литерами: 221B, 5а, 10б, 14-а, 2Б, 3A
    if (/^\d+[-_]?[a-zA-Zа-яА-ЯёЁ]$/.test(word)) {
      return true;
    }

    // Числа с техническими суффиксами: 2026, 4k, 8k, 60fps, 1080p, 100%, 50hz, 32bit, 120fps, rec709
    if (/^\d+(fps|k|p|i|hz|khz|mhz|ghz|mb|gb|tb|kb|px|pt|em|rem|%|s|ms|bit|bitrate|d)?$/i.test(word)) {
      return true;
    }

    // Одиночные буквы (оси X, Y, Z, R, G, B, A, W, H, D)
    if (word.length === 1 && /[a-zA-Z]/.test(word)) return true;

    // Римские цифры (I, II, III, IV, V, VI, VII, VIII, IX, X, XI, XII, XX, XXI)
    if (/^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XX|XXI)$/i.test(word)) return true;

    // Распространенные сокращения и обозначения
    if (/^(rec|hdr|sdr|rgb|rgba|cmyk|fps|uhd|fhd|hd|sd|lut|log|raw|vfx|cg|ai|ae|pr|ps|c4d|dof|ao|dpx|exr|mov|mp4|avi|wav|mp3|aac|flac)$/i.test(word)) {
      return true;
    }

    // Сокращения адресов, единиц измерений и бренды (г., ул., д., руб., тел., g., ul., d. и др.)
    const norm = this.normalize(word);
    if (this.abbreviations.has(norm)) {
      return true;
    }

    // Одиночные буквы с точками рядом: г., д., в., с., g., d.
    const charAfter = fullText.charAt(index + word.length);
    const charBefore = index > 0 ? fullText.charAt(index - 1) : '';
    if (word.length === 1 && (charAfter === '.' || charBefore === '.')) {
      return true;
    }

    // Проверка на URL или Email рядом
    const before = fullText.slice(Math.max(0, index - 10), index);
    const after = fullText.slice(index + word.length, index + word.length + 10);
    if (/https?:\/\/|www\.|@|\.com|\.ru|\.net|\.org|\.io|\.tv/i.test(before + word + after)) {
      return true;
    }

    return false;
  }

  /**
   * Проверка отдельного слова на корректность (Offline morphology + whitelists)
   */
  isWordValid(word) {
    const raw = word.trim();
    if (!raw) return true;

    // 1. Проверка в пользовательском словаре
    if (this.userDictionary.has(raw)) {
      return true;
    }

    const norm = this.normalize(raw);

    // 2. Проверка в словаре терминов моушн-дизайна, брендов и сокращений
    if (this.motionTerms.has(norm) || this.abbreviations.has(norm)) {
      return true;
    }

    // 3. Прямая проверка в базовых словарях
    if (this.ruWords.has(norm) || this.enWords.has(norm)) {
      return true;
    }

    // 4. Морфологический анализ (русский язык)
    if (/[а-яА-ЯёЁ]/.test(norm)) {
      if (this.ruMorphology.isValid(norm)) {
        return true;
      }
    }

    // 5. Морфологический анализ (английский язык)
    if (/[a-zA-Z]/.test(norm)) {
      if (this.enMorphology.isValid(norm)) {
        return true;
      }
    }

    // 6. Проверка дефисных составных слов (видео-дизайн, по-русски, web-дизайнер)
    if (norm.includes('-')) {
      const parts = norm.split('-');
      const allPartsValid = parts.every(part => 
        !part ||
        this.ruWords.has(part) ||
        this.enWords.has(part) ||
        this.motionTerms.has(part) ||
        this.userDictionary.has(part) ||
        this.ruMorphology.isValid(part) ||
        this.enMorphology.isValid(part)
      );
      if (allPartsValid) return true;
    }

    return false;
  }

  /**
   * Расчет расстояния Левенштейна
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
   * Генерация кандидатов словоформ для поиска подсказок
   */
  generateForms(dictWord) {
    const forms = [dictWord];
    if (/[а-яА-ЯёЁ]/.test(dictWord)) {
      // Существительные на -а/-я
      if (dictWord.endsWith('а') || dictWord.endsWith('я')) {
        const stem = dictWord.slice(0, -1);
        forms.push(stem + 'ы', stem + 'и', stem + 'е', stem + 'у', stem + 'ю', stem + 'ой', stem + 'ей', stem + 'ам', stem + 'ям', stem + 'ами', stem + 'ями', stem + 'ах', stem + 'ях');
      }
      // Существительные мужского рода на согласный
      else if (!dictWord.endsWith('ь') && !dictWord.endsWith('о') && !dictWord.endsWith('е')) {
        forms.push(dictWord + 'а', dictWord + 'у', dictWord + 'ом', dictWord + 'е', dictWord + 'ы', dictWord + 'и', dictWord + 'ов', dictWord + 'ев', dictWord + 'ам', dictWord + 'ами', dictWord + 'ах');
      }
    }
    return forms;
  }

  /**
   * Поиск ближайших вариантов исправлений
   */
  getSuggestions(word, maxCount = 4) {
    const norm = this.normalize(word);
    const isCyrillic = /[а-яА-ЯёЁ]/.test(word);
    const targetDict = isCyrillic ? this.ruWords : this.enWords;

    const scored = [];
    const checkPool = new Set([...targetDict, ...this.motionTerms]);

    for (const dictWord of checkPool) {
      if (Math.abs(dictWord.length - norm.length) > 3) continue;

      const forms = this.generateForms(dictWord);
      for (const form of forms) {
        if (Math.abs(form.length - norm.length) > 2) continue;
        const startsMatch = form[0] === norm[0];
        const maxAllowedDist = startsMatch ? 2 : 1;

        const dist = this.levenshteinDistance(norm, form);
        if (dist <= maxAllowedDist) {
          scored.push({ word: form, dist: dist - (startsMatch ? 0.3 : 0) });
        }
      }
    }

    scored.sort((a, b) => a.dist - b.dist);

    // Удаляем дубликаты
    const seen = new Set();
    const unique = [];
    for (const s of scored) {
      if (!seen.has(s.word)) {
        seen.add(s.word);
        unique.push(s);
      }
    }

    return unique.slice(0, maxCount).map(s => {
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
   * Синхронная оффлайн проверка текста
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

  /**
   * Асинхронная гибридная проверка (с поддержкой Яндекс.Спеллера)
   */
  async checkAsync(text) {
    if (!text || typeof text !== 'string') {
      return { status: 'ok', issues: [] };
    }

    // Если включена онлайн-проверка через Яндекс
    if (this.useOnlineSpeller) {
      const onlineResults = await this.yandexSpeller.checkText(text);

      // Если Яндекс успешно ответил
      if (Array.isArray(onlineResults)) {
        const issues = [];

        // Фильтруем результаты Яндекса: исключаем термины из белого списка и пользовательского словаря
        for (const item of onlineResults) {
          if (!this.userDictionary.has(item.word) && !this.motionTerms.has(this.normalize(item.word))) {
            issues.push({
              type: 'spelling',
              code: item.code,
              word: item.word,
              suggestion: item.suggestion,
              suggestions: item.suggestions,
              message: item.message,
              index: item.pos,
              length: item.len,
              severity: item.severity
            });
          }
        }

        // Добавляем проверку типографики
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

        return { text, status, issues };
      }
    }

    // Если онлайн выключен или вернул null (фолбэк на оффлайн морфологию)
    return this.check(text);
  }
}
