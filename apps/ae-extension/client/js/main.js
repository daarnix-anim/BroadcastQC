/**
 * Broadcast QC 2.0 - Frontend Controller for Adobe After Effects 2026.2
 * Features live status indicators, step-by-step progress tracking, toast notifications,
 * actionable user guidance, ExtendScript communication, and GitHub Auto-Updater.
 */

import { BroadcastQCCore } from '../../packages/qc-core/index.js';
import { UserDictionary } from '../../packages/spelling/index.js';
import { BROADCAST_PRESETS } from '../../packages/safe-zone/index.js';
import { AIAgent } from '../../packages/ai/index.js';
import { AutoUpdater } from '../../packages/updater/index.js';
import { AutoPlateEngine, DEFAULT_PLATE_CONFIG, ORIGIN_POINTS, STYLE_PRESETS } from '../../packages/auto-plate/index.js';

const APP_CURRENT_VERSION = '0.9.2';

// ==========================================
// 1. Global Error Boundary & Toast System
// ==========================================

const globalErrorBanner = document.getElementById('globalErrorBanner');
const globalErrorMessage = document.getElementById('globalErrorMessage');
const btnCopyError = document.getElementById('btnCopyError');
const btnCloseBanner = document.getElementById('btnCloseBanner');
const toastContainer = document.getElementById('toastContainer');

let lastErrorMessage = '';

function showGlobalError(msg) {
  lastErrorMessage = msg;
  if (globalErrorMessage) globalErrorMessage.textContent = msg;
  if (globalErrorBanner) globalErrorBanner.style.display = 'block';
  console.error('[Broadcast QC Global Error]', msg);
}

window.addEventListener('error', (e) => {
  showGlobalError(`Скриптовая ошибка: ${e.message} (${e.filename}:${e.lineno})`);
});

window.addEventListener('unhandledrejection', (e) => {
  showGlobalError(`Необработанная ошибка Promise: ${e.reason?.message || e.reason}`);
});

btnCopyError?.addEventListener('click', () => {
  if (navigator.clipboard && lastErrorMessage) {
    navigator.clipboard.writeText(lastErrorMessage);
    showToast('Текст ошибки скопирован в буфер обмена', 'info');
  }
});

btnCloseBanner?.addEventListener('click', () => {
  if (globalErrorBanner) globalErrorBanner.style.display = 'none';
});

