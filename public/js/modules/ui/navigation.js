// modules/ui/navigation.js - Quiz List and Folder Navigation
import CONFIG, { getQuizFilePath } from '../../config.js';
import { fetchQuizList, fetchQuizContent } from '../api.js';
import { showNotification } from './notifications.js';
import { showLoading, hideLoading, disableAllControlsDuringLoad, enableAllControlsAfterLoad } from './loading.js';
import { addFadeInAnimation } from '../utils.js';
import { clearLevelCounts, setCurrentFolder, getCurrentFolder, setSelectedFileName, updateQuizState } from '../state.js';
import { loadQuiz } from '../quiz-loader.js';
import { parseQuestions, recountLevelsForQuestions } from '../parser.js';
import { showTopControls } from './controls.js';
import { createTopLevelCheckboxes, setupTopQuestionCountInput } from '../quiz-settings.js';
import { displayQuestions } from '../quiz-manager.js';

let currentFolderPath = '';
let selectedQuizzes   = new Set();
let currentRequestId  = 0;

// ===================================
// VALIDATION CACHE
// ===================================

const validationCache = {
  files:   {},
  folders: {},
};

let cacheLoadedFromDisk = false;
let activeCacheFilename = null;   // set once the JSON is loaded, used for logging

/**
 * Fetch validation-cache.json once and hydrate the in-memory store.
 * Logs the exact filename (with timestamp) that was generated at build time.
 */
async function loadCacheFromDisk() {
  if (cacheLoadedFromDisk) return;
  cacheLoadedFromDisk = true;

  const cachePath = CONFIG.VALIDATION_CACHE_PATH;
  if (!cachePath) {
    console.log('ℹ️  [Validation] VALIDATION_CACHE_PATH is null — no cache loaded.');
    return;
  }

  try {
    const response = await fetch(cachePath);
    if (!response.ok) {
      console.warn(`⚠️  [Validation] Cache file not found at ${cachePath} — no validation shown.`);
      return;
    }

    const data = await response.json();

    if (data.files) {
      Object.entries(data.files).forEach(([fp, result]) => { validationCache.files[fp]   = result; });
    }
    if (data.folders) {
      Object.entries(data.folders).forEach(([fp, result]) => { validationCache.folders[fp] = result; });
    }

    // Store and log the exact timestamped filename so you know what's in use
    activeCacheFilename = data.filename || 'validation-cache.json (no filename stored)';

    console.log('━'.repeat(56));
    console.log(`✅  [Validation] Cache loaded successfully`);
    console.log(`    File      : ${activeCacheFilename}`);
    console.log(`    Generated : ${data.generated}`);
    console.log(`    Files     : ${Object.keys(validationCache.files).length}`);
    console.log(`    Folders   : ${Object.keys(validationCache.folders).length}`);
    console.log('━'.repeat(56));

  } catch (e) {
    console.warn('⚠️  [Validation] Could not load validation-cache.json:', e.message);
  }
}

function getCachedFile(filePath)    { return validationCache.files[filePath]     || null; }
function getCachedFolder(folderPath){ return validationCache.folders[folderPath] || null; }

// ===================================
// DISPLAY HELPERS
// ===================================

function shouldShowViolation(violationType) {
  if (!violationType) return false;
  const { SHOW_LINE_COUNT_ERRORS, SHOW_ANSWER_COUNT_ERRORS } = CONFIG.VALIDATION_DISPLAY;
  if (violationType === 'line_count')   return SHOW_LINE_COUNT_ERRORS;
  if (violationType === 'answer_count') return SHOW_ANSWER_COUNT_ERRORS;
  return false;
}

// ===================================
// QUIZ LIST
// ===================================

