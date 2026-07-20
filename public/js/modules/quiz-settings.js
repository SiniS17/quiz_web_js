// modules/quiz-settings.js - Quiz Settings with Fixed Level Counting
import {
  getLevelCounts,
  getGlobalSelectedCount,
  setGlobalSelectedCount,
  setPendingQuestionCount,
  getPendingQuestionCount,
  getQuizState
} from './state.js';
import { sortLevelsForDisplay, getSelectedLevels, getQuestionLevels } from './parser.js';
import { showNotification } from './ui/notifications.js';
import { showLoadingScreen, hideLoadingScreen } from './ui/loading.js';
import { updateQuizWithNewLevels, changeQuestionCount, parseQuestionRange } from './quiz-manager.js';

/**
 * Create level selection checkboxes with Select All/Deselect All buttons
 */
export function createTopLevelCheckboxes() {
  const checkboxContainer = document.getElementById('level-checkboxes');
  if (!checkboxContainer) return;

  checkboxContainer.innerHTML = '';
  const levelCounts = getLevelCounts();

  const sortedLevels = sortLevelsForDisplay(levelCounts);

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'level-button-container';
  buttonContainer.style.cssText = `
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-color);
  `;

  const selectAllBtn = document.createElement('button');
  selectAllBtn.className = 'level-action-btn';
  selectAllBtn.innerHTML = '<i class="fas fa-check-double"></i> Select All';
  selectAllBtn.style.cssText = `
    flex: 1;
    padding: 0.5rem 0.75rem;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: var(--border-radius);
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
  `;

  const deselectAllBtn = document.createElement('button');
  deselectAllBtn.className = 'level-action-btn';
  deselectAllBtn.innerHTML = '<i class="fas fa-times"></i> Deselect All';
  deselectAllBtn.style.cssText = `
    flex: 1;
    padding: 0.5rem 0.75rem;
    background: var(--bg-primary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
  `;

  selectAllBtn.onclick = () => {
    const allCheckboxes = checkboxContainer.querySelectorAll('input[type="checkbox"]');
    let anyChanged = false;
    allCheckboxes.forEach(checkbox => {
      if (!checkbox.checked) { checkbox.checked = true; anyChanged = true; }
    });
    if (anyChanged) {
      const quizState = getQuizState();
      if (quizState.allQuestions && quizState.allQuestions.length > 0) {
        updateQuizWithNewLevels();
        updateMaxQuestionsDisplay();
      }
    }
  };

  deselectAllBtn.onclick = () => {
    const allCheckboxes = checkboxContainer.querySelectorAll('input[type="checkbox"]');
    let anyChanged = false;
    allCheckboxes.forEach(checkbox => {
      if (checkbox.checked) { checkbox.checked = false; anyChanged = true; }
    });
    if (anyChanged) {
      const quizState = getQuizState();
      if (quizState.allQuestions && quizState.allQuestions.length > 0) {
        updateQuizWithNewLevels();
        updateMaxQuestionsDisplay();
      }
    }
  };

  selectAllBtn.onmouseenter = () => { selectAllBtn.style.background = 'var(--primary-dark)'; selectAllBtn.style.transform = 'translateY(-1px)'; };
  selectAllBtn.onmouseleave = () => { selectAllBtn.style.background = 'var(--primary-color)'; selectAllBtn.style.transform = 'translateY(0)'; };
  deselectAllBtn.onmouseenter = () => { deselectAllBtn.style.background = 'var(--bg-secondary)'; deselectAllBtn.style.borderColor = 'var(--primary-color)'; deselectAllBtn.style.color = 'var(--primary-color)'; deselectAllBtn.style.transform = 'translateY(-1px)'; };
  deselectAllBtn.onmouseleave = () => { deselectAllBtn.style.background = 'var(--bg-primary)'; deselectAllBtn.style.borderColor = 'var(--border-color)'; deselectAllBtn.style.color = 'var(--text-primary)'; deselectAllBtn.style.transform = 'translateY(0)'; };

  buttonContainer.appendChild(selectAllBtn);
  buttonContainer.appendChild(deselectAllBtn);
  checkboxContainer.appendChild(buttonContainer);

  const checkboxGrid = document.createElement('div');
  checkboxGrid.style.cssText = `display: flex; gap: 1rem; flex-wrap: wrap;`;

  sortedLevels.forEach(([level, count]) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'checkbox-wrapper';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `level-${CSS.escape(level)}`;
    checkbox.dataset.level = level;
    checkbox.checked = true;

    const label = document.createElement('label');
    label.htmlFor = `level-${CSS.escape(level)}`;
    const isNumber = !isNaN(parseInt(level)) && String(parseInt(level)) === level;
    const labelText = isNumber ? `L${level}` : level;
    label.textContent = `${labelText} (${count})`;

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);
    checkboxGrid.appendChild(wrapper);

    checkbox.addEventListener('change', () => {
      const quizState = getQuizState();
      if (quizState.allQuestions && quizState.allQuestions.length > 0) {
        updateQuizWithNewLevels();
        updateMaxQuestionsDisplay();
      }
    });
  });

  checkboxContainer.appendChild(checkboxGrid);
}