export function showToast(message, type = 'info', duration = 3500) {
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'warning') icon = '⚠️';
  if (type === 'error') icon = '❌';

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-msg">${escapeHTML(message)}</span>
    <span class="toast-close" title="Закрыть">&times;</span>
  `;

  const closeToast = () => {
    toast.style.transition = 'opacity 0.2s, transform 0.2s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 200);
  };

  toast.querySelector('.toast-close').addEventListener('click', closeToast);

  toastContainer.appendChild(toast);

  if (duration > 0) {
    setTimeout(closeToast, duration);
  }
}

// Sound chime on completion (Web Audio API)
function playChime(isSuccess = true) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (isSuccess) {
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      osc.frequency.setValueAtTime(330.0, now);
      osc.frequency.linearRampToValueAtTime(220.0, now + 0.25);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (e) {
    // Audio muted or not allowed; continue silently
  }
}

// ==========================================
// 2. Initialization & State Management
// ==========================================

const csInterface = new CSInterface();

// User dictionary persistence
const STORAGE_DICT_KEY = 'broadcast_qc_user_dictionary';
let savedWords = [];
try {
  const raw = localStorage.getItem(STORAGE_DICT_KEY);
  if (raw) savedWords = JSON.parse(raw);
} catch (e) {
  console.warn('Could not read user dictionary from storage', e);
}
const userDict = new UserDictionary(savedWords);

function persistUserDictionary() {
  try {
    localStorage.setItem(STORAGE_DICT_KEY, JSON.stringify(userDict.toJSON()));
  } catch (e) {
    console.warn('Could not persist user dictionary', e);
  }
}

// AI Config persistence
const STORAGE_AI_KEY = 'broadcast_qc_ai_config';
let aiConfig = { provider: 'none', baseUrl: 'http://localhost:11434', model: 'llama3:8b', apiKey: '' };
try {
  const rawAI = localStorage.getItem(STORAGE_AI_KEY);
  if (rawAI) aiConfig = { ...aiConfig, ...JSON.parse(rawAI) };
} catch (e) {}
const aiAgent = new AIAgent(aiConfig);

// GitHub Repo config persistence
const STORAGE_REPO_KEY = 'broadcast_qc_github_repo';
let githubRepo = 'daarnix-anim/BroadcastQC';
try {
  const savedRepo = localStorage.getItem(STORAGE_REPO_KEY);
  if (savedRepo) githubRepo = savedRepo;
} catch (e) {}

let autoUpdater = new AutoUpdater({
  repo: githubRepo,
  currentVersion: APP_CURRENT_VERSION
});

// Core QC Engine
let qcCore = new BroadcastQCCore({
  userDictionary: userDict,
  aiAgent: aiAgent,
  checkSpelling: true,
  checkSafeZone: false,
  checkReadingSpeed: true,
  checkProjectHealth: true,
  useAI: false,
  safeZonePreset: BROADCAST_PRESETS.EBU_R95_TITLE_SAFE
});

let lastQCReport = null;
let currentAvailableUpdate = null;

// ==========================================
// 3. DOM Elements
// ==========================================

const btnRunQC = document.getElementById('btnRunQC');
const btnRunIcon = document.getElementById('btnRunIcon');
const btnRunText = document.getElementById('btnRunText');
const btnExportReport = document.getElementById('btnExportReport');
const chkSpelling = document.getElementById('chkSpelling');
const chkOnlineSpeller = document.getElementById('chkOnlineSpeller');
const chkTypography = document.getElementById('chkTypography');
const chkSafeZone = document.getElementById('chkSafeZone');
const chkScanNested = document.getElementById('chkScanNested');
const chkScanEntireProject = document.getElementById('chkScanEntireProject');
const chkUseAI = document.getElementById('chkUseAI');

const statusDot = document.getElementById('statusDot');
const connectionStatus = document.getElementById('connectionStatus');
const btnRefreshStatus = document.getElementById('btnRefreshStatus');
const appVersionBadge = document.getElementById('appVersionBadge');

const progressCard = document.getElementById('progressCard');
const progressTitle = document.getElementById('progressTitle');
const progressPercent = document.getElementById('progressPercent');
const progressBarFill = document.getElementById('progressBarFill');
const progressStepText = document.getElementById('progressStepText');

const summarySection = document.getElementById('summarySection');
const statBoxErrors = document.getElementById('statBoxErrors');
const statBoxWarnings = document.getElementById('statBoxWarnings');
const statBoxInfo = document.getElementById('statBoxInfo');
const statBoxLayers = document.getElementById('statBoxLayers');
const statErrors = document.getElementById('statErrors');
const statWarnings = document.getElementById('statWarnings');
const statInfo = document.getElementById('statInfo');
const statLayers = document.getElementById('statLayers');
const statWordsChecked = document.getElementById('statWordsChecked');
const issuesContainer = document.getElementById('issuesContainer');
const initialEmptyState = document.getElementById('initialEmptyState');

const selectSafePreset = document.getElementById('selectSafePreset');
const customMarginsGroup = document.getElementById('customMarginsGroup');
const customMarginL = document.getElementById('customMarginL');
const customMarginR = document.getElementById('customMarginR');
const customMarginT = document.getElementById('customMarginT');
const customMarginB = document.getElementById('customMarginB');

const previewScreenFrame = document.getElementById('previewScreenFrame');
const previewCompAspectLabel = document.getElementById('previewCompAspectLabel');
const previewCutoutsContainer = document.getElementById('previewCutoutsContainer');
const visualSafeBox = document.getElementById('visualSafeBox');
const safeZoneDimensionsBadge = document.getElementById('safeZoneDimensionsBadge');
const lblTopMargin = document.getElementById('lblTopMargin');
const lblBottomMargin = document.getElementById('lblBottomMargin');
const lblLeftMargin = document.getElementById('lblLeftMargin');
const lblRightMargin = document.getElementById('lblRightMargin');

const btnToggleSafeZoneOverlay = document.getElementById('btnToggleSafeZoneOverlay');
const btnRemoveSafeZoneOverlay = document.getElementById('btnRemoveSafeZoneOverlay');
const overlayBtnIcon = document.getElementById('overlayBtnIcon');
const overlayBtnText = document.getElementById('overlayBtnText');

const aiProviderSelect = document.getElementById('aiProviderSelect');
const aiBaseUrl = document.getElementById('aiBaseUrl');
const aiModel = document.getElementById('aiModel');
const aiApiKeyGroup = document.getElementById('aiApiKeyGroup');
const aiApiKey = document.getElementById('aiApiKey');
const btnTestAI = document.getElementById('btnTestAI');
const aiStatusText = document.getElementById('aiStatusText');

const newWordInput = document.getElementById('newWordInput');
const btnAddWord = document.getElementById('btnAddWord');
const btnResetDict = document.getElementById('btnResetDict');
const dictWordTags = document.getElementById('dictWordTags');
const dictWordCount = document.getElementById('dictWordCount');

// Update Modal DOM
const updateModal = document.getElementById('updateModal');
const btnUpdateModalClose = document.getElementById('btnUpdateModalClose');
const modalNewVersionTitle = document.getElementById('modalNewVersionTitle');
const modalCurrentVersion = document.getElementById('modalCurrentVersion');
const modalReleaseNotes = document.getElementById('modalReleaseNotes');
const modalProgressContainer = document.getElementById('modalProgressContainer');
const modalProgressStep = document.getElementById('modalProgressStep');
const modalProgressPercent = document.getElementById('modalProgressPercent');
const modalProgressBarFill = document.getElementById('modalProgressBarFill');
const modalFooter = document.getElementById('modalFooter');
const btnRemindLater = document.getElementById('btnRemindLater');
const btnPerformUpdate = document.getElementById('btnPerformUpdate');

const githubRepoInput = document.getElementById('githubRepoInput');
const btnCheckUpdatesManual = document.getElementById('btnCheckUpdatesManual');
const updateStatusText = document.getElementById('updateStatusText');
const headerAppVersionBadge = document.getElementById('headerAppVersionBadge');

// ==========================================
// 4. Lifecycle & After Effects Connection
// ==========================================

function init() {
  if (appVersionBadge) appVersionBadge.textContent = `v${APP_CURRENT_VERSION}`;
  if (headerAppVersionBadge) headerAppVersionBadge.textContent = `v${APP_CURRENT_VERSION}`;
  initTabs();
  initDictionaryUI();
  initSafeZoneUI();
  initAutoPlateUI();
  initAIUI();
  initUpdaterUI();
  initSummaryFilterUI();
  initExtendScript();
  checkAEConnection(true);

  // Default Yandex Speller to ON
  if (chkOnlineSpeller) {
    chkOnlineSpeller.checked = true;
    qcCore.spellChecker.useOnlineSpeller = true;
  }

  // Silent update check in background after 2.5s
  setTimeout(() => {
    checkForUpdatesSilent();
  }, 2500);
}

// Auto-load host/index.jsx if not yet evaluated
function initExtendScript() {
  if (csInterface.isCEP) {
    csInterface.evalScript('typeof BroadcastQCHost !== "undefined"', (res) => {
      if (res !== 'true') {
        csInterface.loadJSX('host/index.jsx', (loadRes) => {
          console.log('[Broadcast QC] ExtendScript load result:', loadRes);
          checkAEConnection(true);
        });
      }
    });
  }
}

// Check live connection to After Effects
function checkAEConnection(silent = false) {
  csInterface.evalScript('BroadcastQCHost.getInfo()', (res) => {
    try {
      const data = JSON.parse(res);
      if (data && data.success) {
        statusDot.className = 'status-dot online';
        
        let statusStr = `AE ${data.appVersion || '2026'}`;
        if (data.hasActiveComp && data.activeCompName) {
          statusStr = `${data.activeCompName} (${data.activeCompTextLayers} текст. ${declension(data.activeCompTextLayers, ['слой', 'слоя', 'слоев'])})`;
        } else if (data.hasProject) {
          statusDot.className = 'status-dot idle';
          statusStr = 'Нет активной композиции';
        }
        
        connectionStatus.textContent = statusStr;
        connectionStatus.title = `Проект: ${data.projectName || 'Без названия'}\nКомпозиция: ${data.activeCompName || 'Не выбрана'}\nСлоёв: ${data.activeCompLayers || 0} (текстовых: ${data.activeCompTextLayers || 0})`;

        if (!silent) {
          showToast(`Подключено к After Effects: ${data.activeCompName ? `композиция «${data.activeCompName}»` : 'нет открытой композиции'}`, 'success');
        }
      } else {
        setOfflineStatus();
        if (!silent) showToast('Не удалось получить статус After Effects', 'warning');
      }
    } catch (e) {
      setOfflineStatus();
      if (!silent) showToast('Ожидание подключения к After Effects...', 'warning');
    }
  });
}

function setOfflineStatus() {
  statusDot.className = 'status-dot offline';
  connectionStatus.textContent = 'AE 2026.2 (Ожидание)';
}

btnRefreshStatus?.addEventListener('click', () => {
  btnRefreshStatus.style.transform = 'rotate(180deg)';
  setTimeout(() => { btnRefreshStatus.style.transform = ''; }, 300);
  checkAEConnection(false);
});

// ==========================================
// 5. Progress Indicator & Guidance UI
// ==========================================

function updateProgress(percent, stepText) {
  if (!progressCard) return;
  progressCard.style.display = 'flex';
  progressBarFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  progressPercent.textContent = `${Math.round(percent)}%`;
  progressStepText.textContent = stepText;
}

function hideProgress() {
  if (!progressCard) return;
  setTimeout(() => {
    progressCard.style.display = 'none';
  }, 1200);
}

function showGuidance(type, heading, textHtml) {
  if (!guidanceCard) return;
  guidanceCard.className = `guidance-card ${type}`;
  guidanceHeading.textContent = heading;
  guidanceBody.innerHTML = textHtml;

  if (type === 'clean') {
    guidanceIcon.textContent = '🏆';
  } else if (type === 'attention') {
    guidanceIcon.textContent = '⚠️';
  } else {
    guidanceIcon.textContent = '💡';
  }

  guidanceCard.style.display = 'flex';
}

function hideGuidance() {
  if (guidanceCard) guidanceCard.style.display = 'none';
}

// ==========================================
// 6. Navigation Tabs
// ==========================================

function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(targetId)?.classList.add('active');
    });
  });
}

// ==========================================
// 7. Safe Zone Settings & Live Visual Overlay UI
// ==========================================

let isSafeZoneOverlayActiveInAE = false;

function findPresetById(presetId) {
  for (const key of Object.keys(BROADCAST_PRESETS)) {
    if (BROADCAST_PRESETS[key].id === presetId) {
      return BROADCAST_PRESETS[key];
    }
  }
  return BROADCAST_PRESETS.EBU_R95_TITLE_SAFE;
}

function getEffectiveSafeZoneMargins() {
  const val = selectSafePreset ? selectSafePreset.value : 'ebu_r95_title';
  if (val === 'custom') {
    return {
      left: Number(customMarginL?.value || 5),
      right: Number(customMarginR?.value || 5),
      top: Number(customMarginT?.value || 5),
      bottom: Number(customMarginB?.value || 5),
      cutouts: []
    };
  }

  const presetObj = findPresetById(val);
  return {
    ...presetObj.marginPercent,
    cutouts: presetObj.cutouts || []
  };
}

function updateSafeZoneVisualPreview() {
  const val = selectSafePreset ? selectSafePreset.value : 'ebu_r95_title';
  const margins = getEffectiveSafeZoneMargins();
  const presetObj = val !== 'custom' ? findPresetById(val) : null;
  const aspectRatio = presetObj ? (presetObj.aspectRatio || '16:9') : '16:9';
  const aspectLabel = presetObj ? (presetObj.aspectLabel || '16:9 TV') : 'CUSTOM COMP';

  if (safeZoneDimensionsBadge) {
    if (val === 'custom') {
      safeZoneDimensionsBadge.textContent = `Custom (${margins.left}%L, ${margins.right}%R, ${margins.top}%T, ${margins.bottom}%B)`;
    } else {
      safeZoneDimensionsBadge.textContent = presetObj.name;
    }
  }

  // 1. Адаптация пропорций рамки устройства под выбранный формат
  if (previewScreenFrame) {
    if (aspectRatio === '9:16') {
      previewScreenFrame.style.width = '96px';
      previewScreenFrame.style.height = '170px';
      previewScreenFrame.style.borderRadius = '8px';
    } else if (aspectRatio === '1:1') {
      previewScreenFrame.style.width = '145px';
      previewScreenFrame.style.height = '145px';
      previewScreenFrame.style.borderRadius = '4px';
    } else if (aspectRatio === '4:5') {
      previewScreenFrame.style.width = '120px';
      previewScreenFrame.style.height = '150px';
      previewScreenFrame.style.borderRadius = '6px';
    } else {
      // 16:9 Горизонтальный ТВ-формат
      previewScreenFrame.style.width = '248px';
      previewScreenFrame.style.height = '139.5px';
      previewScreenFrame.style.borderRadius = '4px';
    }
  }

  if (previewCompAspectLabel) {
    previewCompAspectLabel.textContent = aspectLabel;
  }

  // 2. Позиционирование основной безопасной зоны
  if (visualSafeBox) {
    const widthPct = Math.max(10, 100 - (margins.left + margins.right));
    const heightPct = Math.max(10, 100 - (margins.top + margins.bottom));
    const leftPct = margins.left;
    const topPct = margins.top;

    visualSafeBox.style.width = `${widthPct}%`;
    visualSafeBox.style.height = `${heightPct}%`;
    visualSafeBox.style.left = `${leftPct}%`;
    visualSafeBox.style.top = `${topPct}%`;
  }

  if (lblTopMargin) lblTopMargin.textContent = `${margins.top}%`;
  if (lblBottomMargin) lblBottomMargin.textContent = `${margins.bottom}%`;
  if (lblLeftMargin) lblLeftMargin.textContent = `${margins.left}%`;
  if (lblRightMargin) lblRightMargin.textContent = `${margins.right}%`;

  // 3. Отрисовка непрямоугольных UI-вырезов соцсетей (шапка, описание, боковые кнопки)
  if (previewCutoutsContainer) {
    previewCutoutsContainer.innerHTML = '';
    const cutouts = margins.cutouts || [];
    for (const cutout of cutouts) {
      const cutoutEl = document.createElement('div');
      cutoutEl.style.position = 'absolute';
      cutoutEl.style.left = `${cutout.leftPct || 0}%`;
      cutoutEl.style.top = `${cutout.topPct || 0}%`;
      cutoutEl.style.width = `${Math.max(2, (cutout.rightPct || 100) - (cutout.leftPct || 0))}%`;
      cutoutEl.style.height = `${Math.max(2, (cutout.bottomPct || 100) - (cutout.topPct || 0))}%`;
      cutoutEl.style.background = 'rgba(255, 51, 75, 0.16)';
      cutoutEl.style.border = '1px dashed rgba(255, 74, 95, 0.7)';
      cutoutEl.style.boxSizing = 'border-box';
      cutoutEl.style.pointerEvents = 'none';

      if (cutout.id === 'right_actions') {
        cutoutEl.style.borderRadius = '6px';
        cutoutEl.style.background = 'rgba(255, 51, 75, 0.22)';
      }

      previewCutoutsContainer.appendChild(cutoutEl);
    }
  }
}

function initSafeZoneUI() {
  updateSafeZoneVisualPreview();

  selectSafePreset?.addEventListener('change', () => {
    const val = selectSafePreset.value;
    if (val === 'custom') {
      if (customMarginsGroup) customMarginsGroup.style.display = 'flex';
      qcCore.safeZoneChecker.customMarginPercent = getEffectiveSafeZoneMargins();
      qcCore.safeZoneChecker.preset = null;
    } else {
      if (customMarginsGroup) customMarginsGroup.style.display = 'none';
      qcCore.safeZoneChecker.customMarginPercent = null;
      qcCore.safeZoneChecker.preset = findPresetById(val);
    }

    updateSafeZoneVisualPreview();
    if (isSafeZoneOverlayActiveInAE) {
      applySafeZoneOverlayToAE(true);
    }
  });

  const onCustomMarginInput = () => {
    if (selectSafePreset.value === 'custom') {
      qcCore.safeZoneChecker.customMarginPercent = getEffectiveSafeZoneMargins();
      updateSafeZoneVisualPreview();
      if (isSafeZoneOverlayActiveInAE) {
        applySafeZoneOverlayToAE(true);
      }
    }
  };

  customMarginL?.addEventListener('input', onCustomMarginInput);
  customMarginR?.addEventListener('input', onCustomMarginInput);
  customMarginT?.addEventListener('input', onCustomMarginInput);
  customMarginB?.addEventListener('input', onCustomMarginInput);

  // Toggle Red Overlay Guide Layer in After Effects
  btnToggleSafeZoneOverlay?.addEventListener('click', () => {
    applySafeZoneOverlayToAE(!isSafeZoneOverlayActiveInAE);
  });

  btnRemoveSafeZoneOverlay?.addEventListener('click', () => {
    applySafeZoneOverlayToAE(false);
  });
}

function applySafeZoneOverlayToAE(enable) {
  const margins = getEffectiveSafeZoneMargins();
  const marginsJson = JSON.stringify(margins);

  csInterface.evalScript(`BroadcastQCHost.toggleSafeZoneOverlay(${JSON.stringify(marginsJson)}, ${enable})`, (res) => {
    try {
      const data = JSON.parse(res);
      if (data && data.success) {
        isSafeZoneOverlayActiveInAE = !!data.active;
        if (isSafeZoneOverlayActiveInAE) {
          if (overlayBtnIcon) overlayBtnIcon.textContent = '👁️';
          if (overlayBtnText) overlayBtnText.textContent = 'Скрыть красные границы в AE';
          showToast(`🚨 Красные границы Safe Zone включены в After Effects (${margins.left}%L, ${margins.top}%T)`, 'success', 3500);
        } else {
          if (overlayBtnIcon) overlayBtnIcon.textContent = '🚨';
          if (overlayBtnText) overlayBtnText.textContent = 'Показать красные границы в AE';
          showToast('Границы Safe Zone скрыты в After Effects', 'info', 2500);
        }
      } else {
        showToast(`Ошибка: ${data?.error || 'Не удалось обновить оверлей в AE'}`, 'error');
      }
    } catch (e) {
      showToast('Ожидание подключения к After Effects...', 'warning');
    }
  });
}

// ==========================================
// 8. Auto-Plate (Адаптивная плашка) UI
// ==========================================

const STORAGE_PLATE_KEY = 'broadcast_qc_plate_preset';

let plateState = { ...DEFAULT_PLATE_CONFIG };
try {
  const savedPlate = localStorage.getItem(STORAGE_PLATE_KEY);
  if (savedPlate) {
    plateState = { ...plateState, ...JSON.parse(savedPlate) };
  }
} catch (e) {}

const ORIGIN_LABELS = {
  0: 'Сверху Слева (Top-Left)',
  1: 'Сверху Центр (Top-Center)',
  2: 'Сверху Справа (Top-Right)',
  3: 'Слева Центр (Left-Center)',
  4: 'По центру (Center)',
  5: 'Справа Центр (Right-Center)',
  6: 'Снизу Слева (Bottom-Left)',
  7: 'Снизу Центр (Bottom-Center)',
  8: 'Снизу Справа (Bottom-Right)'
};

function initAutoPlateUI() {
  const padTopInput = document.getElementById('platePadTop');
  const padTopVal = document.getElementById('platePadTopVal');
  const padBottomInput = document.getElementById('platePadBottom');
  const padBottomVal = document.getElementById('platePadBottomVal');
  const padLeftInput = document.getElementById('platePadLeft');
  const padLeftVal = document.getElementById('platePadLeftVal');
  const padRightInput = document.getElementById('platePadRight');
  const padRightVal = document.getElementById('platePadRightVal');

  const roundnessInput = document.getElementById('plateRoundness');
  const roundnessVal = document.getElementById('plateRoundnessVal');
  const opacityInput = document.getElementById('plateOpacity');
  const opacityVal = document.getElementById('plateOpacityVal');

  const animTypeSelect = document.getElementById('plateAnimType');
  const originGrid = document.getElementById('originGrid');
  const originPointLabel = document.getElementById('originPointLabel');
  const animInDurSelect = document.getElementById('plateAnimInDur');
  const animOutDurSelect = document.getElementById('plateAnimOutDur');

  const chkPlateMask = document.getElementById('chkPlateMask');
  const chkTextSlideIn = document.getElementById('chkTextSlideIn');
  const textSlideDirectionGroup = document.getElementById('textSlideDirectionGroup');
  const plateTextSlideDir = document.getElementById('plateTextSlideDir');

  const btnCreateAutoPlate = document.getElementById('btnCreateAutoPlate');
  const btnUpdateAutoPlate = document.getElementById('btnUpdateAutoPlate');
  const plateStyleChips = document.getElementById('plateStyleChips');

  // Sync initial values to UI
  if (padTopInput && padTopVal) {
    padTopInput.value = plateState.paddingTop;
    padTopVal.textContent = `${plateState.paddingTop}px`;
    padTopInput.addEventListener('input', () => {
      plateState.paddingTop = parseInt(padTopInput.value, 10) || 0;
      padTopVal.textContent = `${plateState.paddingTop}px`;
      savePlateState();
    });
  }

  if (padBottomInput && padBottomVal) {
    padBottomInput.value = plateState.paddingBottom;
    padBottomVal.textContent = `${plateState.paddingBottom}px`;
    padBottomInput.addEventListener('input', () => {
      plateState.paddingBottom = parseInt(padBottomInput.value, 10) || 0;
      padBottomVal.textContent = `${plateState.paddingBottom}px`;
      savePlateState();
    });
  }

  if (padLeftInput && padLeftVal) {
    padLeftInput.value = plateState.paddingLeft;
    padLeftVal.textContent = `${plateState.paddingLeft}px`;
    padLeftInput.addEventListener('input', () => {
      plateState.paddingLeft = parseInt(padLeftInput.value, 10) || 0;
      padLeftVal.textContent = `${plateState.paddingLeft}px`;
      savePlateState();
    });
  }

  if (padRightInput && padRightVal) {
    padRightInput.value = plateState.paddingRight;
    padRightVal.textContent = `${plateState.paddingRight}px`;
    padRightInput.addEventListener('input', () => {
      plateState.paddingRight = parseInt(padRightInput.value, 10) || 0;
      padRightVal.textContent = `${plateState.paddingRight}px`;
      savePlateState();
    });
  }

  if (roundnessInput && roundnessVal) {
    roundnessInput.value = plateState.roundness;
    roundnessVal.textContent = `${plateState.roundness}px`;
    roundnessInput.addEventListener('input', () => {
      plateState.roundness = parseInt(roundnessInput.value, 10) || 0;
      roundnessVal.textContent = `${plateState.roundness}px`;
      updateRoundnessChips(plateState.roundness);
      savePlateState();
    });
  }

  // Roundness Preset Chips
  const roundChips = document.querySelectorAll('#tab-plate .chip-btn[data-round]');
  roundChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const val = parseInt(chip.getAttribute('data-round'), 10);
      plateState.roundness = val;
      if (roundnessInput) roundnessInput.value = val;
      if (roundnessVal) roundnessVal.textContent = `${val}px`;
      updateRoundnessChips(val);
      savePlateState();
    });
  });

  function updateRoundnessChips(val) {
    roundChips.forEach(c => {
      if (parseInt(c.getAttribute('data-round'), 10) === val) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });
  }

  // Style Presets
  const styleChips = plateStyleChips?.querySelectorAll('.chip-btn[data-style]');
  styleChips?.forEach(chip => {
    chip.addEventListener('click', () => {
      const st = chip.getAttribute('data-style');
      plateState.style = st;
      styleChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const preset = STYLE_PRESETS[st.toUpperCase()];
      if (preset && opacityInput && opacityVal) {
        opacityInput.value = preset.opacity;
        opacityVal.textContent = `${preset.opacity}%`;
        plateState.opacity = preset.opacity;
      }
      savePlateState();
    });
  });

  if (opacityInput && opacityVal) {
    opacityInput.value = plateState.opacity !== undefined ? plateState.opacity : 90;
    opacityVal.textContent = `${opacityInput.value}%`;
    opacityInput.addEventListener('input', () => {
      const op = parseInt(opacityInput.value, 10);
      plateState.opacity = op;
      opacityVal.textContent = `${op}%`;
      savePlateState();
    });
  }

  // Action Button: Create Auto-Plate
  btnCreateAutoPlate?.addEventListener('click', () => {
    createAutoPlateInAE();
  });

  // Action Button: Update Auto-Plate (Add elements / re-bind targets)
  btnUpdateAutoPlate?.addEventListener('click', () => {
    updateAutoPlateInAE();
  });
}

function savePlateState() {
  try {
    localStorage.setItem(STORAGE_PLATE_KEY, JSON.stringify(plateState));
  } catch (e) {}
}

function createAutoPlateInAE() {
  const prepared = AutoPlateEngine.prepareConfig(plateState);
  const jsonPayload = JSON.stringify(prepared);

  if (!csInterface.isCEP) {
    // Browser Mock Test Mode
    showToast(`⚡ [Тест] Создана плашка: отступы L:${prepared.paddingLeft}/R:${prepared.paddingRight}/T:${prepared.paddingTop}/B:${prepared.paddingBottom}px, скругление ${prepared.roundness}px, точка #${prepared.originPoint}`, 'success', 4000);
    playChime(true);
    return;
  }

  showToast('Создание адаптивной плашки в After Effects...', 'info', 2000);

  const evalStr = `BroadcastQCHost.createAutoPlate(${JSON.stringify(jsonPayload)})`;
  csInterface.evalScript(evalStr, (res) => {
    try {
      const data = JSON.parse(res);
      if (data && data.success) {
        showToast(`✅ ${data.message} («${data.plateLayerName}»)`, 'success', 4500);
        playChime(true);
      } else {
        showToast(`❌ ${data?.error || 'Не удалось создать плашку'}`, 'error', 5000);
        playChime(false);
      }
    } catch (e) {
      showToast('❌ Ошибка связи с After Effects при создании плашки', 'error');
      playChime(false);
    }
  });
}