export function listQuizzes(folder = '') {
  if (folder && folder.target) folder = '';

  const requestId = ++currentRequestId;

  currentFolderPath = folder;
  setCurrentFolder(folder);
  selectedQuizzes.clear();
  showLoading();
  disableAllControlsDuringLoad();
  clearLevelCounts();
  updateQuizTitle('Aviation Quiz');
  clearQuizContainer();
  closeAllOpenMenus();
  hideTopControls();
  hideQuizControls();
  showQuizSelection();

  const quizGrid = document.getElementById('quiz-grid');
  if (!quizGrid) {
    console.error('Quiz grid container not found');
    enableAllControlsAfterLoad();
    hideLoading();
    return;
  }

  quizGrid.innerHTML = '';

  if (folder) {
    const backButton = createBackButton(folder);
    quizGrid.appendChild(backButton);
    addFadeInAnimation(backButton);
  }

  loadCacheFromDisk().then(() => {
    fetchQuizList(folder)
      .then(data => { if (requestId === currentRequestId) renderQuizList(data, quizGrid, folder); })
      .catch(error => { if (requestId === currentRequestId) handleQuizListError(error, quizGrid); });
  });
}

function closeAllOpenMenus() {
  const controlPanel = document.getElementById('control-panel');
  const panelOverlay = document.getElementById('panel-overlay');
  if (controlPanel) { controlPanel.classList.remove('open'); controlPanel.setAttribute('aria-hidden', 'true'); }
  if (panelOverlay) panelOverlay.classList.remove('visible');

  const leftSidebar = document.getElementById('left-sidebar');
  if (leftSidebar) { leftSidebar.style.display = 'none'; leftSidebar.classList.remove('mobile-visible'); }

  ['floating-score-display', 'floating-live-score'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('show'); setTimeout(() => { if (el.parentNode) el.remove(); }, 300); }
  });

  const imageModal = document.getElementById('image-modal');
  if (imageModal) imageModal.classList.remove('show');

  document.body.style.overflow = 'auto';
}

function createBackButton(folder) {
  const backButton = document.createElement('div');
  backButton.className = 'quiz-box back-button';
  backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Categories';
  backButton.onclick = () => {
    const parentFolder = folder.split('/').slice(0, -1).join('/');
    window.location.hash = parentFolder
      ? `#/folder/${parentFolder.split('/').map(encodeURIComponent).join('/')}`
      : '#/';
  };
  return backButton;
}

async function renderQuizList(data, quizGrid, folder) {
  if (data.folders.length === 0 && data.files.length === 0) {
    quizGrid.innerHTML = '<div class="no-content">No quizzes or folders found.</div>';
    enableAllControlsAfterLoad();
    hideLoading();
    return;
  }

  data.folders.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  data.files.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  const hasFiles = data.files.length > 0;

  data.folders.forEach(folderName => {
    const fullPath  = folder ? `${folder}/${folderName}` : folderName;
    const cached    = getCachedFolder(fullPath);
    quizGrid.appendChild(createFolderBox(folderName, folder, cached));
    addFadeInAnimation(quizGrid.lastChild);
  });

  data.files.forEach(file => {
    const filePath   = folder ? `${folder}/${file}` : file;
    const cached     = getCachedFile(filePath);
    const validation = cached || { valid: true, violationType: null };
    quizGrid.appendChild(createQuizBox(file, folder, validation, hasFiles));
    addFadeInAnimation(quizGrid.lastChild);
  });

  if (hasFiles) createMultiQuizButton(quizGrid, folder);

  enableAllControlsAfterLoad();
  hideLoading();
}

function handleQuizListError(error, quizGrid) {
  enableAllControlsAfterLoad();
  hideLoading();
  console.error('Error fetching quiz list:', error);
  showNotification('Error loading quizzes. Please try again.', 'error');
  quizGrid.innerHTML = '<div class="error-message">Error loading quizzes. Please refresh the page.</div>';
}

