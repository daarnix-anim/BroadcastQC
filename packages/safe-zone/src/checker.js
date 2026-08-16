/**
 * Safe Zone Checker for Broadcast and Motion Graphics QC
 * Validates layer bounding boxes against standard and custom TV safe zones.
 */

export const BROADCAST_PRESETS = {
  EBU_R95_TITLE_SAFE: {
    id: 'ebu_r95_title',
    name: 'EBU R95 Title Safe (90%)',
    description: 'Европейский вещательный стандарт Title Safe (5% отступ с каждой стороны)',
    marginPercent: { top: 5, bottom: 5, left: 5, right: 5 }
  },
  EBU_R95_ACTION_SAFE: {
    id: 'ebu_r95_action',
    name: 'EBU R95 Action Safe (93%)',
    description: 'Европейский вещательный стандарт Action Safe (3.5% отступ с каждой стороны)',
    marginPercent: { top: 3.5, bottom: 3.5, left: 3.5, right: 3.5 }
  },
  SMPTE_TITLE_SAFE_80: {
    id: 'smpte_title_80',
    name: 'SMPTE RP 218 Title Safe (80%)',
    description: 'Классический стандарт для эфирного ТВ (10% отступ)',
    marginPercent: { top: 10, bottom: 10, left: 10, right: 10 }
  },
  SMPTE_ACTION_SAFE_90: {
    id: 'smpte_action_90',
    name: 'SMPTE RP 218 Action Safe (90%)',
    description: 'Классический стандарт Action Safe (5% отступ)',
    marginPercent: { top: 5, bottom: 5, left: 5, right: 5 }
  },
  SOCIAL_VERTICAL_9_16: {
    id: 'social_vertical_9_16',
    name: 'Social Vertical 9:16 (UI Safe)',
    description: 'Безопасная зона для вертикальных видео (учет элементов интерфейса соцсетей)',
    marginPercent: { top: 12, bottom: 22, left: 8, right: 15 }
  }
};

export class SafeZoneChecker {
  constructor(config = {}) {
    this.preset = config.preset || BROADCAST_PRESETS.EBU_R95_TITLE_SAFE;
    this.customMarginPx = config.customMarginPx || null;
    this.customMarginPercent = config.customMarginPercent || null;
  }

  /**
   * Вычисление прямоугольника безопасной зоны в пикселях композиции
   */
  getSafeArea(compWidth, compHeight) {
    let top = 0, bottom = 0, left = 0, right = 0;

    if (this.customMarginPx) {
      left = this.customMarginPx.left || 0;
      right = this.customMarginPx.right || 0;
      top = this.customMarginPx.top || 0;
      bottom = this.customMarginPx.bottom || 0;
    } else if (this.customMarginPercent) {
      left = (compWidth * (this.customMarginPercent.left || 0)) / 100;
      right = (compWidth * (this.customMarginPercent.right || 0)) / 100;
      top = (compHeight * (this.customMarginPercent.top || 0)) / 100;
      bottom = (compHeight * (this.customMarginPercent.bottom || 0)) / 100;
    } else if (this.preset && this.preset.marginPercent) {
      const p = this.preset.marginPercent;
      left = (compWidth * p.left) / 100;
      right = (compWidth * p.right) / 100;
      top = (compHeight * p.top) / 100;
      bottom = (compHeight * p.bottom) / 100;
    }

    return {
      left: Math.round(left),
      top: Math.round(top),
      right: Math.round(compWidth - right),
      bottom: Math.round(compHeight - bottom),
      width: Math.round(compWidth - left - right),
      height: Math.round(compHeight - top - bottom)
    };
  }

  /**
   * Проверка AABB прямоугольника слоя на выход за границы Safe Zone
   */
  check(compAABB, compWidth, compHeight) {
    if (!compAABB || !compWidth || !compHeight) {
      return { status: 'ok', passed: true, violations: [], maxOverflow: 0 };
    }

    const safeArea = this.getSafeArea(compWidth, compHeight);
    const violations = [];

    // 1. Левая граница
    if (compAABB.left < safeArea.left) {
      const overflow = Number((safeArea.left - compAABB.left).toFixed(1));
      violations.push({
        side: 'left',
        sideName: 'Левая граница',
        overflowPx: overflow,
        safeBound: safeArea.left,
        layerBound: Number(compAABB.left.toFixed(1))
      });
    }

    // 2. Верхняя граница
    if (compAABB.top < safeArea.top) {
      const overflow = Number((safeArea.top - compAABB.top).toFixed(1));
      violations.push({
        side: 'top',
        sideName: 'Верхняя граница',
        overflowPx: overflow,
        safeBound: safeArea.top,
        layerBound: Number(compAABB.top.toFixed(1))
      });
    }

    // 3. Правая граница
    if (compAABB.right > safeArea.right) {
      const overflow = Number((compAABB.right - safeArea.right).toFixed(1));
      violations.push({
        side: 'right',
        sideName: 'Правая граница',
        overflowPx: overflow,
        safeBound: safeArea.right,
        layerBound: Number(compAABB.right.toFixed(1))
      });
    }

    // 4. Нижняя граница
    if (compAABB.bottom > safeArea.bottom) {
      const overflow = Number((compAABB.bottom - safeArea.bottom).toFixed(1));
      violations.push({
        side: 'bottom',
        sideName: 'Нижняя граница',
        overflowPx: overflow,
        safeBound: safeArea.bottom,
        layerBound: Number(compAABB.bottom.toFixed(1))
      });
    }

    const passed = violations.length === 0;
    const maxOverflow = violations.length > 0 ? Math.max(...violations.map(v => v.overflowPx)) : 0;

    return {
      status: passed ? 'ok' : 'error',
      passed,
      violations,
      maxOverflow,
      safeArea,
      compSize: { width: compWidth, height: compHeight }
    };
  }
}
