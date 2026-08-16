import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SpellChecker, UserDictionary, TypographyLinter, RussianMorphology, EnglishMorphology } from '../packages/spelling/index.js';

describe('Spelling Module Tests', () => {
  const spellChecker = new SpellChecker();

  test('Valid Russian sentences with inflections and prefixes should pass without errors', () => {
    const sentences = [
      'Новый инновационный видеоролик студии',
      'Добро пожаловать на наш вебинар по моушн-дизайну',
      'Подписывайтесь на канал и ставьте лайки',
      'Создание красивой анимации титров для телеканала',
      'Проверяем качество отрендеренного видео в высоком разрешении',
      'Официальное трудоустройство, график работы 5/2, корпоративный транспорт до склада',
      'Складской комплекс и современный офис в центре города',
      'Здесь можно получить бесплатный подарок и бесплатную доставку',
      'Нужно обязательно проверить все слои, нельзя оставлять ошибки',
      'Комфортный глэмпинг и апартаменты рядом с озером',
      'Забронировать номер в гостиницу, посетить ресторан и спортивную площадку',
      'Подземные паркинги и большой выбор уютных номеров'
    ];

    for (const text of sentences) {
      const result = spellChecker.check(text);
      const spellingErrors = result.issues.filter(i => i.severity === 'error');
      assert.equal(spellingErrors.length, 0, `Failed for sentence: "${text}", found errors: ${JSON.stringify(spellingErrors)}`);
    }
  });

  test('Address and postal abbreviations should pass without errors', () => {
    const addresses = [
      'г. Москва, ул. Ленина, д. 5, стр. 2, кв. 14',
      'Адрес: г. Санкт-Петербург, пр. Мира, дом 10, корп. 1, оф. 305, тел. +7 (999) 000-00-00',
      'g. London, ul. Baker, d. 221B, apt. 4, tel. 123456',
      'Стоимость: 5000 руб. за 10 шт. (скидка 10% в пн-пт)'
    ];

    for (const text of addresses) {
      const result = spellChecker.check(text);
      const spellingErrors = result.issues.filter(i => i.severity === 'error');
      assert.equal(spellingErrors.length, 0, `Failed for address: "${text}", found errors: ${JSON.stringify(spellingErrors)}`);
    }
  });

  test('Russian morphology engine handles noun cases, verbs and adjectives', () => {
    const ru = new RussianMorphology(spellChecker.ruWords);

    // Inflections of "программа"
    assert.ok(ru.isValid('программами'));
    assert.ok(ru.isValid('программах'));
    assert.ok(ru.isValid('программе'));

    // Inflections of "создавать" / "создать"
    assert.ok(ru.isValid('создавали'));
    assert.ok(ru.isValid('создающего'));
    assert.ok(ru.isValid('созданный'));

    // Inflections of corporate & job terms
    assert.ok(ru.isValid('официальное'));
    assert.ok(ru.isValid('корпоративный'));
    assert.ok(ru.isValid('складе'));
    assert.ok(ru.isValid('график'));
    assert.ok(ru.isValid('транспорт'));

    // Prefixes
    assert.ok(ru.isValid('перепроверить'));
    assert.ok(ru.isValid('необычный'));
    assert.ok(ru.isValid('посмотреть'));
  });

  test('English morphology engine handles plurals, tenses and adverbs', () => {
    const en = new EnglishMorphology(spellChecker.enWords);

    assert.ok(en.isValid('rendered'));
    assert.ok(en.isValid('keyframes'));
    assert.ok(en.isValid('animating'));
    assert.ok(en.isValid('smoothly'));
    assert.ok(en.isValid('uncompressed'));
  });

  test('Russian spelling error detection with suggestions', () => {
    const result = spellChecker.check('Инновационные програмы');
    assert.equal(result.status, 'error');
    const issue = result.issues.find(i => i.word === 'програмы');
    assert.ok(issue, 'Should find error for "програмы"');
    assert.equal(issue.severity, 'error');
    assert.ok(issue.suggestions.some(s => s.toLowerCase() === 'программы'));
  });

  test('Default motion terms, codecs and brands whitelist should pass', () => {
    const texts = [
      'Рендер в After Effects с плагином Redshift и LUT',
      'Экспорт ProRes 422 4K 60fps в Rec.709',
      'Кейфреймы и шейпы на таймлайне в премьере',
      'Альфа-канал и трекинг маски в композиции'
    ];

    for (const text of texts) {
      const result = spellChecker.check(text);
      const spellingErrors = result.issues.filter(i => i.type === 'spelling');
      assert.equal(spellingErrors.length, 0, `Unexpected errors in: "${text}"`);
    }
  });

  test('User Dictionary dynamic additions and removals', () => {
    const userDict = new UserDictionary();
    const customChecker = new SpellChecker({ userDictionary: userDict });

    // Word not yet in dictionary
    const res1 = customChecker.check('Новый сервис СуперВьюер');
    assert.ok(res1.issues.some(i => i.word === 'СуперВьюер'));

    // Add to dictionary
    userDict.add('СуперВьюер');
    const res2 = customChecker.check('Новый сервис СуперВьюер');
    assert.ok(!res2.issues.some(i => i.word === 'СуперВьюер'));
  });

  test('Typography linter: Repeated words and spacing', () => {
    const linter = new TypographyLinter();
    const issues = linter.lint('Внимание в в эфире !');
    
    assert.ok(issues.some(i => i.code === 'REPEATED_WORD'));
    assert.ok(issues.some(i => i.code === 'SPACE_BEFORE_PUNCTUATION'));
  });

  test('Typography linter: Safe text replacement without wiping layer', () => {
    const linter = new TypographyLinter();
    const originalText = 'Корпоративный транспорт - лучший выбор для сотрудников';
    const issues = linter.lint(originalText);
    
    const dashIssue = issues.find(i => i.code === 'HYPHEN_AS_DASH');
    assert.ok(dashIssue, 'Should find HYPHEN_AS_DASH issue');
    assert.ok(dashIssue.word, 'Should contain word/oldText property');
    assert.equal(dashIssue.word, ' - ');
    assert.equal(dashIssue.suggestion, ' — ');

    // Test replacement simulation (how AE executes it)
    const fixedText = originalText.split(dashIssue.word).join(dashIssue.suggestion);
    assert.equal(fixedText, 'Корпоративный транспорт — лучший выбор для сотрудников');
  });

  test('Typography linter: Hanging prepositions in multiline titles', () => {
    const linter = new TypographyLinter();
    const text = 'Главная премьера месяца на\nПервом канале';
    const issues = linter.lint(text);
    
    assert.ok(issues.some(i => i.code === 'HANGING_PREPOSITION'));
  });

  test('Async hybrid spellcheck works seamlessly', async () => {
    const res = await spellChecker.checkAsync('Отрендеренный видеоролик в After Effects');
    assert.equal(res.status, 'ok');
    assert.equal(res.issues.filter(i => i.severity === 'error').length, 0);
  });
});