function updateAutoPlateInAE() {
  const prepared = AutoPlateEngine.prepareConfig(plateState);
  const jsonPayload = JSON.stringify(prepared);

  if (!csInterface.isCEP) {
    // Browser Mock Test Mode
    showToast(`🔄 [Тест] Плашка обновлена: новые слои добавлены, отступы L:${prepared.paddingLeft}/R:${prepared.paddingRight}px`, 'success', 4000);
    playChime(true);
    return;
  }

  showToast('Обновление адаптивной плашки в After Effects...', 'info', 2000);

  const evalStr = `BroadcastQCHost.updateAutoPlate(${JSON.stringify(jsonPayload)})`;
  csInterface.evalScript(evalStr, (res) => {
    try {
      const data = JSON.parse(res);
      if (data && data.success) {
        showToast(`✅ ${data.message}`, 'success', 4500);
        playChime(true);
      } else {
        showToast(`❌ ${data?.error || 'Не удалось обновить плашку'}`, 'error', 5000);
        playChime(false);
      }
    } catch (e) {
      showToast('❌ Ошибка связи с After Effects при обновлении плашки', 'error');
      playChime(false);
    }
  });
}

// ==========================================
// 9. AI Settings UI
// ==========================================

function initAIUI() {
  aiProviderSelect.value = aiConfig.provider;
  aiBaseUrl.value = aiConfig.baseUrl;
  aiModel.value = aiConfig.model;
  aiApiKey.value = aiConfig.apiKey;

  const updateVisibility = () => {
    const isAPI = aiProviderSelect.value === 'openai';
    aiApiKeyGroup.style.display = isAPI ? 'flex' : 'none';
  };
  updateVisibility();

  const saveAIConfig = () => {
    aiConfig.provider = aiProviderSelect.value;
    aiConfig.baseUrl = aiBaseUrl.value;
    aiConfig.model = aiModel.value;
    aiConfig.apiKey = aiApiKey.value;

    aiAgent.provider = aiConfig.provider;
    aiAgent.baseUrl = aiConfig.baseUrl;
    aiAgent.model = aiConfig.model;
    aiAgent.apiKey = aiConfig.apiKey;

    try {
      localStorage.setItem(STORAGE_AI_KEY, JSON.stringify(aiConfig));
    } catch (e) {}

    updateVisibility();
  };

  aiProviderSelect.addEventListener('change', saveAIConfig);
  aiBaseUrl.addEventListener('input', saveAIConfig);
  aiModel.addEventListener('input', saveAIConfig);
  aiApiKey.addEventListener('input', saveAIConfig);

  btnTestAI.addEventListener('click', async () => {
    btnTestAI.disabled = true;
    aiStatusText.textContent = 'Проверка связи...';
    aiStatusText.style.color = 'var(--text-muted)';

    saveAIConfig();
    try {
      const res = await aiAgent.checkConnection();
      btnTestAI.disabled = false;
      aiStatusText.textContent = res.message;
      aiStatusText.style.color = res.available ? 'var(--success)' : 'var(--error)';
      showToast(res.message, res.available ? 'success' : 'error');
    } catch (err) {
      btnTestAI.disabled = false;
      aiStatusText.textContent = 'Ошибка соединения';
      aiStatusText.style.color = 'var(--error)';
      showToast(`Ошибка проверки AI: ${err.message}`, 'error');
    }
  });
}