/**
 * Calculate actual max questions based on selected levels
 */
function calculateActualMaxQuestions(allQuestions, selectedLevels) {
  if (selectedLevels.length === 0) return 0;
  let count = 0;
  allQuestions.forEach(question => {
    const questionLevels = getQuestionLevels(question);
    if (questionLevels.some(level => selectedLevels.includes(level))) count++;
  });
  return count;
}

/**
 * Update max questions display based on selected levels
 */
function updateMaxQuestionsDisplay() {
  const quizState = getQuizState();
  if (!quizState.allQuestions) return;

  const selectedLevels = getSelectedLevels();
  const levelCounts = getLevelCounts();
  const maxQuestions = calculateActualMaxQuestions(quizState.allQuestions, selectedLevels);

  const questionCountInput = document.getElementById('question-count');
  if (questionCountInput) {
    const isShuffleMode = quizState.isShuffleMode !== false;
    if (isShuffleMode) {
      questionCountInput.max = maxQuestions;
      const currentValue = parseInt(questionCountInput.value);
      if (!isNaN(currentValue) && currentValue > maxQuestions) {
        questionCountInput.value = maxQuestions;
        setGlobalSelectedCount(maxQuestions);
        setPendingQuestionCount(maxQuestions);
      }
    }
    // In non-shuffle range mode, don't clamp
  }

  const maxQuestionsInfo = document.getElementById('max-questions-info');
  if (maxQuestionsInfo) {
    const sortedLevels = sortLevelsForDisplay(levelCounts)
      .filter(([level]) => selectedLevels.includes(level));

    let levelInfo = sortedLevels
      .map(([level, count]) => {
        const isNumber = !isNaN(parseInt(level)) && String(parseInt(level)) === level;
        const displayName = isNumber ? `Level ${level}` : level;
        return `${displayName}: ${count}`;
      })
      .join(', ');

    maxQuestionsInfo.innerHTML = `
      <strong>Total questions: ${maxQuestions}</strong><br>
      <small>${levelInfo || 'No levels selected'}</small>
      <br>
      <small style="color: var(--text-muted); font-size: 0.75rem;">* Questions with multiple levels counted once</small>
    `;
  }
}

/**
 * Setup question count input - supports both number (shuffle) and range (non-shuffle)
 */
export function setupTopQuestionCountInput(questions) {
  const questionCountInput = document.getElementById('question-count');
  if (!questionCountInput) return;

  const maxQuestions = questions.length;
  const selectedCount = Math.min(20, maxQuestions);

  setGlobalSelectedCount(selectedCount);
  setPendingQuestionCount(selectedCount);

  questionCountInput.value = selectedCount;
  questionCountInput.max = maxQuestions;

  // Set range inputs defaults: From=1, To=total question count
  const toInput = document.getElementById('range-to');
  if (toInput) { toInput.value = maxQuestions; toInput.max = maxQuestions; }
  const fromInput = document.getElementById('range-from');
  if (fromInput) { fromInput.max = maxQuestions; }

  // Remove old event listeners
  questionCountInput.removeEventListener('input', questionCountInput._inputHandler);
  questionCountInput.removeEventListener('keypress', questionCountInput._keypressHandler);

  questionCountInput._inputHandler = (e) => handleQuestionCountInput(e, maxQuestions);
  questionCountInput._keypressHandler = (e) => handleQuestionCountKeypress(e, maxQuestions);

  questionCountInput.addEventListener('input', questionCountInput._inputHandler);
  questionCountInput.addEventListener('keypress', questionCountInput._keypressHandler);

  // "All" button — set input to max and apply immediately
  const allBtn = document.getElementById('all-count-btn');
  if (allBtn) {
    allBtn.onclick = () => {
      const quizState = getQuizState();
      const selectedLevels = getSelectedLevels();
      const actualMax = quizState.allQuestions
        ? calculateActualMaxQuestions(quizState.allQuestions, selectedLevels)
        : maxQuestions;
      const effectiveMax = getRangeSizeLimit(actualMax);
      questionCountInput.value = effectiveMax;
      questionCountInput.style.borderColor = '';
      questionCountInput.title = '';
      applyQuestionCountChange(effectiveMax, effectiveMax);
    };
  }

  // Apply button
  const applyBtn = document.getElementById('apply-count-btn');
  if (applyBtn) {
    applyBtn.onclick = () => {
      const quizState = getQuizState();
      const selectedLevels = getSelectedLevels();
      const actualMax = quizState.allQuestions
        ? calculateActualMaxQuestions(quizState.allQuestions, selectedLevels)
        : maxQuestions;
      const effectiveMax = getRangeSizeLimit(actualMax);
      let value = parseInt(questionCountInput.value);
      if (value > 0) {
        if (value > effectiveMax) { value = effectiveMax; questionCountInput.value = value; }
        applyQuestionCountChange(value, effectiveMax);
        questionCountInput.style.borderColor = '';
        questionCountInput.title = '';
      }
    };
  }
}

