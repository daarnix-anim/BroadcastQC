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

const APP_CURRENT_VERSION = '2.0.0';

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
const chkTypography = document.getElementById('chkTypography');
const chkReadingSpeed = document.getElementById('chkReadingSpeed');
const chkHealth = document.getElementById('chkHealth');
const chkSafeZone = document.getElementById('chkSafeZone');
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

const guidanceCard = document.getElementById('guidanceCard');
const guidanceIcon = document.getElementById('guidanceIcon');
const guidanceHeading = document.getElementById('guidanceHeading');
const guidanceBody = document.getElementById('guidanceBody');

const summarySection = document.getElementById('summarySection');
const statErrors = document.getElementById('statErrors');
const statWarnings = document.getElementById('statWarnings');
const statLayers = document.getElementById('statLayers');
const issuesContainer = document.getElementById('issuesContainer');
const initialEmptyState = document.getElementById('initialEmptyState');

const selectSafePreset = document.getElementById('selectSafePreset');
const customMarginsGroup = document.getElementById('customMarginsGroup');
const customMarginH = document.getElementById('customMarginH');
const customMarginV = document.getElementById('customMarginV');

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

// ==========================================
// 4. Lifecycle & After Effects Connection
// ==========================================

function init() {
  if (appVersionBadge) appVersionBadge.textContent = `v${APP_CURRENT_VERSION}`;
  initTabs();
  initDictionaryUI();
  initSafeZoneUI();
  initAIUI();
  initUpdaterUI();
  initExtendScript();
  checkAEConnection(true);

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
// 7. Safe Zone Settings UI
// ==========================================

function initSafeZoneUI() {
  selectSafePreset.addEventListener('change', () => {
    const val = selectSafePreset.value;
    if (val === 'custom') {
      customMarginsGroup.style.display = 'flex';
      qcCore.safeZoneChecker.customMarginPercent = {
        left: Number(customMarginH.value),
        right: Number(customMarginH.value),
        top: Number(customMarginV.value),
        bottom: Number(customMarginV.value)
      };
      qcCore.safeZoneChecker.preset = null;
    } else {
      customMarginsGroup.style.display = 'none';
      qcCore.safeZoneChecker.customMarginPercent = null;
      if (val === 'ebu_r95_title') qcCore.safeZoneChecker.preset = BROADCAST_PRESETS.EBU_R95_TITLE_SAFE;
      if (val === 'ebu_r95_action') qcCore.safeZoneChecker.preset = BROADCAST_PRESETS.EBU_R95_ACTION_SAFE;
      if (val === 'smpte_title_80') qcCore.safeZoneChecker.preset = BROADCAST_PRESETS.SMPTE_TITLE_SAFE_80;
      if (val === 'smpte_action_90') qcCore.safeZoneChecker.preset = BROADCAST_PRESETS.SMPTE_ACTION_SAFE_90;
      if (val === 'social_vertical_9_16') qcCore.safeZoneChecker.preset = BROADCAST_PRESETS.SOCIAL_VERTICAL_9_16;
    }
  });

  const updateCustomMargins = () => {
    if (selectSafePreset.value === 'custom') {
      qcCore.safeZoneChecker.customMarginPercent = {
        left: Number(customMarginH.value),
        right: Number(customMarginH.value),
        top: Number(customMarginV.value),
        bottom: Number(customMarginV.value)
      };
    }
  };

  customMarginH.addEventListener('input', updateCustomMargins);
  customMarginV.addEventListener('input', updateCustomMargins);
}

// ==========================================
// 8. AI Settings UI
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

  btnPerformUpdate?.addEventListener('click', async () => {
    if (!currentAvailableUpdate) return;

    btnPerformUpdate.disabled = true;
    btnRemindLater.disabled = true;
    btnUpdateModalClose.disabled = true;
    modalProgressContainer.style.display = 'flex';

    // Target extension directory
    let targetDir = '';
    if (csInterface.isCEP) {
      targetDir = csInterface.getSystemPath(csInterface.SystemPath.EXTENSION);
    }

    try {
      await autoUpdater.downloadAndInstall(currentAvailableUpdate, targetDir, (progress) => {
        modalProgressStep.textContent = progress.step || 'Обновление...';
        modalProgressPercent.textContent = `${Math.round(progress.percent)}%`;
        modalProgressBarFill.style.width = `${progress.percent}%`;
      });

      showToast(`✅ Broadcast QC успешно обновлен до v${currentAvailableUpdate.latestVersion}! Перезагрузка...`, 'success', 3000);
      playChime(true);

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      btnPerformUpdate.disabled = false;
      btnRemindLater.disabled = false;
      btnUpdateModalClose.disabled = false;
      modalProgressStep.textContent = `Ошибка: ${err.message}`;
      modalProgressStep.style.color = 'var(--error)';
      showToast(`Ошибка установки обновления: ${err.message}`, 'error', 6000);
    }
  });
}

async function checkForUpdatesSilent() {
  try {
    const info = await autoUpdater.checkForUpdates();
    if (info && info.hasUpdate) {
      openUpdateModal(info);
    }
  } catch (e) {
    console.log('[AutoUpdater] Silent check skipped:', e.message);
  }
}

