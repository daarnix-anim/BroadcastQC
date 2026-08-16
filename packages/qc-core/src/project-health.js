/**
 * Project Health QC Checker
 * Inspects layers for Guide Layers, Missing/Fallback Fonts, and hidden empty layers.
 */

export class ProjectHealthChecker {
  constructor(options = {}) {
    this.options = {
      warnGuideLayers: options.warnGuideLayers !== false,
      warnMissingFonts: options.warnMissingFonts !== false,
      warnEmptyLayers: options.warnEmptyLayers !== false,
      ...options
    };
  }

  /**
   * Проверка технических параметров слоев композиции
   * @param {Array<Object>} layers - список слоев композиции
   */
  checkLayers(layers) {
    if (!Array.isArray(layers)) return [];

    const issues = [];

    for (const layer of layers) {
      // 1. Проверка Guide Layers (направляющие слои)
      if (this.options.warnGuideLayers && layer.guideLayer) {
        issues.push({
          type: 'health',
          code: 'GUIDE_LAYER_ACTIVE',
          layerId: layer.id,
          layerName: layer.name,
          layerIndex: layer.index,
          message: `Слой «${layer.name}» помечен как Guide Layer. Он не попадет в финальный рендер композиции.`,
          severity: 'info'
        });
      }

      // 2. Проверка слетевших шрифтов (Missing / Adobe Blank / Courier fallback)
      if (this.options.warnMissingFonts && layer.font) {
        const fontName = String(layer.font).toLowerCase();
        if (fontName.includes('adobeblank') || fontName.includes('courier') || layer.fontMissing) {
          issues.push({
            type: 'health',
            code: 'MISSING_OR_FALLBACK_FONT',
            layerId: layer.id,
            layerName: layer.name,
            layerIndex: layer.index,
            message: `Возможно слетел шрифт для слоя «${layer.name}» (используется «${layer.font}»).`,
            severity: 'error'
          });
        }
      }

      // 3. Пустые текстовые слои
      if (this.options.warnEmptyLayers && layer.text !== undefined && layer.text.trim().length === 0 && layer.enabled) {
        issues.push({
          type: 'health',
          code: 'EMPTY_TEXT_LAYER',
          layerId: layer.id,
          layerName: layer.name,
          layerIndex: layer.index,
          message: `Текстовый слой «${layer.name}» пуст, но активен на таймлайне.`,
          severity: 'info'
        });
      }
    }

    return issues;
  }
}
