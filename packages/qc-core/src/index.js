/**
 * Broadcast QC Core Engine 2.0
 * Coordinates Spelling, Typography, Stable State Detection, Safe Zone,
 * Reading Speed, Project Health, AI Logic Agent, and HTML Reporting.
 */

import { SpellChecker, UserDictionary, TypographyLinter } from '../../spelling/index.js';
import { StableStateDetector } from '../../stable-state/index.js';
import { SafeZoneChecker, BROADCAST_PRESETS } from '../../safe-zone/index.js';
import { ReadingSpeedChecker } from './reading-speed.js';
import { ProjectHealthChecker } from './project-health.js';
import { AIAgent } from '../../ai/index.js';
import { HTMLReportGenerator } from '../../reporting/index.js';

export class BroadcastQCCore {
  constructor(options = {}) {
    this.userDictionary = options.userDictionary || new UserDictionary();
    this.typographyLinter = options.typographyLinter || new TypographyLinter();
    this.spellChecker = new SpellChecker({
      userDictionary: this.userDictionary,
      typographyLinter: this.typographyLinter
    });

    this.stableDetector = new StableStateDetector(options.stableStateOptions || {});

    const safePreset = options.safeZonePreset || BROADCAST_PRESETS.EBU_R95_TITLE_SAFE;
    this.safeZoneChecker = new SafeZoneChecker({
      preset: safePreset,
      customMarginPx: options.customMarginPx,
      customMarginPercent: options.customMarginPercent
    });

    this.readingSpeedChecker = new ReadingSpeedChecker(options.readingSpeedOptions || {});
    this.projectHealthChecker = new ProjectHealthChecker(options.projectHealthOptions || {});
    this.aiAgent = options.aiAgent || new AIAgent(options.aiConfig || { provider: 'none' });

    this.options = {
      checkSpelling: options.checkSpelling !== false,
      checkSafeZone: options.checkSafeZone === true,
      checkReadingSpeed: options.checkReadingSpeed !== false,
      checkProjectHealth: options.checkProjectHealth !== false,
      useAI: options.useAI === true,
      ...options
    };
  }