function createFolderBox(folderName, currentFolder, cachedFolderResult = null) {
  const folderBox = document.createElement('div');

  let flagClass   = '';
  let warningIcon = '';

  if (cachedFolderResult && cachedFolderResult.hasInvalid
      && shouldShowViolation(cachedFolderResult.violationType)) {
    flagClass   = cachedFolderResult.violationType === 'answer_count'
      ? ' quiz-flagged-violet' : ' quiz-flagged';
    warningIcon = '<i class="fas fa-exclamation-triangle excess-warning"></i>';
  }

  folderBox.className = 'quiz-box folder-select' + flagClass;
  folderBox.innerHTML = `
    <i class="fas fa-folder"></i>
    <h3>${folderName}</h3>
    <p>Browse quiz categories</p>
    ${warningIcon}
  `;
  folderBox.onclick = () => {
    const fullPath = currentFolder ? `${currentFolder}/${folderName}` : folderName;
    window.location.hash = `#/folder/${fullPath.split('/').map(encodeURIComponent).join('/')}`;
  };
  return folderBox;
}

function createQuizBox(file, folder, validation, showCheckbox = false) {
  const quizBox  = document.createElement('div');
  const filePath = folder ? `${folder}/${file}` : file;

  quizBox.style.position = 'relative';

  const showFlag = !validation.valid && shouldShowViolation(validation.violationType);
  quizBox.className = 'quiz-box'
    + (showFlag
        ? (validation.violationType === 'answer_count' ? ' quiz-flagged-violet' : ' quiz-flagged')
        : '');

  let warningIcon = '';
  if (showFlag) {
    quizBox.title = validation.reason;
    warningIcon   = `<i class="fas fa-exclamation-triangle excess-warning" title="${validation.reason}"></i>`;
  }

  let checkboxHTML = '';
  if (showCheckbox) {
    checkboxHTML = `
      <input type="checkbox" class="quiz-checkbox" data-file-path="${filePath}"
             style="position:absolute;top:1rem;right:1rem;width:24px;height:24px;
                    cursor:pointer;z-index:10;accent-color:#10b981;transform:scale(1.3);
                    filter:drop-shadow(0 2px 4px rgba(0,0,0,.2));"
             onclick="event.stopPropagation();">
    `;
  }

  quizBox.innerHTML = `
    ${checkboxHTML}
    <i class="fas fa-file-text"></i>
    <h3>${file.replace('.txt', '').replace(' (-)', '')}</h3>
    <p>Click to start quiz</p>
    ${warningIcon}
  `;

  if (showCheckbox) {
    const checkbox = quizBox.querySelector('.quiz-checkbox');
    checkbox.addEventListener('change', e => {
      e.stopPropagation();
      if (checkbox.checked) { selectedQuizzes.add(filePath);    quizBox.classList.add('quiz-selected'); }
      else                  { selectedQuizzes.delete(filePath); quizBox.classList.remove('quiz-selected'); }
      updateMultiQuizButton();
    });
    quizBox.onclick = e => {
      if (e.target.classList.contains('quiz-checkbox')) return;
      if (selectedQuizzes.size > 0) {
        e.preventDefault(); e.stopPropagation();
        showNotification('Use checkboxes to select quizzes, then click "Start Combined Quiz"', 'info');
        return;
      }
      const fullPath = folder ? `${folder}/${file}` : file;
      window.location.hash = `#/quiz/${fullPath.split('/').map(encodeURIComponent).join('/')}`;
    };
  } else {
    quizBox.onclick = () => {
      const fullPath = folder ? `${folder}/${file}` : file;
      window.location.hash = `#/quiz/${fullPath.split('/').map(encodeURIComponent).join('/')}`;
    };
  }

  return quizBox;
}

function createMultiQuizButton(quizGrid, folder) {
  const container = document.createElement('div');
  container.id = 'multi-quiz-button-container';
  container.style.cssText = 'grid-column:1/-1;display:flex;justify-content:center;margin-top:1rem;';

  const btn = document.createElement('button');
  btn.id = 'start-multi-quiz-btn';
  btn.className = 'primary-btn';
  btn.innerHTML = '<i class="fas fa-play"></i> Start Combined Quiz (0 selected)';
  btn.disabled = true;
  btn.style.cssText = 'padding:1rem 2rem;font-size:1rem;opacity:0.5;cursor:not-allowed;transition:all 0.3s ease;';
  btn.onclick = () => { if (selectedQuizzes.size > 0) startMultiQuiz(Array.from(selectedQuizzes), folder); };

  container.appendChild(btn);
  quizGrid.appendChild(container);
}

