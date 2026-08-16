import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AIAgent } from '../packages/ai/index.js';

describe('AI Agent Module Tests', () => {
  test('Provider none returns empty list without error', async () => {
    const agent = new AIAgent({ provider: 'none' });
    const res = await agent.analyze([{ name: 'Title', text: 'Инновации' }]);
    assert.equal(res.success, true);
    assert.equal(res.issues.length, 0);
  });

  test('Parses raw LLM markdown JSON response correctly', () => {
    const agent = new AIAgent({ provider: 'ollama' });
    const mockLLMOutput = '```json\n{\n  "issues": [\n    {\n      "layerName": "Title_1",\n      "originalText": "31 февраля",\n      "problem": "Несуществующая календарная дата",\n      "suggestion": "28 февраля",\n      "severity": "error"\n    }\n  ]\n}\n```';

    const layers = [{ id: 1, name: 'Title_1', text: 'Открытие 31 февраля' }];
    const parsed = agent.parseLLMResponse(mockLLMOutput, layers);

    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].layerName, 'Title_1');
    assert.equal(parsed[0].message, 'Несуществующая календарная дата');
    assert.equal(parsed[0].suggestion, '28 февраля');
    assert.equal(parsed[0].severity, 'error');
  });
});