/**
 * Return the number of questions available in the active range.
 * If range is not active, returns actualMax unchanged.
 */
function getRangeSizeLimit(actualMax) {
  const shuffleCheckbox = document.getElementById('shuffle-checkbox');
  const rangeCheckbox   = document.getElementById('range-select-checkbox');
  const shuffleOff  = shuffleCheckbox ? !shuffleCheckbox.checked : false;
  const rangeActive = (rangeCheckbox && rangeCheckbox.checked) || shuffleOff;
  if (!rangeActive) return actualMax;

  const fromInput = document.getElementById('range-from');
  const toInput   = document.getElementById('range-to');
  const from = Math.max(1, parseInt(fromInput?.value) || 1);
  const to   = Math.min(parseInt(toInput?.value) || actualMax, actualMax);
  return Math.max(1, to - from + 1);
}

/**
 * Handle question count input changes (always numeric)
 */
function handleQuestionCountInput(e, maxQuestions) {
  const quizState = getQuizState();
  const selectedLevels = getSelectedLevels();
  const actualMax = quizState.allQuestions
    ? calculateActualMaxQuestions(quizState.allQuestions, selectedLevels)
    : maxQuestions;
  const effectiveMax = getRangeSizeLimit(actualMax);

  let value = parseInt(e.target.value);
  if (value > 0) {
    if (value > effectiveMax) { value = effectiveMax; e.target.value = value; }
    setPendingQuestionCount(value);
    e.target.style.borderColor = '#f59e0b';
    e.target.title = 'Press Enter to apply the new question count';
  }
}

/**
 * Handle question count keypress (Enter to apply)
 */
function handleQuestionCountKeypress(e, maxQuestions) {
  if (e.key === 'Enter') {
    e.preventDefault();

    const quizState = getQuizState();
    const selectedLevels = getSelectedLevels();
    const actualMax = quizState.allQuestions
      ? calculateActualMaxQuestions(quizState.allQuestions, selectedLevels)
      : maxQuestions;
    const effectiveMax = getRangeSizeLimit(actualMax);

    let value = parseInt(e.target.value);
    if (value > 0) {
      if (value > effectiveMax) { value = effectiveMax; e.target.value = value; }
      applyQuestionCountChange(value, effectiveMax);
      e.target.style.borderColor = '';
      e.target.title = '';
    }
  }
}

/**
 * Apply question count change (shuffle mode) — resets quiz if already submitted
 */
function applyQuestionCountChange(newCount, maxQuestions) {
  const quizState = getQuizState();
  if (!quizState.allQuestions || quizState.allQuestions.length === 0) return;

  showLoadingScreen('Updating Question Count', `Loading ${newCount} questions...`);
  setTimeout(() => {
    setGlobalSelectedCount(newCount);
    setPendingQuestionCount(newCount);
    changeQuestionCount(newCount);
    hideLoadingScreen();
  }, 300);
}

/**
 * Apply range change (non-shuffle mode) — resets quiz if already submitted
 */
function applyRangeChange(rawValue, maxQuestions) {
  const quizState = getQuizState();
  if (!quizState.allQuestions || quizState.allQuestions.length === 0) return;

  const range = parseQuestionRange(rawValue, maxQuestions);
  if (!range) return;

  const count = range.end - range.start + 1;
  showLoadingScreen('Updating Range', `Loading questions ${range.start}–${range.end}...`);
  setTimeout(() => {
    setGlobalSelectedCount(count);
    setPendingQuestionCount(count);
    // changeQuestionCount will use the range input value directly
    changeQuestionCount(count);
    hideLoadingScreen();
  }, 300);
}