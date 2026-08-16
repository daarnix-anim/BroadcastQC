import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ProjectHealthChecker } from '../packages/qc-core/index.js';

describe('Project Health QC Tests', () => {
  const healthChecker = new ProjectHealthChecker();

  test('Detects active Guide Layer', () => {
    const mockLayers = [
      { id: 1, name: 'Grid_Guide', index: 1, guideLayer: true, text: 'Сетка 16x9', font: 'Arial' },
      { id: 2, name: 'Main_Title', index: 2, guideLayer: false, text: 'Заголовок', font: 'Roboto' }
    ];

    const issues = healthChecker.checkLayers(mockLayers);
    assert.ok(issues.some(i => i.code === 'GUIDE_LAYER_ACTIVE'));
  });

  test('Detects missing / fallback font', () => {
    const mockLayers = [
      { id: 1, name: 'Title_Corrupted', index: 1, text: 'Текст', font: 'AdobeBlank' }
    ];

    const issues = healthChecker.checkLayers(mockLayers);
    assert.ok(issues.some(i => i.code === 'MISSING_OR_FALLBACK_FONT'));
    assert.equal(issues[0].severity, 'error');
  });

  test('Detects empty text layer', () => {
    const mockLayers = [
      { id: 1, name: 'Empty_Layer', index: 1, text: '   ', font: 'Arial', enabled: true }
    ];

    const issues = healthChecker.checkLayers(mockLayers);
    assert.ok(issues.some(i => i.code === 'EMPTY_TEXT_LAYER'));
  });
});
