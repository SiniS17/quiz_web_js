// modules/quiz-manager.js - Main Quiz Management Logic

import {
  getQuizState,
  saveQuizState,
  resetQuizSubmission,
  setAnsweredQuestions,
  updateQuizState,
  getGlobalSelectedCount,
  setGlobalSelectedCount
} from './state.js';

import {
  parseQuestionWithImages,
  filterQuestionsByLevel,
  getSelectedLevels
} from './parser.js';

import { shuffle, addFadeInAnimation } from './utils.js';
import { showNotification } from './ui/notifications.js';
import {
  showLoading,
  hideLoading,
  showLoadingScreen,
  hideLoadingScreen,
  disableAllControlsDuringLoad,
  enableAllControlsAfterLoad
} from './ui/loading.js';

import { setupResultsContainer } from './ui/progress.js';
import { createQuestionElement } from './ui/quiz-display.js';
import {
  setupLiveTestInTopControls,
  applyLiveTestUIState,
  getLiveTestCheckbox,
  updateLiveScore,
  highlightLiveAnswers
} from './live-test.js';

import { setupImageModal } from './ui/modal.js';
import { enableQuizControls } from './quiz-controls.js';

/**
 * Normalize questions into objects
 */
function normalizeQuestions(allQuestions) {
  return allQuestions.map(q =>
    typeof q === 'string' ? { text: q } : q
  );
}

/**
 * Parse range string for non-shuffle mode.
 * "20"     → { start: 1, end: 20 }
 * "6-"     → { start: 6, end: Infinity }
 * "6-200"  → { start: 6, end: 200 }
 * Returns null if invalid / shuffle mode should handle it.
 */
export function parseQuestionRange(value, totalQuestions) {
  if (typeof value !== 'string') value = String(value);
  value = value.trim();

  // Pattern: "N-M"
  const rangeMatch = value.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]);
    const end = parseInt(rangeMatch[2]);
    if (start >= 1 && end >= start) {
      return { start, end: Math.min(end, totalQuestions) };
    }
    return null;
  }

  // Pattern: "N-" (from N to end)
  const openEndMatch = value.match(/^(\d+)-$/);
  if (openEndMatch) {
    const start = parseInt(openEndMatch[1]);
    if (start >= 1) {
      return { start, end: totalQuestions };
    }
    return null;
  }

  // Pattern: plain number "N" → 1 to N
  const plainMatch = value.match(/^(\d+)$/);
  if (plainMatch) {
    const end = parseInt(plainMatch[1]);
    if (end >= 1) {
      return { start: 1, end: Math.min(end, totalQuestions) };
    }
    return null;
  }

  return null;
}

/**
 * Select questions based on shuffle mode and range input
 */
function selectQuestions(filtered, quizState) {
  const isShuffleMode = quizState.isShuffleMode !== false; // default true

  if (isShuffleMode) {
    const shuffled = shuffle(filtered);
    const count = getGlobalSelectedCount();
    return shuffled.slice(0, count);
  } else {
    // Non-shuffle: use range from question count input
    const rangeInput = document.getElementById('question-count');
    const rawValue = rangeInput ? rangeInput.value : String(getGlobalSelectedCount());
    const range = parseQuestionRange(rawValue, filtered.length);

    if (range) {
      // slice is 0-indexed, range.start/end are 1-indexed
      return filtered.slice(range.start - 1, range.end);
    } else {
      // fallback: use count
      return filtered.slice(0, getGlobalSelectedCount());
    }
  }
}

/**
 * Display questions in the quiz container
 */
