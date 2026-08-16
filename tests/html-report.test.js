import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { HTMLReportGenerator } from '../packages/reporting/index.js';

describe('HTML Report Generator Tests', () => {
  test('Generates self-contained valid HTML document', () => {
    const mockQCReport = {
      timestamp: '2026-08-15T12:00:00Z',
      composition: { name: 'Final_Render_Comp', width: 1920, height: 1080, duration: 15, frameRate: 30 },
      summary: { totalLayersChecked: 5, spellingErrors: 1, safeZoneErrors: 0, totalWarnings: 1, status: 'error' },
      issues: [
        {
          id: 'iss_1',
          category: 'spelling',
          layerName: 'Title_Main',
          timecode: '00:00:02:15',
          message: 'Опечатка в слове «програма»',
          suggestion: 'программа',
          severity: 'error'
        }
      ]
    };

    const html = HTMLReportGenerator.generate(mockQCReport);
    assert.ok(html.includes('<!DOCTYPE html>'));
    assert.ok(html.includes('Final_Render_Comp'));
    assert.ok(html.includes('Title_Main'));
    assert.ok(html.includes('программа'));
    assert.ok(html.includes('ОБНАРУЖЕНЫ ОШИБКИ'));
  });
});