function openUpdateModal(info) {
  currentAvailableUpdate = info;
  modalNewVersionTitle.textContent = `Версия v${info.latestVersion} (${info.releaseName || 'Новый релиз'})`;
  modalCurrentVersion.textContent = `Текущая: v${APP_CURRENT_VERSION}`;
  modalReleaseNotes.textContent = info.releaseNotes || 'Список изменений не предоставлен.';

  modalProgressContainer.style.display = 'none';
  btnPerformUpdate.disabled = false;
  btnRemindLater.disabled = false;
  btnUpdateModalClose.disabled = false;

  updateModal.style.display = 'flex';
}

function closeUpdateModal() {
  updateModal.style.display = 'none';
}

// ==========================================
// 11. Main Analysis Pipeline (Run QC)
// ==========================================

btnRunQC.addEventListener('click', async () => {
  btnRunQC.disabled = true;
  btnRunIcon.innerHTML = '<span class="spinner"></span>';
  btnRunText.textContent = 'Анализ композиции...';

  // Apply options to engine
  qcCore.options.checkSpelling = chkSpelling.checked;
  qcCore.options.checkSafeZone = chkSafeZone.checked;
  qcCore.options.checkReadingSpeed = chkReadingSpeed.checked;
  qcCore.options.checkProjectHealth = chkHealth.checked;
  qcCore.options.useAI = chkUseAI.checked;
  qcCore.spellChecker.checkTypography = chkTypography.checked;

  updateProgress(15, '🔍 [1/4] Сканирование таймлайна After Effects (слои, ключи, геометрия)...');

  csInterface.evalScript('BroadcastQCHost.scanActiveComposition(5)', async (rawResult) => {
    try {
      if (!rawResult || rawResult === 'EvalScript error.') {
        throw new Error('ExtendScript не ответил. Перезапустите панель или проверьте открытую композицию в AE.');
      }

      const scanData = JSON.parse(rawResult);

      if (!scanData || !scanData.success) {
        btnRunQC.disabled = false;
        btnRunIcon.textContent = '⚡';
        btnRunText.textContent = 'Запустить проверку композиции';
        hideProgress();
        playChime(false);

        const errMsg = scanData ? scanData.error : 'Не удалось получить данные композиции из After Effects';
        showToast(errMsg, 'warning', 5000);

        showGuidance('attention', 'Требуется действие в After Effects:', `
          ${escapeHTML(errMsg)}<br><br>
          <b>Что сделать:</b><br>
          1. Откройте нужный проект <code>.aep</code>.<br>
          2. Дважды кликните по композиции на панели Project или откройте её вкладку на таймлайне.<br>
          3. Нажмите кнопку <b>«Запустить проверку композиции»</b> снова.
        `);
        return;
      }

      // Check if composition has 0 text layers
      if (!scanData.layers || scanData.layers.length === 0) {
        btnRunQC.disabled = false;
        btnRunIcon.textContent = '⚡';
        btnRunText.textContent = 'Запустить проверку композиции';
        updateProgress(100, 'В композиции не найдено текстовых слоёв.');
        hideProgress();
        playChime(true);

        const compName = scanData.composition?.name || 'Композиция';
        showToast(`В композиции «${compName}» нет текстовых слоёв`, 'info', 4000);

        summarySection.style.display = 'none';
        btnExportReport.style.display = 'none';
        issuesContainer.innerHTML = `
          <div class="empty-state">
            ℹ️ В активной композиции <b>«${escapeHTML(compName)}»</b> (всего слоёв: ${scanData.totalCompLayers || 0}) не найдено ни одного текстового слоя.<br><br>
            Добавьте текстовый слой на таймлайн (<b>Ctrl+T</b> / <b>Cmd+T</b>) или откройте композицию с титрами и повторите анализ.
          </div>
        `;

        showGuidance('attention', 'Что делать дальше:', `
          В текущей композиции <b>«${escapeHTML(compName)}»</b> отсутствуют текстовые слои.<br>
          • Создайте титры или переключитесь на композицию с текстом.<br>
          • После этого нажмите <b>«⚡ Запустить проверку композиции»</b>.
        `);
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
      btnRunText.textContent = 'Запустить проверку композиции';
      hideProgress();

      renderReport(report);

      const errCount = report.summary.totalErrors;
      const warnCount = report.summary.totalWarnings;
      const layerCount = report.summary.totalLayersChecked;

      if (errCount === 0 && warnCount === 0) {
        showToast(`✅ Проверка завершена: все ${layerCount} слоёв соответствуют ТВ-стандартам!`, 'success', 4000);
      } else {
        showToast(`Проверка завершена: ${layerCount} слоёв, ${errCount} опечаток/ошибок, ${warnCount} предупреждений`, errCount > 0 ? 'error' : 'warning', 5000);
      }

    } catch (err) {
      console.error('QC execution error:', err);
      btnRunQC.disabled = false;
      btnRunIcon.textContent = '⚡';
      btnRunText.textContent = 'Запустить проверку композиции';
      hideProgress();
      playChime(false);

      showToast(`Ошибка анализа: ${err.message}`, 'error', 5000);
      showGlobalError(`Ошибка при выполнении анализа: ${err.stack || err.message}`);
    }
  });
});

// ==========================================
// 12. Render QC Report & Guidance
// ==========================================

function renderReport(report) {
  summarySection.style.display = 'block';
  btnExportReport.style.display = 'inline-flex';

  statErrors.textContent = report.summary.totalErrors;
  statWarnings.textContent = report.summary.totalWarnings;
  statLayers.textContent = report.summary.totalLayersChecked;

  issuesContainer.innerHTML = '';

  const totalIssues = report.issues.length;
  const compName = report.composition?.name || 'Композиция';

  if (totalIssues === 0) {
    issuesContainer.innerHTML = `
      <div class="empty-state" style="color: var(--success); font-weight: 600; border-color: var(--success-border); background: var(--success-bg);">
        ✓ Замечаний не обнаружено! Все ${report.summary.totalLayersChecked} слоёв композиции «${escapeHTML(compName)}» полностью соответствуют broadcast-стандартам.
      </div>
    `;

    showGuidance('clean', '🎉 Проект готов к эфиру и рендеру!', `
      Все <b>${report.summary.totalLayersChecked}</b> текстовых слоёв проверены (орфография, ТВ-типографика, Safe Zone, скорость чтения и Guide-слои).<br>
      • Вы можете экспортировать официальный паспорт контроля качества перед сдачей клиенту (кнопка <b>«📄 Экспорт отчёта»</b> выше).
    `);
    return;
  }

  // Guidance for issues found
  showGuidance('attention', '💡 Что делать дальше:', `
    В композиции <b>«${escapeHTML(compName)}»</b> найдено ${totalIssues} ${declension(totalIssues, ['замечание', 'замечания', 'замечаний'])}:<br>
    <ul class="guidance-list">
      <li><b>Кликните по карточке</b> — After Effects мгновенно переместит курсор на таймлайне и выделит проблемный слой.</li>
      <li>Нажмите <b>«✨ Исправить в слое»</b> — опечатка заменится прямо в After Effects с сохранением цвета, размера и шрифта.</li>
      <li>Нажмите <b>«+ В словарь»</b> — если слово или бренд является верным, чтобы исключить его из последующих проверок.</li>
      <li>Нажмите <b>«📄 Экспорт отчёта»</b> — для сохранения паспорта качества в HTML.</li>
    </ul>
  `);

  report.issues.forEach((issue, issueIdx) => {
    const card = document.createElement('div');
    card.className = `issue-card ${issue.severity === 'warning' ? 'warning' : (issue.severity === 'info' ? 'info' : '')}`;

    let icon = '🔴';
    if (issue.severity === 'warning') icon = '🟡';
    if (issue.severity === 'info') icon = 'ℹ️';

    let actionsHTML = '';
    
    // 1-Click Auto-Fix Button
    if (issue.suggestion && (issue.category === 'spelling' || issue.category === 'typography' || issue.category === 'ai-logic')) {
      actionsHTML += `
        <button class="btn-mini auto-fix" data-old="${escapeHTML(issue.word || '')}" data-new="${escapeHTML(issue.suggestion)}">
          ✨ Исправить в слое
        </button>
      `;
    }

    // Add to dictionary Button
    if (issue.category === 'spelling' && issue.word) {
      actionsHTML += `
        <button class="btn-mini add-dict" data-word="${escapeHTML(issue.word)}">+ В словарь</button>
      `;
    }

    card.innerHTML = `
      <div class="issue-header">
        <div class="issue-title">
          <span>${icon}</span>
          <span>${escapeHTML(issue.layerName)}</span>
        </div>
        <div class="issue-timecode" title="Кликните для перехода в After Effects">⏱ ${escapeHTML(issue.timecode)}</div>
      </div>
      <div class="issue-message">${escapeHTML(issue.message)}</div>
      ${actionsHTML ? `<div class="issue-actions">${actionsHTML}</div>` : ''}
    `;

    // Click on card -> Navigate in After Effects
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      csInterface.evalScript(`BroadcastQCHost.navigateToLayer(${issue.layerIndex}, ${issue.time})`, (navRes) => {
        showToast(`Переход к слою «${issue.layerName}» (${issue.timecode})`, 'info', 2000);
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
        autoFixBtn.textContent = '⏳ Исправление...';

        csInterface.evalScript(`BroadcastQCHost.applyTextFix(${issue.layerIndex}, ${escapedOld}, ${escapedNew})`, (res) => {
          try {
            const data = JSON.parse(res);
            if (data && data.success) {
              autoFixBtn.textContent = '✓ Исправлено';
              autoFixBtn.style.color = 'var(--success)';
              autoFixBtn.style.borderColor = 'var(--success-border)';
              showToast(`Текст в слое «${issue.layerName}» успешно исправлен на «${newVal}»`, 'success', 3000);
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
        showToast(`Слово «${wordToAdd}» добавлено в словарь исключений`, 'success', 2500);
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
document.addEventListener('DOMContentLoaded', init);
