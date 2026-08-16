/**
 * Broadcast Typography Linter for Russian & English video titling
 */

export class TypographyLinter {
  constructor(options = {}) {
    this.options = {
      checkQuotes: options.checkQuotes !== false,
      checkDashes: options.checkDashes !== false,
      checkRepeats: options.checkRepeats !== false,
      checkSpaces: options.checkSpaces !== false,
      checkHangingPrepositions: options.checkHangingPrepositions !== false,
      ...options
    };

    // Однобуквенные и двухбуквенные предлоги/союзы русского языка
    this.ruPrepositions = new Set([
      'в', 'на', 'с', 'и', 'к', 'о', 'у', 'за', 'из', 'по', 'от', 'до', 'не', 'но', 'со', 'ко', 'во', 'об', 'а', 'то', 'же', 'ли', 'бы'
    ]);
  }

  lint(text) {
    if (!text || typeof text !== 'string') return [];

    const issues = [];
    const lines = text.split(/\r?\n/);

    // 1. Проверка повторяющихся слов (напр. "в в", "на на", "the the")
    if (this.options.checkRepeats) {
      const words = [];
      const wordRegex = /[\p{L}]+/gu;
      let m;
      while ((m = wordRegex.exec(text)) !== null) {
        words.push({ word: m[0], index: m.index, length: m[0].length });
      }

      for (let i = 0; i < words.length - 1; i++) {
        if (words[i].word.toLowerCase() === words[i + 1].word.toLowerCase()) {
          const between = text.slice(words[i].index + words[i].length, words[i + 1].index);
          // Если между словами только пробелы
          if (/^\s+$/.test(between)) {
            const fullRepeatSnippet = text.slice(words[i].index, words[i + 1].index + words[i + 1].length);
            issues.push({
              type: 'typography',
              code: 'REPEATED_WORD',
              word: fullRepeatSnippet,
              message: `Повторяющееся слово: «${words[i].word} ${words[i + 1].word}»`,
              suggestion: words[i].word,
              suggestions: [words[i].word],
              index: words[i].index,
              length: fullRepeatSnippet.length,
              severity: 'warning'
            });
          }
        }
      }
    }

    // 2. Проверка пробелов перед знаками препинания (напр. "слово ,")
    if (this.options.checkSpaces) {
      const spaceBeforePunctRegex = /\s+([.,;:!?])/g;
      let match;
      while ((match = spaceBeforePunctRegex.exec(text)) !== null) {
        issues.push({
          type: 'typography',
          code: 'SPACE_BEFORE_PUNCTUATION',
          word: match[0],
          message: `Лишний пробел перед знаком препинания: «${match[0]}»`,
          suggestion: match[1],
          suggestions: [match[1]],
          index: match.index,
          length: match[0].length,
          severity: 'warning'
        });
      }

      // Двойные пробелы
      const doubleSpaceRegex = /[^\S\r\n]{2,}/g;
      while ((match = doubleSpaceRegex.exec(text)) !== null) {
        issues.push({
          type: 'typography',
          code: 'MULTIPLE_SPACES',
          word: match[0],
          message: 'Двойной или множественный пробел',
          suggestion: ' ',
          suggestions: [' '],
          index: match.index,
          length: match[0].length,
          severity: 'info'
        });
      }
    }

    // 3. Проверка прямых кавычек вместо русских «елочек» в русскоязычном тексте
    if (this.options.checkQuotes) {
      const straightQuotesRegex = /"([^"\n]+)"/g;
      let match;
      while ((match = straightQuotesRegex.exec(text)) !== null) {
        const hasCyrillic = /[а-яё]/i.test(match[1]);
        if (hasCyrillic) {
          issues.push({
            type: 'typography',
            code: 'STRAIGHT_QUOTES',
            word: match[0],
            message: `Используйте типографические кавычки « » вместо прямых "${match[1]}"`,
            suggestion: `«${match[1]}»`,
            suggestions: [`«${match[1]}»`],
            index: match.index,
            length: match[0].length,
            severity: 'info'
          });
        }
      }
    }

    // 4. Проверка дефиса вместо длинного тире в качестве знака препинания (слово - слово -> слово — слово)
    if (this.options.checkDashes) {
      const hyphenAsDashRegex = /(\s)-(\s)/g;
      let match;
      while ((match = hyphenAsDashRegex.exec(text)) !== null) {
        issues.push({
          type: 'typography',
          code: 'HYPHEN_AS_DASH',
          word: match[0],
          message: 'Используйте длинное тире «—» вместо дефиса «-» с пробелами',
          suggestion: `${match[1]}—${match[2]}`,
          suggestions: [`${match[1]}—${match[2]}`],
          index: match.index,
          length: match[0].length,
          severity: 'info'
        });
      }
    }

    // 5. Висячие предлоги на конце строки (в многострочных текстах)
    if (this.options.checkHangingPrepositions && lines.length > 1) {
      let charOffset = 0;
      for (let lineIndex = 0; lineIndex < lines.length - 1; lineIndex++) {
        const line = lines[lineIndex].trimEnd();
        const lastWordMatch = line.match(/([\p{L}]+)$/iu);
        if (lastWordMatch) {
          const lastWord = lastWordMatch[1].toLowerCase();
          if (this.ruPrepositions.has(lastWord)) {
            const wordIndexInText = charOffset + (lines[lineIndex].length - (lines[lineIndex].length - line.length + lastWordMatch[1].length));
            const oldWord = lastWordMatch[1];
            issues.push({
              type: 'typography',
              code: 'HANGING_PREPOSITION',
              word: oldWord,
              message: `Висячий предлог «${oldWord}» на конце строки. Рекомендуется связать неразрывным пробелом.`,
              suggestion: `${oldWord}\u00A0`,
              suggestions: [`${oldWord}\u00A0`],
              index: wordIndexInText,
              length: oldWord.length,
              severity: 'warning'
            });
          }
        }
        charOffset += lines[lineIndex].length + 1;
      }
    }

    return issues;
  }
}
