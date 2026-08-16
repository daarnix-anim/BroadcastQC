import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SpellChecker, UserDictionary, TypographyLinter } from '../packages/spelling/index.js';

describe('Spelling Module Tests', () => {
  const spellChecker = new SpellChecker();

  test('Valid Russian sentences should pass without errors', () => {
    const result = spellChecker.check('Новый инновационный видеоролик студии');
    assert.equal(result.status, 'ok');
    assert.equal(result.issues.filter(i => i.severity === 'error').length, 0);
  });

  test('Russian spelling error detection with suggestions', () => {
    const result = spellChecker.check('Инновационные програмы');
    assert.equal(result.status, 'error');
    const issue = result.issues.find(i => i.word === 'програмы');
    assert.ok(issue, 'Should find error for "програмы"');
    assert.equal(issue.severity, 'error');
    assert.ok(issue.suggestions.includes('программы') || issue.suggestions.includes('Программы'));
  });

  test('Default motion terms whitelist should pass', () => {
    const result = spellChecker.check('Рендер в After Effects с плагином Redshift');
    const spellingErrors = result.issues.filter(i => i.type === 'spelling');
    assert.equal(spellingErrors.length, 0);
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

  test('Typography linter: Hanging prepositions in multiline titles', () => {
    const linter = new TypographyLinter();
    const text = 'Главная премьера месяца на\nПервом канале';
    const issues = linter.lint(text);
    
    assert.ok(issues.some(i => i.code === 'HANGING_PREPOSITION'));
  });
});