// ==========================================
// 9. Dictionary UI
// ==========================================

function initDictionaryUI() {
  renderDictionaryTags();

  const addWordHandler = () => {
    const word = newWordInput.value.trim();
    if (word) {
      userDict.add(word);
      persistUserDictionary();
      newWordInput.value = '';
      renderDictionaryTags();
      showToast(`Слово «${word}» добавлено в словарь`, 'success');
    }
  };

  btnAddWord.addEventListener('click', addWordHandler);
  newWordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addWordHandler();
  });

  btnResetDict.addEventListener('click', () => {
    if (confirm('Сбросить словарь к базовому набору терминов?')) {
      userDict.clear();
      persistUserDictionary();
      renderDictionaryTags();
      showToast('Словарь сброшен к базовым терминам', 'info');
    }
  });
}

function renderDictionaryTags() {
  const list = userDict.getList();
  dictWordCount.textContent = list.length;
  dictWordTags.innerHTML = '';

  list.forEach(word => {
    const tag = document.createElement('span');
    tag.className = 'word-tag';
    tag.innerHTML = `<span>${escapeHTML(word)}</span><span class="remove-btn" title="Удалить">&times;</span>`;

    tag.querySelector('.remove-btn').addEventListener('click', () => {
      userDict.remove(word);
      persistUserDictionary();
      renderDictionaryTags();
      showToast(`Слово «${word}» удалено из словаря`, 'info');
    });

    dictWordTags.appendChild(tag);
  });
}

