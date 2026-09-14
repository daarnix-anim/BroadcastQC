/**
 * Broadcast QC - Auto-Plate Presets and Constants
 */

export const ORIGIN_POINTS = {
  TOP_LEFT: { id: 0, label: 'Сверху Слева (Top-Left)', x: 0, y: 0 },
  TOP_CENTER: { id: 1, label: 'Сверху Центр (Top-Center)', x: 0.5, y: 0 },
  TOP_RIGHT: { id: 2, label: 'Сверху Справа (Top-Right)', x: 1, y: 0 },
  LEFT: { id: 3, label: 'Слева Центр (Left-Center)', x: 0, y: 0.5 },
  CENTER: { id: 4, label: 'По центру (Center)', x: 0.5, y: 0.5 },
  RIGHT: { id: 5, label: 'Справа Центр (Right-Center)', x: 1, y: 0.5 },
  BOTTOM_LEFT: { id: 6, label: 'Снизу Слева (Bottom-Left)', x: 0, y: 1 },
  BOTTOM_CENTER: { id: 7, label: 'Снизу Центр (Bottom-Center)', x: 0.5, y: 1 },
  BOTTOM_RIGHT: { id: 8, label: 'Снизу Справа (Bottom-Right)', x: 1, y: 1 }
};

export const ANIMATION_TYPES = {
  EXPAND_X: { id: 'expand_x', label: 'Горизонтально (По оси X)', axis: 'X' },
  EXPAND_Y: { id: 'expand_y', label: 'Вертикально (По оси Y)', axis: 'Y' },
  EXPAND_BOTH: { id: 'expand_both', label: 'Равномерно (По осям X и Y)', axis: 'XY' },
  FADE_EXPAND: { id: 'fade_expand', label: 'Раскрытие с проявлением (Fade + Expand)', axis: 'XY_FADE' }
};

export const STYLE_PRESETS = {
  GLASS: {
    id: 'glass',
    label: 'Glassmorphism (ТВ Эфир)',
    color: [0.08, 0.11, 0.18], // normalized RGB for AE [0..1]
    opacity: 88,
    strokeColor: [1, 1, 1],
    strokeWidth: 1.5,
    strokeOpacity: 25,
    roundness: 16
  },
  DARK: {
    id: 'dark',
    label: 'Solid Dark (Строгий)',
    color: [0.05, 0.07, 0.1],
    opacity: 95,
    strokeColor: [0.18, 0.22, 0.3],
    strokeWidth: 1,
    strokeOpacity: 50,
    roundness: 12
  },
  GRADIENT: {
    id: 'gradient',
    label: 'Cyber Accent (Градиент/Акцент)',
    color: [0.06, 0.12, 0.28],
    opacity: 92,
    strokeColor: [0.22, 0.74, 0.97],
    strokeWidth: 2,
    strokeOpacity: 80,
    roundness: 20
  },
  LIGHT: {
    id: 'light',
    label: 'Clean Light (Светлый)',
    color: [0.96, 0.97, 0.99],
    opacity: 96,
    strokeColor: [0.8, 0.85, 0.9],
    strokeWidth: 1,
    strokeOpacity: 70,
    roundness: 14
  }
};

export const DEFAULT_PLATE_CONFIG = {
  paddingTop: 20,
  paddingBottom: 20,
  paddingLeft: 30,
  paddingRight: 30,
  roundness: 16,
  roundnessIsPercent: false,
  originPoint: 3, // Left-Center default
  animType: 'expand_x',
  animInDuration: 0.5,
  animOutDuration: 0.4,
  animEasing: 'ease_out_back', // smooth overshoot
  enableMask: true,
  animateTextIn: true,
  textSlideDirection: 'left', // 'left', 'bottom', 'top', 'right'
  style: 'glass'
};