export function displayQuestions(allQuestions) {
  const quizContainer = document.getElementById('quiz-container');
  if (!quizContainer) return;

  quizContainer.innerHTML = '';
  quizContainer.className = 'quiz-interface';

  const selectedLevels = getSelectedLevels();
  const normalized = normalizeQuestions(allQuestions);
  saveQuizState(normalized, selectedLevels);

  const filtered = normalized.filter(q =>
    filterQuestionsByLevel([q.text], selectedLevels).length > 0
  );

  if (filtered.length === 0) {
    quizContainer.innerHTML =
      '<div class="no-questions">No questions available for selected criteria.</div>';
    enableAllControlsAfterLoad();
    hideLoading();
    showNotification('No questions available for selected criteria', 'error');
    return;
  }

  const quizState = getQuizState();
  const isShuffleMode = quizState.isShuffleMode !== false;

  let ordered;
  if (isShuffleMode) {
    ordered = shuffle(filtered);
  } else {
    ordered = filtered; // preserve original order
  }

  updateQuizState({
    originalQuestionOrder: ordered,
    bankInfo: ordered.map(q => q.bank || null)
  });

  const selectedQuestions = selectQuestions(filtered, quizState);

  updateQuizState({
    bankInfo: selectedQuestions.map(q => q.bank || null)
  });

  showLoading();
  disableAllControlsDuringLoad();

  selectedQuestions.forEach((q, index) => {
    const element = createQuestionElement(q.text, index, q.bank);
    quizContainer.appendChild(element);
    addFadeInAnimation(element);
  });

  setupResultsContainer(selectedQuestions.length);
  setupLiveTestInTopControls();
  setupImageModal();

  requestAnimationFrame(() => {
    enableAllControlsAfterLoad();
    hideLoading();
  });
}

/**
 * Display questions directly (restart / redo)
 */
export function displayQuestionsDirectly(selectedQuestions, isLiveMode = false) {
  const quizContainer = document.getElementById('quiz-container');
  if (!quizContainer) return;

  quizContainer.innerHTML = '';
  quizContainer.className = 'quiz-interface';

  showLoading();
  disableAllControlsDuringLoad();

  selectedQuestions.forEach((q, index) => {
    const question = typeof q === 'string' ? { text: q } : q;
    const element = createQuestionElement(question.text, index, question.bank);
    quizContainer.appendChild(element);
    addFadeInAnimation(element);
  });

  setupResultsContainer(selectedQuestions.length);
  setupLiveTestInTopControls();
  setupImageModal();

  const liveTestCheckbox = getLiveTestCheckbox();
  if (liveTestCheckbox) {
    liveTestCheckbox.checked = isLiveMode;
    applyLiveTestUIState(isLiveMode);
  }

  requestAnimationFrame(() => {
    enableAllControlsAfterLoad();
    hideLoading();
    hideLoadingScreen();
  });
}

/**
 * Restart quiz
 */
export function restartQuiz() {
  const quizState = getQuizState();
  if (!quizState.fileName) {
    showNotification('No saved quiz state found', 'error');
    return;
  }

  showLoadingScreen(
    quizState.isLiveMode ? 'Restarting Live Test' : 'Restarting Quiz',
    'Please wait while questions are being reloaded...'
  );

  clearQuizContainer();
  setAnsweredQuestions([]);
  resetQuizSubmission();

  setTimeout(() => {
    startQuizWithState(quizState);
    hideLoadingScreen();
  }, 300);
}

/**
 * Redo only the wrong questions from the last submission
 */
export function redoWrongQuestions() {
  const quizState = getQuizState();
  const wrongQuestions = quizState.wrongQuestions || [];

  if (wrongQuestions.length === 0) {
    showNotification('No wrong questions to redo!', 'info');
    return;
  }

  showLoadingScreen('Loading Wrong Questions', 'Preparing questions you got wrong...');
  clearQuizContainer();
  setAnsweredQuestions([]);

  // Reset submission state but keep wrong questions until new submission
  updateQuizState({ hasSubmitted: false });

  setTimeout(() => {
    displayQuestionsDirectly(wrongQuestions, quizState.isLiveMode);
    hideLoadingScreen();
    showNotification(`Retrying ${wrongQuestions.length} wrong question${wrongQuestions.length > 1 ? 's' : ''}`, 'info');
  }, 300);
}

function startQuizWithState(state) {
  const filtered = state.allQuestions.filter(q =>
    filterQuestionsByLevel([q.text], state.selectedLevels).length > 0
  );

  const isShuffleMode = state.isShuffleMode !== false;
  let ordered;
  if (isShuffleMode) {
    ordered = shuffle(filtered);
  } else {
    ordered = filtered;
  }

  updateQuizState({ originalQuestionOrder: ordered });

  let selected;
  if (isShuffleMode) {
    selected = ordered.slice(0, state.questionCount);
  } else {
    const rangeInput = document.getElementById('question-count');
    const rawValue = rangeInput ? rangeInput.value : String(state.questionCount);
    const range = parseQuestionRange(rawValue, filtered.length);
    if (range) {
      selected = filtered.slice(range.start - 1, range.end);
    } else {
      selected = ordered.slice(0, state.questionCount);
    }
  }

  if (selected.length === 0) {
    showNotification('No questions available', 'error');
    return;
  }

  displayQuestionsDirectly(selected, state.isLiveMode);
}