// ==========================================
// 10. Auto-Updater UI & Flow
// ==========================================

function initUpdaterUI() {
  if (githubRepoInput) {
    githubRepoInput.value = githubRepo;
    githubRepoInput.addEventListener('change', () => {
      githubRepo = githubRepoInput.value.trim() || 'daarnix-anim/BroadcastQC';
      autoUpdater.repo = githubRepo;
      try {
        localStorage.setItem(STORAGE_REPO_KEY, githubRepo);
      } catch (e) {}
    });
  }

  btnCheckUpdatesManual?.addEventListener('click', async () => {
    btnCheckUpdatesManual.disabled = true;
    updateStatusText.textContent = 'Проверка GitHub...';
    updateStatusText.style.color = 'var(--text-muted)';

    try {
      const info = await autoUpdater.checkForUpdates();
      btnCheckUpdatesManual.disabled = false;

      if (info.hasUpdate) {
        updateStatusText.textContent = `Доступна v${info.latestVersion}!`;
        updateStatusText.style.color = 'var(--accent)';
        openUpdateModal(info);
      } else {
        updateStatusText.textContent = `У вас актуальная v${APP_CURRENT_VERSION}`;
        updateStatusText.style.color = 'var(--success)';
        showToast(`Установлена актуальная версия Broadcast QC v${APP_CURRENT_VERSION}`, 'success');
      }
    } catch (err) {
      btnCheckUpdatesManual.disabled = false;
      updateStatusText.textContent = 'Ошибка проверки';
      updateStatusText.style.color = 'var(--error)';
      showToast(`Ошибка проверки обновлений: ${err.message}`, 'error');
    }
  });

  btnUpdateModalClose?.addEventListener('click', closeUpdateModal);
  btnRemindLater?.addEventListener('click', closeUpdateModal);
  btnPerformUpdate?.addEventListener('click', performUpdateHandler);
}

const STORAGE_LAST_INSTALLED_KEY = 'broadcast_qc_installed_version';

async function performUpdateHandler() {
  if (!currentAvailableUpdate) return;

  const btnPerform = document.getElementById('btnPerformUpdate');
  const btnRemind = document.getElementById('btnRemindLater');
  if (btnPerform) btnPerform.disabled = true;
  if (btnRemind) btnRemind.disabled = true;
  if (btnUpdateModalClose) btnUpdateModalClose.disabled = true;

  if (modalProgressContainer) modalProgressContainer.style.display = 'flex';

  // Target extension directory
  let targetDir = '';
  if (csInterface.isCEP) {
    targetDir = csInterface.getSystemPath(csInterface.SystemPath.EXTENSION);
  }

  try {
    await autoUpdater.downloadAndInstall(currentAvailableUpdate, targetDir, (progress) => {
      if (modalProgressStep) modalProgressStep.textContent = progress.step || 'Обновление...';
      if (modalProgressPercent) modalProgressPercent.textContent = `${Math.round(progress.percent)}%`;
      if (modalProgressBarFill) modalProgressBarFill.style.width = `${progress.percent}%`;
    });

    // Mark as installed in localStorage to prevent loop popups
    try {
      localStorage.setItem(STORAGE_LAST_INSTALLED_KEY, currentAvailableUpdate.latestVersion);
    } catch (e) {}

    // Show Success State inside Modal
    const modalPreUpdateBody = document.getElementById('modalPreUpdateBody');
    const modalSuccessBody = document.getElementById('modalSuccessBody');
    const modalFooter = document.getElementById('modalFooter');

    if (modalPreUpdateBody) modalPreUpdateBody.style.display = 'none';
    if (modalSuccessBody) modalSuccessBody.style.display = 'flex';

    if (modalFooter) {
      modalFooter.innerHTML = `
        <button id="btnDismissPostUpdate" class="btn-secondary">Закрыть</button>
        <button id="btnReloadPanelNow" class="btn-primary">
          <span>🔄</span> Перезагрузить панель сейчас
        </button>
      `;

      document.getElementById('btnDismissPostUpdate')?.addEventListener('click', closeUpdateModal);
      document.getElementById('btnReloadPanelNow')?.addEventListener('click', () => {
        forceReloadPanel();
      });
    }

    if (btnUpdateModalClose) btnUpdateModalClose.disabled = false;
    showToast(`✅ Broadcast QC успешно обновлен до v${currentAvailableUpdate.latestVersion}!`, 'success', 5000);
    playChime(true);

  } catch (err) {
    if (btnPerform) btnPerform.disabled = false;
    if (btnRemind) btnRemind.disabled = false;
    if (btnUpdateModalClose) btnUpdateModalClose.disabled = false;
    if (modalProgressStep) {
      modalProgressStep.textContent = `Ошибка: ${err.message}`;
      modalProgressStep.style.color = 'var(--error)';
    }
    showToast(`Ошибка установки обновления: ${err.message}`, 'error', 6000);
  }
}