function updateMultiQuizButton() {
  const btn = document.getElementById('start-multi-quiz-btn');
  if (!btn) return;
  const count = selectedQuizzes.size;
  btn.innerHTML     = `<i class="fas fa-play"></i> Start Combined Quiz (${count} selected)`;
  btn.disabled      = count === 0;
  btn.style.opacity = count > 0 ? '1' : '0.5';
  btn.style.cursor  = count > 0 ? 'pointer' : 'not-allowed';
}

async function startMultiQuiz(filePaths, folder) {
  showLoading('Loading Combined Quiz', 'Combining questions from multiple quizzes...');
  disableAllControlsDuringLoad();

  try {
    let questionsWithBanks = [];
    for (const filePath of filePaths) {
      const text      = await fetchQuizContent(filePath);
      const questions = parseQuestions(text.split('\n'));
      const bankName  = filePath.split('/').pop().replace('.txt', '').substring(0, 15);
      questions.forEach(q => questionsWithBanks.push({ text: q, bank: bankName }));
    }

    if (questionsWithBanks.length === 0) {
      showNotification('No questions found in selected quizzes', 'error');
      enableAllControlsAfterLoad(); hideLoading(); return;
    }

    recountLevelsForQuestions(questionsWithBanks);
    setSelectedFileName(`Combined (${filePaths.length} quizzes)`);
    setCurrentFolder(folder || '');
    updateQuizState({ bankInfo: questionsWithBanks.map(q => q.bank) });
    updateQuizTitle(`Combined Quiz (${filePaths.length} banks)`);

    hideQuizSelection();
    showTopControls();
    updateQuizInfo(questionsWithBanks.length);
    createTopLevelCheckboxes();
    setupTopQuestionCountInput(questionsWithBanks);
    displayQuestions(questionsWithBanks);

    showNotification(`Combined ${questionsWithBanks.length} questions from ${filePaths.length} quizzes!`, 'success');
  } catch (error) {
    console.error('Error loading combined quiz:', error);
    showNotification('Error loading combined quiz. Please try again.', 'error');
    enableAllControlsAfterLoad(); hideLoading();
  }
}

function updateQuizInfo(questionCount) {
  const el = document.getElementById('max-questions-info');
  if (el) el.innerHTML = `<strong>Total questions: ${questionCount}</strong>`;
}

function initializeQuiz(fileName, folder) {
  showLoading();
  disableAllControlsDuringLoad();
  setCurrentFolder(folder || '');
  hideQuizSelection();
  showQuizSettings();
  loadQuiz(fileName);
}

export function goBackToFolder() {
  const folder = getCurrentFolder();
  showConfirmDialog(
    'Return to Folder?',
    'Are you sure you want to go back to the quiz selection? Your current progress will be lost.',
    () => {
      window.location.hash = folder
        ? `#/folder/${folder.split('/').map(encodeURIComponent).join('/')}`
        : '#/';
    }
  );
}

export function goHomeWithConfirmation() {
  const quizContainer = document.getElementById('quiz-container');
  const hasActiveQuiz = quizContainer && quizContainer.innerHTML.trim() !== '';
  if (hasActiveQuiz) {
    showConfirmDialog('Return to Home?',
      'Are you sure you want to return to the main menu? Your current progress will be lost.',
      () => { window.location.hash = '#/'; });
  } else {
    window.location.hash = '#/';
  }
}