/**
 * Update quiz when levels change
 */
export function updateQuizWithNewLevels() {
  const quizState = getQuizState();
  if (!quizState.allQuestions || quizState.hasSubmitted) return;

  const selectedLevels = getSelectedLevels();
  updateQuizState({ selectedLevels });

  const filtered = quizState.allQuestions.filter(q =>
    filterQuestionsByLevel([q.text], selectedLevels).length > 0
  );

  const isShuffleMode = quizState.isShuffleMode !== false;
  let ordered;
  if (isShuffleMode) {
    ordered = shuffle(filtered);
  } else {
    ordered = filtered;
  }

  const selectedCount = getGlobalSelectedCount();
  let selected;
  if (isShuffleMode) {
    selected = ordered.slice(0, selectedCount);
  } else {
    const rangeInput = document.getElementById('question-count');
    const rawValue = rangeInput ? rangeInput.value : String(selectedCount);
    const range = parseQuestionRange(rawValue, filtered.length);
    selected = range ? filtered.slice(range.start - 1, range.end) : ordered.slice(0, selectedCount);
  }

  updateQuizState({
    originalQuestionOrder: ordered,
    bankInfo: selected.map(q => q.bank || null)
  });

  const quizContainer = document.getElementById('quiz-container');
  quizContainer.innerHTML = '';

  showLoading();
  disableAllControlsDuringLoad();

  selected.forEach((q, index) => {
    const element = createQuestionElement(q.text, index, q.bank);
    quizContainer.appendChild(element);
    addFadeInAnimation(element);
  });

  setupResultsContainer(selected.length);

  requestAnimationFrame(() => {
    enableAllControlsAfterLoad();
    hideLoading();
    showNotification('Quiz updated', 'success');
  });
}

/**
 * Change question count (shuffle mode) or range (non-shuffle mode)
 */
export function changeQuestionCount(newCount) {
  const quizState = getQuizState();
  if (!quizState.allQuestions || quizState.hasSubmitted) return;

  updateQuizState({ questionCount: newCount });
  setGlobalSelectedCount(newCount);

  const isShuffleMode = quizState.isShuffleMode !== false;
  let selected;

  if (isShuffleMode) {
    selected = quizState.originalQuestionOrder.slice(0, newCount);
  } else {
    const rangeInput = document.getElementById('question-count');
    const rawValue = rangeInput ? rangeInput.value : String(newCount);
    const allFiltered = quizState.allQuestions.filter(q =>
      filterQuestionsByLevel([q.text], quizState.selectedLevels).length > 0
    );
    const range = parseQuestionRange(rawValue, allFiltered.length);
    selected = range ? allFiltered.slice(range.start - 1, range.end) : quizState.originalQuestionOrder.slice(0, newCount);
  }

  updateQuizState({
    bankInfo: selected.map(q => q.bank || null)
  });

  const quizContainer = document.getElementById('quiz-container');
  quizContainer.innerHTML = '';

  selected.forEach((q, index) => {
    const element = createQuestionElement(q.text, index, q.bank);
    quizContainer.appendChild(element);
    addFadeInAnimation(element);
  });

  setupResultsContainer(selected.length);
}

/**
 * Clear quiz container
 */
function clearQuizContainer() {
  const container = document.getElementById('quiz-container');
  if (container) {
    container.innerHTML = '';
    container.className = '';
  }
}

/**
 * Close score display
 */
export function closeScoreDisplay() {
  const scoreDisplay = document.getElementById('floating-score-display');
  if (scoreDisplay) {
    scoreDisplay.classList.remove('show');
    setTimeout(() => scoreDisplay.remove(), 300);
  }
  resetQuizSubmission();
  enableQuizControls();
}