function forceReloadPanel() {
  if (csInterface.isCEP) {
    try {
      csInterface.loadJSX('host/index.jsx', () => {});
    } catch (e) {}
  }
  // Hard reload with cache-busting timestamp
  const cleanUrl = window.location.href.split('?')[0];
  window.location.href = `${cleanUrl}?t=${Date.now()}`;
}

async function checkForUpdatesSilent() {
  try {
    const info = await autoUpdater.checkForUpdates();
    if (info && info.hasUpdate) {
      // Don't pop up again if this version was already installed in this session
      let lastInstalled = '';
      try {
        lastInstalled = localStorage.getItem(STORAGE_LAST_INSTALLED_KEY);
      } catch (e) {}
      if (lastInstalled && lastInstalled === info.latestVersion) {
        console.log('[AutoUpdater] Update v' + info.latestVersion + ' was already installed, awaiting AE restart');
        return;
      }
      openUpdateModal(info);
    }
  } catch (e) {
    console.log('[AutoUpdater] Silent check skipped:', e.message);
  }
}

function openUpdateModal(info) {
  currentAvailableUpdate = info;
  if (modalNewVersionTitle) modalNewVersionTitle.textContent = `Версия v${info.latestVersion} (${info.releaseName || 'Новый релиз'})`;
  if (modalCurrentVersion) modalCurrentVersion.textContent = `Текущая: v${APP_CURRENT_VERSION}`;
  if (modalReleaseNotes) modalReleaseNotes.textContent = info.releaseNotes || 'Список изменений не предоставлен.';

  const modalPreUpdateBody = document.getElementById('modalPreUpdateBody');
  const modalSuccessBody = document.getElementById('modalSuccessBody');
  if (modalPreUpdateBody) modalPreUpdateBody.style.display = 'block';
  if (modalSuccessBody) modalSuccessBody.style.display = 'none';

  if (modalProgressContainer) modalProgressContainer.style.display = 'none';
  const modalFooter = document.getElementById('modalFooter');
  if (modalFooter) {
    modalFooter.innerHTML = `
      <button id="btnRemindLater" class="btn-secondary">Позже</button>
      <button id="btnPerformUpdate" class="btn-primary">
        <span>🚀</span> Обновиться сейчас
      </button>
    `;
    document.getElementById('btnRemindLater')?.addEventListener('click', closeUpdateModal);
    document.getElementById('btnPerformUpdate')?.addEventListener('click', performUpdateHandler);
  }

  if (btnUpdateModalClose) btnUpdateModalClose.disabled = false;
  if (updateModal) updateModal.style.display = 'flex';
}

function closeUpdateModal() {
  if (updateModal) updateModal.style.display = 'none';
}

// ==========================================
// 11. Main Analysis Pipeline (Run QC)
// ==========================================

chkScanEntireProject?.addEventListener('change', () => {
  if (chkScanEntireProject.checked) {
    if (chkScanNested) chkScanNested.disabled = true;
    btnRunText.textContent = 'Запустить проверку всего проекта';
  } else {
    if (chkScanNested) chkScanNested.disabled = false;
    btnRunText.textContent = 'Запустить проверку композиции';
  }
});

btnRunQC.addEventListener('click', async () => {
  const isProjectScan = chkScanEntireProject && chkScanEntireProject.checked;
  const isNestedScan = chkScanNested ? chkScanNested.checked : true;

  btnRunQC.disabled = true;
  btnRunIcon.innerHTML = '<span class="spinner"></span>';
  btnRunText.textContent = isProjectScan ? 'Анализ проекта...' : 'Анализ композиции...';

  // Apply options to engine
  qcCore.options.checkSpelling = chkSpelling ? chkSpelling.checked : true;
  qcCore.options.checkSafeZone = chkSafeZone ? chkSafeZone.checked : false;
  qcCore.options.checkReadingSpeed = false;
  qcCore.options.checkProjectHealth = false;
  qcCore.options.useAI = chkUseAI ? chkUseAI.checked : false;
  qcCore.spellChecker.checkTypography = chkTypography ? chkTypography.checked : true;
  qcCore.spellChecker.useOnlineSpeller = chkOnlineSpeller ? chkOnlineSpeller.checked : false;

  const defaultBtnText = isProjectScan ? 'Запустить проверку всего проекта' : 'Запустить проверку композиции';

  const onScanComplete = async (rawResult) => {
    try {
      if (!rawResult || rawResult === 'EvalScript error.') {
        throw new Error('ExtendScript не ответил. Перезапустите панель или проверьте открытую композицию в AE.');
      }

      const scanData = JSON.parse(rawResult);

      if (!scanData || !scanData.success) {
        btnRunQC.disabled = false;
        btnRunIcon.textContent = '⚡';
        btnRunText.textContent = defaultBtnText;
        hideProgress();
        playChime(false);

        const errMsg = scanData ? scanData.error : 'Не удалось получить данные композиции из After Effects';
        showToast(errMsg, 'warning', 5000);
        return;
      }

      // Check if composition has 0 text layers
      if (!scanData.layers || scanData.layers.length === 0) {
        btnRunQC.disabled = false;
        btnRunIcon.textContent = '⚡';
        btnRunText.textContent = defaultBtnText;
        updateProgress(100, 'В композициях не найдено текстовых слоёв.');
        hideProgress();
        playChime(true);

        const compName = scanData.composition?.name || 'Композиция';
        showToast(`В «${compName}» не найдено текстовых слоёв`, 'info', 4000);

        summarySection.style.display = 'none';
        btnExportReport.style.display = 'none';
        issuesContainer.innerHTML = `
          <div class="empty-state">
            ℹ️ В <b>«${escapeHTML(compName)}»</b> (всего слоёв: ${scanData.totalCompLayers || 0}) не найдено ни одного текстового слоя.<br><br>
            Добавьте текстовый слой на таймлайн (<b>Ctrl+T</b> / <b>Cmd+T</b>) или откройте композицию с титрами и повторите анализ.
          </div>
        `;
        return;
      }

      // Step 2: Core modules analysis
      updateProgress(45, `📝 [2/4] Проверка орфографии, типографики и ${scanData.layers.length} слоёв...`);

      await new Promise(r => setTimeout(r, 60)); // Yield to UI
      updateProgress(70, '📐 [3/4] Расчёт ТВ Safe Zone, скорости чтения (WPM/CPS) и Guide-слоёв...');

      if (chkUseAI.checked && aiConfig.provider !== 'none') {
        updateProgress(85, '🧠 [4/4] Запрос к AI-агенту для анализа смысла и падежей...');
      } else {
        updateProgress(90, '⚡ [4/4] Формирование паспорта контроля качества...');
      }

      const report = await qcCore.analyze(scanData);
      lastQCReport = report;

      updateProgress(100, '✅ Анализ успешно завершён!');
      playChime(report.summary.totalErrors === 0);

      btnRunQC.disabled = false;
      btnRunIcon.textContent = '⚡';
      btnRunText.textContent = defaultBtnText;
      hideProgress();

      renderReport(report);

      const errCount = report.summary.totalErrors;
      const warnCount = report.summary.totalWarnings;
      const infoCount = report.summary.totalInfo || 0;
      const layerCount = report.summary.totalLayersChecked;
      const wordCount = report.summary.totalWordsChecked || 0;

      if (errCount === 0 && warnCount === 0 && infoCount === 0) {
        showToast(`✅ Проверка завершена: ${layerCount} слоёв (${wordCount} слов) соответствуют стандартам!`, 'success', 4000);
      } else {
        showToast(`Проверено: ${layerCount} слоёв, ${wordCount} слов (ошибок: ${errCount}, предупр: ${warnCount}, замеч: ${infoCount})`, errCount > 0 ? 'error' : 'warning', 5000);
      }

    } catch (err) {
      console.error('QC execution error:', err);
      btnRunQC.disabled = false;
      btnRunIcon.textContent = '⚡';
      btnRunText.textContent = defaultBtnText;
      hideProgress();
      playChime(false);

      showToast(`Ошибка анализа: ${err.message}`, 'error', 5000);
      showGlobalError(`Ошибка при выполнении анализа: ${err.stack || err.message}`);
    }
  };

  if (isProjectScan) {
    updateProgress(15, '🔍 [1/4] Поиск и сбор всех композиций проекта .aep...');
    csInterface.evalScript('BroadcastQCHost.scanEntireProject(5)', onScanComplete);
  } else {
    updateProgress(15, `🔍 [1/4] Сканирование композиции (${isNestedScan ? 'включая вложенные Pre-comps' : 'только активная'})...`);
    csInterface.evalScript(`BroadcastQCHost.scanActiveComposition(5, ${isNestedScan})`, onScanComplete);
  }
});