function showConfirmDialog(title, message, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.5);backdrop-filter:blur(5px);
    z-index:10000;display:flex;align-items:center;justify-content:center;
    animation:fadeIn 0.2s ease;
  `;
  const modal = document.createElement('div');
  modal.style.cssText = `
    background:white;border-radius:12px;padding:2rem;max-width:400px;width:90%;
    box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:slideUp 0.3s ease;
  `;
  modal.innerHTML = `
    <div style="margin-bottom:1.5rem;">
      <h3 style="margin:0 0 0.5rem 0;color:var(--text-primary);font-size:1.25rem;display:flex;align-items:center;gap:0.5rem;">
        <i class="fas fa-exclamation-triangle" style="color:var(--warning-color);"></i>${title}
      </h3>
      <p style="margin:0;color:var(--text-secondary);font-size:0.95rem;line-height:1.5;">${message}</p>
    </div>
    <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
      <button class="cancel-btn"  style="padding:0.75rem 1.5rem;border:1px solid var(--border-color);background:white;color:var(--text-primary);border-radius:8px;font-weight:500;cursor:pointer;">Cancel</button>
      <button class="confirm-btn" style="padding:0.75rem 1.5rem;border:none;background:var(--primary-color);color:white;border-radius:8px;font-weight:600;cursor:pointer;">Go Back</button>
    </div>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const cancelBtn  = modal.querySelector('.cancel-btn');
  const confirmBtn = modal.querySelector('.confirm-btn');
  cancelBtn.onclick  = () => { overlay.style.animation = 'fadeOut 0.2s ease'; setTimeout(() => overlay.remove(), 200); };
  confirmBtn.onclick = () => { overlay.style.animation = 'fadeOut 0.2s ease'; setTimeout(() => { overlay.remove(); onConfirm(); }, 200); };
  overlay.onclick    = e  => { if (e.target === overlay) cancelBtn.click(); };
  const esc = e => { if (e.key === 'Escape') { cancelBtn.click(); document.removeEventListener('keydown', esc); } };
  document.addEventListener('keydown', esc);
}

// ===================================
// UI HELPERS
// ===================================
function updateQuizTitle(title) {
  const el = document.getElementById('quiz-title');
  if (el) el.textContent = title;
}

function clearQuizContainer() {
  const container = document.getElementById('quiz-container');
  if (container) { container.innerHTML = ''; container.className = ''; }
}

function hideTopControls() {
  const leftSidebar = document.getElementById('left-sidebar');
  const mainContent = document.querySelector('.main-content');
  const controlFab  = document.getElementById('control-fab');
  const sidebarFab  = document.getElementById('sidebar-fab');
  if (controlFab)  { controlFab.classList.remove('active'); controlFab.style.display = 'none'; }
  if (sidebarFab)  { sidebarFab.classList.remove('active'); sidebarFab.style.display = 'none'; }
  if (leftSidebar) { leftSidebar.style.display = 'none'; leftSidebar.classList.remove('mobile-visible'); }
  if (mainContent) mainContent.classList.remove('with-sidebar');
}

function hideQuizControls() {
  const controlPanel = document.getElementById('control-panel');
  const panelOverlay = document.getElementById('panel-overlay');
  const controlFab   = document.getElementById('control-fab');
  const sidebarFab   = document.getElementById('sidebar-fab');
  if (controlPanel) { controlPanel.classList.remove('open'); controlPanel.setAttribute('aria-hidden', 'true'); }
  if (panelOverlay) panelOverlay.classList.remove('visible');
  if (controlFab)   { controlFab.classList.remove('active'); controlFab.style.display = 'none'; }
  if (sidebarFab)   { sidebarFab.classList.remove('active'); sidebarFab.style.display = 'none'; }
  document.body.style.overflow = 'auto';
}

function showQuizSelection() {
  const selection = document.getElementById('quiz-list-container');
  if (selection) { selection.style.display = 'block'; addFadeInAnimation(selection); }
}

function hideQuizSelection() {
  const selection = document.getElementById('quiz-list-container');
  if (selection) selection.style.display = 'none';
}

function showQuizSettings() {
  const settings = document.getElementById('quiz-settings');
  if (settings) { settings.style.display = 'block'; addFadeInAnimation(settings); }
}

if (typeof window !== 'undefined') {
  window.listQuizzes            = listQuizzes;
  window.goBackToFolder         = goBackToFolder;
  window.goHomeWithConfirmation = goHomeWithConfirmation;
}

export { updateQuizTitle, clearQuizContainer, initializeQuiz };