  /**
   * Запуск полного контроля качества над просканированной композицией
   * @param {Object} scanData - данные, собранные ExtendScript адаптером
   */
  async analyze(scanData) {
    if (!scanData || !scanData.composition || !Array.isArray(scanData.layers)) {
      return {
        success: false,
        error: 'Некорректные данные композиции',
        summary: { totalLayers: 0, errors: 0, warnings: 0 },
        issues: []
      };
    }

    const comp = scanData.composition;
    const layers = scanData.layers;
    const issues = [];

    let totalSpellingErrors = 0;
    let totalTypographyWarnings = 0;
    let totalSafeZoneErrors = 0;
    let totalStableStates = 0;
    let totalReadingWarnings = 0;
    let totalHealthIssues = 0;
    let totalAIIssues = 0;

    // 1. Технический аудит проекта (Guide layers, Missing Fonts, Empty layers)
    if (this.options.checkProjectHealth) {
      const healthIssues = this.projectHealthChecker.checkLayers(layers);
      for (const h of healthIssues) {
        totalHealthIssues++;
        issues.push({
          id: `issue_${issues.length + 1}`,
          category: 'health',
          layerId: h.layerId,
          layerName: h.layerName,
          layerIndex: h.layerIndex,
          compId: h.compId || comp.id || 0,
          compName: h.compName || comp.name,
          parentCompName: h.parentCompName || '',
          isNested: !!h.parentCompName,
          time: 0,
          timecode: '00:00:00:00',
          message: h.message,
          severity: h.severity
        });
      }
    }

    // 2. Обработка каждого текстового слоя
    for (const layer of layers) {
      const layerIssues = [];
      const duration = Math.max(0, (layer.outPoint || 0) - (layer.inPoint || 0));
      const layerCompId = layer.compId || comp.id || 0;
      const layerCompName = layer.compName || comp.name;
      const parentCompName = layer.parentCompName || '';
      const isNested = !!parentCompName || !!layer.isNested;

      // 2.1. Проверка правописания и типографики
      if (this.options.checkSpelling && layer.text) {
        const spellResult = await this.spellChecker.checkAsync(layer.text);
        if (spellResult.issues && spellResult.issues.length > 0) {
          for (const item of spellResult.issues) {
            if (item.severity === 'error') totalSpellingErrors++;
            if (item.severity === 'warning' || item.severity === 'info') totalTypographyWarnings++;

            layerIssues.push({
              id: `issue_${issues.length + layerIssues.length + 1}`,
              category: item.type,
              layerId: layer.id,
              layerName: layer.name,
              layerIndex: layer.index,
              compId: layerCompId,
              compName: layerCompName,
              parentCompName,
              isNested,
              time: layer.inPoint || 0,
              timecode: this.formatTimecode(layer.inPoint || 0, comp.frameRate || 30),
              message: item.message,
              word: item.word || null,
              suggestion: item.suggestion || null,
              suggestions: item.suggestions || [],
              severity: item.severity,
              canAutoFix: !!item.suggestion
            });
          }
        }

        // Анимированные вариации текста
        if (Array.isArray(layer.textVariations)) {
          for (const variation of layer.textVariations) {
            if (variation.text !== layer.text) {
              const varSpell = await this.spellChecker.checkAsync(variation.text);
              for (const item of varSpell.issues) {
                if (item.severity === 'error') totalSpellingErrors++;
                if (item.severity === 'warning') totalTypographyWarnings++;

                layerIssues.push({
                  id: `issue_${issues.length + layerIssues.length + 1}`,
                  category: item.type,
                  layerId: layer.id,
                  layerName: layer.name,
                  layerIndex: layer.index,
                  compId: layerCompId,
                  compName: layerCompName,
                  parentCompName,
                  isNested,
                  time: variation.time || 0,
                  timecode: this.formatTimecode(variation.time || 0, comp.frameRate || 30),
                  message: `${item.message} (в анимированном кадре)`,
                  word: item.word || null,
                  suggestion: item.suggestion || null,
                  suggestions: item.suggestions || [],
                  severity: item.severity,
                  canAutoFix: false
                });
              }
            }
          }
        }
      }

      // 2.2. Проверка скорости чтения (Reading Speed QC)
      if (this.options.checkReadingSpeed && layer.text && layer.enabled && !layer.guideLayer) {
        const speedRes = this.readingSpeedChecker.check(layer.text, duration);
        if (speedRes.issues.length > 0) {
          for (const spIssue of speedRes.issues) {
            totalReadingWarnings++;
            layerIssues.push({
              id: `issue_${issues.length + layerIssues.length + 1}`,
              category: 'reading-speed',
              layerId: layer.id,
              layerName: layer.name,
              layerIndex: layer.index,
              compId: layerCompId,
              compName: layerCompName,
              parentCompName,
              isNested,
              time: layer.inPoint || 0,
              timecode: this.formatTimecode(layer.inPoint || 0, comp.frameRate || 30),
              message: spIssue.message,
              severity: spIssue.severity
            });
          }
        }
      }

      // 2.3. Проверка Safe Zone только в Stable States
      if (this.options.checkSafeZone && Array.isArray(layer.samples) && layer.samples.length > 0) {
        const stableStates = this.stableDetector.detect(layer.samples);
        totalStableStates += stableStates.length;

        for (const state of stableStates) {
          const checkSample = state.checkSample;
          if (checkSample && checkSample.compAABB) {
            const szResult = this.safeZoneChecker.check(
              checkSample.compAABB,
              comp.width,
              comp.height
            );

            if (!szResult.passed) {
              totalSafeZoneErrors += szResult.violations.length;
              for (const v of szResult.violations) {
                layerIssues.push({
                  id: `issue_${issues.length + layerIssues.length + 1}`,
                  category: 'safe-zone',
                  layerId: layer.id,
                  layerName: layer.name,
                  layerIndex: layer.index,
                  compId: layerCompId,
                  compName: layerCompName,
                  parentCompName,
                  isNested,
                  time: state.checkTime,
                  timecode: this.formatTimecode(state.checkTime, comp.frameRate || 30),
                  message: `Выход за ${v.sideName} Safe Zone на ${v.overflowPx} px (в стабильном состоянии)`,
                  overflowPx: v.overflowPx,
                  side: v.side,
                  severity: 'error',
                  stateInfo: {
                    startTime: state.startTime,
                    endTime: state.endTime,
                    duration: state.duration
                  }
                });
              }
            }
          }
        }
      }

      issues.push(...layerIssues);
    }

    // 3. AI Смысловой анализ (если включен пользователем)
    if (this.options.useAI && this.aiAgent && this.aiAgent.provider !== 'none') {
      const validTextLayers = layers.filter(l => l.text && l.text.trim().length > 0 && l.enabled);
      const aiResult = await this.aiAgent.analyze(validTextLayers);
      if (aiResult && Array.isArray(aiResult.issues)) {
        for (const aiIss of aiResult.issues) {
          totalAIIssues++;
          issues.push(aiIss);
        }
      }
    }

    const totalErrors = issues.filter(i => i.severity === 'error').length;
    const totalWarnings = issues.filter(i => i.severity === 'warning').length;
    const totalInfo = issues.filter(i => i.severity === 'info').length;

    let overallStatus = 'passed';
    if (totalErrors > 0) {
      overallStatus = 'error';
    } else if (totalWarnings > 0 || totalInfo > 0) {
      overallStatus = 'warning';
    }

    const reportObj = {
      success: true,
      timestamp: new Date().toISOString(),
      composition: {
        name: comp.name,
        width: comp.width,
        height: comp.height,
        duration: comp.duration,
        frameRate: comp.frameRate
      },
      summary: {
        totalLayersChecked: layers.length,
        totalStableStatesChecked: totalStableStates,
        spellingErrors: totalSpellingErrors,
        typographyWarnings: totalTypographyWarnings,
        safeZoneErrors: totalSafeZoneErrors,
        readingSpeedWarnings: totalReadingWarnings,
        healthIssues: totalHealthIssues,
        aiIssues: totalAIIssues,
        totalErrors,
        totalWarnings,
        totalInfo,
        status: overallStatus
      },
      issues
    };

    return reportObj;
  }

  generateHTMLReport(reportObj) {
    return HTMLReportGenerator.generate(reportObj);
  }

  formatTimecode(timeInSeconds, fps = 30) {
    const totalFrames = Math.round(timeInSeconds * fps);
    const frames = totalFrames % Math.round(fps);
    const totalSeconds = Math.floor(totalFrames / fps);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600);

    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
  }
}
