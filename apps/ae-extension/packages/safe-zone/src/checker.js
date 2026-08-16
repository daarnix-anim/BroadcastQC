/**
 * Safe Zone Checker for Broadcast and Social Media QC
 * Validates layer bounding boxes against standard TV and complex Social Media Safe Zones
 * (Instagram Reels/Stories, TikTok, VK Клипы/Истории, YouTube Shorts, Facebook Reels).
 */

export const BROADCAST_PRESETS = {
  // --- Соцсети и вертикальные форматы (Reels, TikTok, VK, Shorts) ---
  INSTAGRAM_REELS_9_16: {
    id: 'instagram_reels_9_16',
    name: 'Instagram Reels (9:16 - 1080x1920)',
    description: 'Интерфейс Instagram Reels: верхняя шапка (камера/аудио), нижний блок (автор, описание, музыка, CTA) и правый столбец кнопок (лайк, комменты, репост)',
    aspectRatio: '9:16',
    aspectLabel: '9:16 REELS',
    marginPercent: { top: 13, bottom: 23, left: 6, right: 16 },
    cutouts: [
      { id: 'top_header', name: 'Шапка Reels (камера/аудио)', leftPct: 0, rightPct: 100, topPct: 0, bottomPct: 13 },
      { id: 'bottom_caption', name: 'Описание, автор, звук и CTA', leftPct: 0, rightPct: 100, topPct: 77, bottomPct: 100 },
      { id: 'right_actions', name: 'Боковые кнопки (лайк, комменты, репост, аудио)', leftPct: 84, rightPct: 100, topPct: 44, bottomPct: 80 }
    ]
  },
  INSTAGRAM_STORIES_9_16: {
    id: 'instagram_stories_9_16',
    name: 'Instagram Stories (9:16 - 1080x1920)',
    description: 'Интерфейс Instagram Stories: индикаторы историй сверху и строка ответа/реакций снизу',
    aspectRatio: '9:16',
    aspectLabel: '9:16 STORIES',
    marginPercent: { top: 14, bottom: 14, left: 6, right: 6 },
    cutouts: [
      { id: 'top_header', name: 'Индикаторы историй и профиль', leftPct: 0, rightPct: 100, topPct: 0, bottomPct: 14 },
      { id: 'bottom_reply', name: 'Поле ответа и реакции', leftPct: 0, rightPct: 100, topPct: 86, bottomPct: 100 }
    ]
  },
  TIKTOK_9_16: {
    id: 'tiktok_9_16',
    name: 'TikTok Video (9:16 - 1080x1920)',
    description: 'Интерфейс TikTok: верхние вкладки (Подписки/Рекомендации/Поиск), нижний блок (описание, хэштеги, виниловый диск музыки) и правый блок (аватар+, лайк, комменты, закладки, поделиться)',
    aspectRatio: '9:16',
    aspectLabel: '9:16 TIKTOK',
    marginPercent: { top: 9, bottom: 22, left: 6, right: 16 },
    cutouts: [
      { id: 'top_header', name: 'Вкладки и поиск TikTok', leftPct: 0, rightPct: 100, topPct: 0, bottomPct: 9 },
      { id: 'bottom_caption', name: 'Описание, хэштеги и виниловый диск', leftPct: 0, rightPct: 100, topPct: 78, bottomPct: 100 },
      { id: 'right_actions', name: 'Боковые кнопки (аватар, лайк, комменты, закладки, репост)', leftPct: 84, rightPct: 100, topPct: 40, bottomPct: 82 }
    ]
  },
  VK_CLIPS_9_16: {
    id: 'vk_clips_9_16',
    name: 'ВКонтакте Клипы (9:16 - 1080x1920)',
    description: 'Интерфейс VK Клипы: верхнее меню поиска/закрытия, блок описания и музыки снизу, правый столбец кнопок взаимодействия',
    aspectRatio: '9:16',
    aspectLabel: '9:16 VK КЛИПЫ',
    marginPercent: { top: 11, bottom: 22, left: 6, right: 15 },
    cutouts: [
      { id: 'top_header', name: 'Шапка VK Клипов', leftPct: 0, rightPct: 100, topPct: 0, bottomPct: 11 },
      { id: 'bottom_caption', name: 'Описание, музыка и товары', leftPct: 0, rightPct: 100, topPct: 78, bottomPct: 100 },
      { id: 'right_actions', name: 'Боковые кнопки (лайк, комменты, репост, закладка, звук)', leftPct: 85, rightPct: 100, topPct: 44, bottomPct: 82 }
    ]
  },
  VK_STORIES_9_16: {
    id: 'vk_stories_9_16',
    name: 'ВКонтакте Истории (9:16 - 1080x1920)',
    description: 'Интерфейс VK Истории: индикаторы сверху и поле ответа снизу',
    aspectRatio: '9:16',
    aspectLabel: '9:16 VK ИСТОРИИ',
    marginPercent: { top: 12, bottom: 13, left: 6, right: 6 },
    cutouts: [
      { id: 'top_header', name: 'Индикаторы и автор', leftPct: 0, rightPct: 100, topPct: 0, bottomPct: 12 },
      { id: 'bottom_reply', name: 'Поле ответа и кнопка «Поделиться»', leftPct: 0, rightPct: 100, topPct: 87, bottomPct: 100 }
    ]
  },
  YOUTUBE_SHORTS_9_16: {
    id: 'youtube_shorts_9_16',
    name: 'YouTube Shorts (9:16 - 1080x1920)',
    description: 'Интерфейс YouTube Shorts: верхняя панель поиска/камеры, нижний блок канала/подписки/названия и правый блок (лайк, дизлайк, комменты, ремикс)',
    aspectRatio: '9:16',
    aspectLabel: '9:16 SHORTS',
    marginPercent: { top: 10, bottom: 21, left: 6, right: 15 },
    cutouts: [
      { id: 'top_header', name: 'Поиск и меню Shorts', leftPct: 0, rightPct: 100, topPct: 0, bottomPct: 10 },
      { id: 'bottom_caption', name: 'Канал, кнопка «Подписаться» и звук', leftPct: 0, rightPct: 100, topPct: 79, bottomPct: 100 },
      { id: 'right_actions', name: 'Кнопки (лайк, дизлайк, комменты, поделиться, звук)', leftPct: 85, rightPct: 100, topPct: 42, bottomPct: 82 }
    ]
  },
  FACEBOOK_REELS_9_16: {
    id: 'facebook_reels_9_16',
    name: 'Facebook Reels & Stories (9:16 - 1080x1920)',
    description: 'Интерфейс Facebook Reels: верхний заголовок, нижнее описание с CTA и правые кнопки реакций',
    aspectRatio: '9:16',
    aspectLabel: '9:16 FB REELS',
    marginPercent: { top: 11, bottom: 21, left: 6, right: 15 },
    cutouts: [
      { id: 'top_header', name: 'Шапка Facebook Reels', leftPct: 0, rightPct: 100, topPct: 0, bottomPct: 11 },
      { id: 'bottom_caption', name: 'Описание и кнопка действия', leftPct: 0, rightPct: 100, topPct: 79, bottomPct: 100 },
      { id: 'right_actions', name: 'Кнопки реакций (лайк, комменты, репост)', leftPct: 85, rightPct: 100, topPct: 43, bottomPct: 82 }
    ]
  },
  SOCIAL_UNIVERSAL_9_16: {
    id: 'social_universal_9_16',
    name: 'Универсальный Social 9:16 (All-in-One Safe)',
    description: 'Максимально безопасная область для одновременной публикации в Reels, TikTok, VK, Shorts и Stories без перекрытия любыми элементами UI',
    aspectRatio: '9:16',
    aspectLabel: '9:16 UNIVERSAL',
    marginPercent: { top: 14, bottom: 24, left: 6, right: 16 },
    cutouts: [
      { id: 'top_header', name: 'Общая верхняя зона UI', leftPct: 0, rightPct: 100, topPct: 0, bottomPct: 14 },
      { id: 'bottom_caption', name: 'Общая нижняя зона UI (описание, звук, кнопки)', leftPct: 0, rightPct: 100, topPct: 76, bottomPct: 100 },
      { id: 'right_actions', name: 'Общая боковая зона кнопок взаимодействия', leftPct: 84, rightPct: 100, topPct: 40, bottomPct: 82 }
    ]
  },

  // --- Ленты и другие форматы соцсетей ---
  INSTAGRAM_FEED_4_5: {
    id: 'instagram_feed_4_5',
    name: 'Instagram / VK Feed (4:5 Portrait - 1080x1350)',
    description: 'Портретный формат ленты соцсетей',
    aspectRatio: '4:5',
    aspectLabel: '4:5 FEED',
    marginPercent: { top: 6, bottom: 8, left: 6, right: 6 }
  },
  SQUARE_1_1: {
    id: 'square_1_1',
    name: 'Квадратный формат (1:1 - 1080x1080)',
    description: 'Квадратные посты в ленте соцсетей и маркетплейсах',
    aspectRatio: '1:1',
    aspectLabel: '1:1 SQUARE',
    marginPercent: { top: 5, bottom: 5, left: 5, right: 5 }
  },

  // --- ТВ и классические вещательные стандарты ---
  EBU_R95_TITLE_SAFE: {
    id: 'ebu_r95_title',
    name: 'EBU R95 Title Safe (90% - ТВ 16:9)',
    description: 'Европейский вещательный стандарт Title Safe (5% отступ с каждой стороны)',
    aspectRatio: '16:9',
    aspectLabel: '16:9 BROADCAST',
    marginPercent: { top: 5, bottom: 5, left: 5, right: 5 }
  },
  EBU_R95_ACTION_SAFE: {
    id: 'ebu_r95_action',
    name: 'EBU R95 Action Safe (93% - ТВ 16:9)',
    description: 'Европейский вещательный стандарт Action Safe (3.5% отступ с каждой стороны)',
    aspectRatio: '16:9',
    aspectLabel: '16:9 ACTION',
    marginPercent: { top: 3.5, bottom: 3.5, left: 3.5, right: 3.5 }
  },
  SMPTE_TITLE_SAFE_80: {
    id: 'smpte_title_80',
    name: 'SMPTE RP 218 Title Safe (80% - ТВ)',
    description: 'Классический стандарт для эфирного ТВ (10% отступ)',
    aspectRatio: '16:9',
    aspectLabel: '16:9 SMPTE TITLE',
    marginPercent: { top: 10, bottom: 10, left: 10, right: 10 }
  },
  SMPTE_ACTION_SAFE_90: {
    id: 'smpte_action_90',
    name: 'SMPTE RP 218 Action Safe (90% - ТВ)',
    description: 'Классический стандарт Action Safe (5% отступ)',
    aspectRatio: '16:9',
    aspectLabel: '16:9 SMPTE ACTION',
    marginPercent: { top: 5, bottom: 5, left: 5, right: 5 }
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
   * и перекрытие сложных UI-элементов соцсетей
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

    // 5. Проверка специализированных вырезов интерфейса соцсетей (Complex UI Cutouts)
    if (this.preset && Array.isArray(this.preset.cutouts)) {
      for (const cutout of this.preset.cutouts) {
        const cLeft = (compWidth * (cutout.leftPct || 0)) / 100;
        const cRight = (compWidth * (cutout.rightPct || 100)) / 100;
        const cTop = (compHeight * (cutout.topPct || 0)) / 100;
        const cBottom = (compHeight * (cutout.bottomPct || 100)) / 100;

        const intersects = (
          compAABB.left < cRight &&
          compAABB.right > cLeft &&
          compAABB.top < cBottom &&
          compAABB.bottom > cTop
        );

        if (intersects) {
          const overlapX = Math.min(compAABB.right - cLeft, cRight - compAABB.left);
          const overlapY = Math.min(compAABB.bottom - cTop, cBottom - compAABB.top);
          const overflow = Number(Math.min(overlapX, overlapY).toFixed(1));

          const alreadyCovered = violations.some(v => v.side === cutout.id);
          if (!alreadyCovered && overflow > 0) {
            violations.push({
              side: cutout.id || 'cutout',
              sideName: `UI-зона «${cutout.name}»`,
              overflowPx: overflow,
              cutoutName: cutout.name
            });
          }
        }
      }
    }

    const passed = violations.length === 0;
    const maxOverflow = violations.length > 0 ? Math.max(...violations.map(v => v.overflowPx)) : 0;

    return {
      status: passed ? 'ok' : 'error',
      passed,
      violations,
      maxOverflow,
      safeArea,
      preset: this.preset?.name || 'Custom'
    };
  }

  setPreset(preset) {
    if (typeof preset === 'string' && BROADCAST_PRESETS[preset]) {
      this.preset = BROADCAST_PRESETS[preset];
    } else if (typeof preset === 'object') {
      this.preset = preset;
    }
  }

  setCustomMargins(margins) {
    if (margins.unit === 'px') {
      this.customMarginPx = margins;
      this.customMarginPercent = null;
    } else {
      this.customMarginPercent = margins;
      this.customMarginPx = null;
    }
  }
}