// ==========================================
// 12. Interactive Summary Filtering & QC Report Rendering
// ==========================================

let currentIssueFilter = 'all'; // 'all', 'error', 'warning', 'info'

function initSummaryFilterUI() {
  statBoxErrors?.addEventListener('click', () => {
    currentIssueFilter = (currentIssueFilter === 'error') ? 'all' : 'error';
    updateFilterVisuals();
    renderFilteredIssues();
  });

  statBoxWarnings?.addEventListener('click', () => {
    currentIssueFilter = (currentIssueFilter === 'warning') ? 'all' : 'warning';
    updateFilterVisuals();
    renderFilteredIssues();
  });

  statBoxInfo?.addEventListener('click', () => {
    currentIssueFilter = (currentIssueFilter === 'info') ? 'all' : 'info';
    updateFilterVisuals();
    renderFilteredIssues();
  });

  statBoxLayers?.addEventListener('click', () => {
    currentIssueFilter = 'all';
    updateFilterVisuals();
    renderFilteredIssues();
  });
}

function updateFilterVisuals() {
  statBoxErrors?.classList.toggle('active', currentIssueFilter === 'error');
  statBoxWarnings?.classList.toggle('active', currentIssueFilter === 'warning');
  statBoxInfo?.classList.toggle('active', currentIssueFilter === 'info');
  statBoxLayers?.classList.toggle('active', currentIssueFilter === 'all');
}

function renderReport(report) {
  summarySection.style.display = 'block';
  btnExportReport.style.display = 'inline-flex';

  statErrors.textContent = report.summary.totalErrors || 0;
  statWarnings.textContent = report.summary.totalWarnings || 0;
  if (statInfo) statInfo.textContent = report.summary.totalInfo || 0;
  statLayers.textContent = report.summary.totalLayersChecked || 0;
  if (statWordsChecked) {
    const wCount = report.summary.totalWordsChecked || 0;
    statWordsChecked.textContent = `(${wCount} сл.)`;
  }
  if (statBoxLayers) {
    statBoxLayers.title = `Проверено: ${report.summary.totalLayersChecked || 0} слоёв, ${report.summary.totalWordsChecked || 0} слов`;
  }

  currentIssueFilter = 'all';
  updateFilterVisuals();
  renderFilteredIssues();
}

function renderWordDiff(word, suggestion) {
  if (!word) return '';
  if (!suggestion) return `<span class="err-word-highlight">${escapeHTML(word)}</span>`;

  // Find common prefix
  let start = 0;
  while (start < word.length && start < suggestion.length && word[start].toLowerCase() === suggestion[start].toLowerCase()) {
    start++;
  }

  // Find common suffix
  let wordEnd = word.length - 1;
  let suggEnd = suggestion.length - 1;
  while (wordEnd >= start && suggEnd >= start && word[wordEnd].toLowerCase() === suggestion[suggEnd].toLowerCase()) {
    wordEnd--;
    suggEnd--;
  }

  const prefix = word.slice(0, start);
  const diffErr = word.slice(start, wordEnd + 1);
  const suffix = word.slice(wordEnd + 1);

  if (!diffErr) {
    return `<span class="err-word-highlight">${escapeHTML(word)}</span>`;
  }

  return `${escapeHTML(prefix)}<span class="err-char-highlight" title="Ошибочная буква/символ">${escapeHTML(diffErr)}</span>${escapeHTML(suffix)}`;
}

