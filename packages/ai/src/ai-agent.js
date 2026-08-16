/**
 * AI QC Agent Connector
 * Supports Local Ollama, LM Studio, OpenAI-compatible APIs (DeepSeek, ChatGPT, etc.)
 */

import { QC_SYSTEM_PROMPT, buildUserPrompt } from './prompts.js';

export class AIAgent {
  constructor(config = {}) {
    this.provider = config.provider || 'none'; // 'none' | 'ollama' | 'lm_studio' | 'openai' | 'custom'
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.model = config.model || 'llama3:8b';
    this.apiKey = config.apiKey || '';
    this.timeout = config.timeout || 20000;
  }

  /**
   * Проверка доступности AI сервера
   */
  async checkConnection() {
    if (this.provider === 'none') {
      return { available: false, message: 'AI провайдер отключен в настройках' };
    }

    try {
      let url = `${this.baseUrl}/api/tags`;
      if (this.provider === 'lm_studio' || this.provider === 'openai' || this.provider === 'custom') {
        url = `${this.baseUrl}/v1/models`;
      }

      const headers = {};
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(id);

      if (res.ok) {
        return { available: true, message: `Подключено к ${this.provider} (${this.baseUrl})` };
      }
      return { available: false, message: `Ошибка сервера: HTTP ${res.status}` };
    } catch (e) {
      return { available: false, message: `Сервер недоступен (${e.message})` };
    }
  }

  /**
   * Анализ текстовых слоев проекта с помощью LLM
   * @param {Array<Object>} layers - массив слоев с текстом
   */
  async analyze(layers) {
    if (this.provider === 'none' || !Array.isArray(layers) || layers.length === 0) {
      return { success: true, issues: [] };
    }

    const userPrompt = buildUserPrompt(layers);

    try {
      let responseText = '';

      if (this.provider === 'ollama') {
        // Ollama API endpoint
        const res = await fetch(`${this.baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.model,
            system: QC_SYSTEM_PROMPT,
            prompt: userPrompt,
            stream: false,
            format: 'json'
          })
        });

        if (!res.ok) throw new Error(`Ollama error HTTP ${res.status}`);
        const data = await res.json();
        responseText = data.response;
      } else {
        // OpenAI-compatible / LM Studio endpoint
        const url = `${this.baseUrl}/v1/chat/completions`;
        const headers = { 'Content-Type': 'application/json' };
        if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;

        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: 'system', content: QC_SYSTEM_PROMPT },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.1
          })
        });

        if (!res.ok) throw new Error(`LLM API error HTTP ${res.status}`);
        const data = await res.json();
        responseText = data.choices && data.choices[0] ? data.choices[0].message.content : '';
      }

      // Парсинг JSON ответа от LLM
      const parsed = this.parseLLMResponse(responseText, layers);
      return {
        success: true,
        issues: parsed
      };
    } catch (err) {
      console.warn('AI Agent execution warning:', err.message);
      return {
        success: false,
        error: err.message,
        issues: []
      };
    }
  }

  /**
   * Надежный парсер JSON с очисткой от markdown
   */
  parseLLMResponse(rawText, layers) {
    if (!rawText) return [];

    let cleaned = rawText.trim();
    // Удаляем markdown обертку ```json ... ```
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    try {
      const data = JSON.parse(cleaned);
      const rawIssues = Array.isArray(data) ? data : (data.issues || []);

      return rawIssues.map((item, idx) => {
        // Сопоставляем с реальным слоем, если возможно
        const matchedLayer = layers.find(l => 
          (item.layerName && l.name === item.layerName) || 
          (item.originalText && l.text.includes(item.originalText))
        ) || layers[0] || {};

        return {
          id: `ai_issue_${idx + 1}`,
          category: 'ai-logic',
          layerId: matchedLayer.id || null,
          layerName: matchedLayer.name || item.layerName || 'Текстовый слой',
          layerIndex: matchedLayer.index || 1,
          compIndex: matchedLayer.compIndex || 1,
          time: matchedLayer.inPoint || 0,
          timecode: matchedLayer.timecode || '00:00:00:00',
          message: item.problem || 'Смысловая неточность',
          suggestion: item.suggestion || null,
          severity: item.severity === 'error' ? 'error' : 'warning',
          isAI: true
        };
      });
    } catch (parseErr) {
      console.warn('Failed to parse AI JSON response, raw:', rawText);
      return [];
    }
  }
}