function renderFilteredIssues() {
  if (!lastQCReport) return;

  issuesContainer.innerHTML = '';
  const allIssues = lastQCReport.issues || [];
  const compName = lastQCReport.composition?.name || 'Композиция';

  if (allIssues.length === 0) {
    issuesContainer.innerHTML = `
      <div class="empty-state" style="color: var(--success); font-weight: 600; border-color: var(--success-border); background: var(--success-bg);">
        ✓ Замечаний не обнаружено! Все ${lastQCReport.summary.totalLayersChecked} слоёв композиции «${escapeHTML(compName)}» полностью соответствуют broadcast-стандартам.
      </div>
    `;
    return;
  }

  let filtered = allIssues;
  if (currentIssueFilter === 'error') {
    filtered = allIssues.filter(i => i.severity === 'error');
  } else if (currentIssueFilter === 'warning') {
    filtered = allIssues.filter(i => i.severity === 'warning');
  } else if (currentIssueFilter === 'info') {
    filtered = allIssues.filter(i => i.severity === 'info');
  }

  if (filtered.length === 0) {
    let filterName = 'замечаний';
    if (currentIssueFilter === 'error') filterName = 'ошибок';
    if (currentIssueFilter === 'warning') filterName = 'предупреждений';
    if (currentIssueFilter === 'info') filterName = 'замечаний (типографика/подсказки)';

    issuesContainer.innerHTML = `
      <div class="empty-state">
        ℹ️ В композиции «${escapeHTML(compName)}» не найдено <b>${filterName}</b>.<br><br>
        <button class="btn-secondary" id="btnResetFilter" style="margin-top: 6px;">Показать все замечания</button>
      </div>
    `;
    document.getElementById('btnResetFilter')?.addEventListener('click', () => {
      currentIssueFilter = 'all';
      updateFilterVisuals();
      renderFilteredIssues();
    });
    return;
  }

  filtered.forEach((issue) => {
    const card = document.createElement('div');
    card.className = `issue-card ${issue.severity === 'warning' ? 'warning' : (issue.severity === 'info' ? 'info' : '')}`;

    let messageHTML = '';
    if (issue.category === 'spelling' && issue.word) {
      const diffHTML = renderWordDiff(issue.word, issue.suggestion);
      messageHTML = `Опечатка: <b>${diffHTML}</b>${issue.suggestion ? ` &rarr; <span class="sugg-word-highlight">${escapeHTML(issue.suggestion)}</span>` : ''}`;
    } else {
      messageHTML = escapeHTML(issue.message);
    }

    let compBadgeHTML = '';
    if (issue.parentCompName) {
      compBadgeHTML = `<span class="comp-source-badge" title="Вложенная композиция: ${escapeHTML(issue.parentCompName)} &rarr; ${escapeHTML(issue.compName)}">📁 ${escapeHTML(issue.compName)}</span>`;
    } else if (lastQCReport.composition?.name.startsWith('Весь проект') && issue.compName) {
      compBadgeHTML = `<span class="comp-source-badge" title="Композиция: ${escapeHTML(issue.compName)}">📁 ${escapeHTML(issue.compName)}</span>`;
    }

    let actionsHTML = '';
    
    // 1-Click Auto-Fix Button (Light Green Tint)
    if (issue.suggestion && (issue.category === 'spelling' || issue.category === 'typography' || issue.category === 'ai-logic')) {
      const fixLabel = issue.word ? `✨ Исправить на «${escapeHTML(issue.suggestion)}»` : '✨ Исправить в слое';
      actionsHTML += `
        <button class="btn-mini auto-fix" data-old="${escapeHTML(issue.word || '')}" data-new="${escapeHTML(issue.suggestion)}">
          ${fixLabel}
        </button>
      `;

      // Alternative suggestions Dropdown Select
      if (Array.isArray(issue.suggestions) && issue.suggestions.length > 1) {
        const alts = issue.suggestions.filter(s => s !== issue.suggestion);
        if (alts.length > 0) {
          actionsHTML += `
            <select class="alt-select-dropdown" data-old="${escapeHTML(issue.word || '')}" title="Выбрать другой вариант замены">
              <option value="" disabled selected>Другие варианты (${alts.length})...</option>
              ${alts.map(altWord => `
                <option value="${escapeHTML(altWord)}">${escapeHTML(altWord)}</option>
              `).join('')}
            </select>
          `;
        }
      }
    }

    // Add to dictionary Button (Compact)
    if (issue.category === 'spelling' && issue.word) {
      actionsHTML += `
        <button class="btn-mini add-dict" data-word="${escapeHTML(issue.word)}">+ В словарь</button>
      `;
    }

    card.innerHTML = `
      <div class="issue-header">
        <div class="issue-layer-badge">
          <span class="layer-num-badge">#${issue.layerIndex}</span>
          ${compBadgeHTML}
          <span class="layer-title-text" title="${escapeHTML(issue.layerName)}">${escapeHTML(issue.layerName)}</span>
        </div>
        <div class="issue-timecode" title="Кликните для перехода на таймлайн">⏱ ${escapeHTML(issue.timecode)}</div>
      </div>
      <div class="issue-message">${messageHTML}</div>
      ${actionsHTML ? `<div class="issue-actions">${actionsHTML}</div>` : ''}
    `;

    // Click on card -> Navigate in After Effects
    card.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('select')) return;
      csInterface.evalScript(`BroadcastQCHost.navigateToLayer(${issue.layerIndex}, ${issue.time}, ${issue.compId || 0})`, (navRes) => {
        const locationDesc = issue.compName ? `[${issue.compName}] ` : '';
        showToast(`Переход: ${locationDesc}слой #${issue.layerIndex} «${issue.layerName}» (${issue.timecode})`, 'info', 2000);
      });
    });

    // Auto-fix handler
    const autoFixBtn = card.querySelector('.auto-fix');
    if (autoFixBtn) {
      autoFixBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const oldVal = autoFixBtn.getAttribute('data-old');
        const newVal = autoFixBtn.getAttribute('data-new');

        const escapedOld = JSON.stringify(oldVal);
        const escapedNew = JSON.stringify(newVal);

        autoFixBtn.disabled = true;
        autoFixBtn.textContent = '⏳...';

        csInterface.evalScript(`BroadcastQCHost.applyTextFix(${issue.layerIndex}, ${escapedOld}, ${escapedNew}, ${issue.compId || 0})`, (res) => {
          try {
            const data = JSON.parse(res);
            if (data && data.success) {
              autoFixBtn.textContent = '✓ Исправлено';
              autoFixBtn.style.color = 'var(--success)';
              autoFixBtn.style.borderColor = 'var(--success-border)';
              showToast(`Слой #${issue.layerIndex}: «${oldVal}» исправлено на «${newVal}»`, 'success', 3000);
            } else {
              autoFixBtn.disabled = false;
              autoFixBtn.textContent = '✨ Исправить в слое';
              showToast(`Ошибка автозамены: ${data?.error || 'Не удалось обновить слой'}`, 'error');
            }
          } catch (err) {
            autoFixBtn.disabled = false;
            autoFixBtn.textContent = '✨ Исправить в слое';
            showToast('Ошибка при отправке команды в After Effects', 'error');
          }
        });
      });
    }

    // Alternative select dropdown handler
    const altSelect = card.querySelector('.alt-select-dropdown');
    if (altSelect) {
      altSelect.addEventListener('change', (e) => {
        e.stopPropagation();
        const oldVal = altSelect.getAttribute('data-old');
        const newVal = altSelect.value;
        if (!newVal) return;

        const escapedOld = JSON.stringify(oldVal);
        const escapedNew = JSON.stringify(newVal);

        altSelect.disabled = true;

        csInterface.evalScript(`BroadcastQCHost.applyTextFix(${issue.layerIndex}, ${escapedOld}, ${escapedNew}, ${issue.compId || 0})`, (res) => {
          try {
            const data = JSON.parse(res);
            if (data && data.success) {
              if (autoFixBtn) {
                autoFixBtn.textContent = `✓ «${newVal}»`;
                autoFixBtn.style.color = 'var(--success)';
              }
              showToast(`Слой #${issue.layerIndex}: заменено на «${newVal}»`, 'success', 3000);
            } else {
              altSelect.disabled = false;
              showToast(`Ошибка автозамены: ${data?.error || 'Не удалось обновить слой'}`, 'error');
            }
          } catch (err) {
            altSelect.disabled = false;
            showToast('Ошибка при отправке команды в After Effects', 'error');
          }
        });
      });
    }

    // Add to dictionary handler
    const addDictBtn = card.querySelector('.add-dict');
    if (addDictBtn) {
      addDictBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wordToAdd = addDictBtn.getAttribute('data-word');
        userDict.add(wordToAdd);
        persistUserDictionary();
        renderDictionaryTags();
        addDictBtn.textContent = '✓ В словаре';
        addDictBtn.disabled = true;
        showToast(`Слово «${wordToAdd}» добавлено в словарь`, 'success', 2500);
      });
    }

    issuesContainer.appendChild(card);
  });
}

// ==========================================
// 13. Export HTML Report
// ==========================================

btnExportReport.addEventListener('click', () => {
  if (!lastQCReport) {
    showToast('Сначала выполните проверку композиции', 'warning');
    return;
  }
  
  try {
    const htmlContent = qcCore.generateHTMLReport(lastQCReport);

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = `Broadcast_QC_Report_${(lastQCReport.composition.name || 'Comp').replace(/[\s\W]+/g, '_')}.html`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Отчёт «${fileName}» успешно сохранён`, 'success', 4000);
  } catch (err) {
    showToast(`Ошибка экспорта отчёта: ${err.message}`, 'error');
  }
});

// ==========================================
// 14. Helper Functions
// ==========================================

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

function declension(number, titles) {
  const cases = [2, 0, 1, 1, 1, 2];
  return titles[
    number % 100 > 4 && number % 100 < 20
      ? 2
      : cases[number % 10 < 5 ? number % 10 : 5]
  ];
}

// Start application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
