// modules/live-test.js - Live Test & Shuffle Functionality
import CONFIG from '../config.js';
import { getQuizState, updateQuizState } from './state.js';
import { showNotification } from './ui/notifications.js';
import { showLoadingScreen, hideLoadingScreen } from './ui/loading.js';

let liveTestCheckbox = null;
let liveTestHandler = null;
let shuffleCheckbox = null;
let shuffleHandler = null;

/**
 * Get live test checkbox element
 */
export function getLiveTestCheckbox() {
  return liveTestCheckbox;
}

/**
 * Get shuffle checkbox element
 */
export function getShuffleCheckbox() {
  return shuffleCheckbox;
}

/**
 * Setup live test checkbox and handlers
 */
export function setupLiveTestInTopControls() {
  liveTestCheckbox = document.getElementById('live-test-checkbox');
  if (!liveTestCheckbox) return;

  if (liveTestHandler) {
    liveTestCheckbox.removeEventListener('change', liveTestHandler);
  }

  liveTestHandler = handleLiveTestToggle;
  liveTestCheckbox.addEventListener('change', liveTestHandler);

  const quizState = getQuizState();
  const shouldBeLive = quizState.isLiveMode !== undefined
    ? quizState.isLiveMode
    : CONFIG.DEFAULT_LIVE_TEST_MODE;

  if (shouldBeLive) {
    liveTestCheckbox.checked = true;
    updateQuizState({ isLiveMode: true });
    applyLiveTestUIState(true);
  }

  // Setup shuffle checkbox
  setupShuffleInTopControls();

  console.log('✅ Live test event handler properly attached');
}

/**
 * Setup shuffle checkbox and handlers
 */
export function setupShuffleInTopControls() {
  shuffleCheckbox = document.getElementById('shuffle-checkbox');
  if (!shuffleCheckbox) return;

  if (shuffleHandler) {
    shuffleCheckbox.removeEventListener('change', shuffleHandler);
  }

  shuffleHandler = handleShuffleToggle;
  shuffleCheckbox.addEventListener('change', shuffleHandler);

  const quizState = getQuizState();
  const shouldShuffle = quizState.isShuffleMode !== undefined
    ? quizState.isShuffleMode
    : true;

  shuffleCheckbox.checked = shouldShuffle;
  updateQuizState({ isShuffleMode: shouldShuffle });

  // Update the question count input placeholder based on shuffle mode
  updateQuestionCountPlaceholder(shouldShuffle);

  console.log('✅ Shuffle event handler properly attached');
}

/**
 * Handle shuffle toggle
 */
function handleShuffleToggle() {
  const isShuffleMode = shuffleCheckbox.checked;
  const quizState = getQuizState();
  const previousShuffleMode = quizState.isShuffleMode;

  updateQuizState({ isShuffleMode: isShuffleMode });
  updateQuestionCountPlaceholder(isShuffleMode);

  if (quizState.fileName && previousShuffleMode !== isShuffleMode) {
    try {
      if (isShuffleMode) {
        showNotification('Shuffle enabled - restarting quiz!', 'info');
        showLoadingScreen('Enabling Shuffle', 'Please wait while the quiz is being prepared...');
      } else {
        showNotification('Shuffle disabled - questions will appear in order', 'info');
        showLoadingScreen('Disabling Shuffle', 'Please wait while the quiz is being prepared...');
      }

      setTimeout(() => {
        try {
          import('./quiz-manager.js').then(module => module.restartQuiz());
        } catch (error) {
          console.error('Error during quiz restart:', error);
          hideLoadingScreen();
          showNotification('Failed to restart quiz. Please try again.', 'error');
        }
      }, 500);
    } catch (error) {
      console.error('Error in shuffle toggle:', error);
      hideLoadingScreen();
      showNotification('An error occurred. Please try again.', 'error');
    }
  }
}

/**
 * Update the question count input placeholder based on shuffle mode
 */
function updateQuestionCountPlaceholder(isShuffleMode) {
  const questionCountInput = document.getElementById('question-count');
  if (questionCountInput) {
    questionCountInput.placeholder = '20';
    questionCountInput.title = 'Number of questions to show';
  }

  // Show range inputs when shuffle is OFF, or when range-select checkbox is checked
  const rangeRow      = document.getElementById('range-inputs');
  const rangeCheckbox = document.getElementById('range-select-checkbox');
  if (rangeRow) {
    const rangeChecked = rangeCheckbox ? rangeCheckbox.checked : false;
    rangeRow.style.display = (!isShuffleMode || rangeChecked) ? 'flex' : 'none';
  }
}

/**
 * Handle live test checkbox toggle
 */
function handleLiveTestToggle() {
  const isLiveMode = liveTestCheckbox.checked;
  const quizState = getQuizState();
  const previousLiveMode = quizState.isLiveMode;

  if (quizState.fileName) {
    updateQuizState({ isLiveMode });
  }

  if (quizState.fileName && previousLiveMode !== isLiveMode) {
    try {
      if (isLiveMode) {
        showNotification('Live test mode enabled - restarting quiz with live feedback!', 'info');
        showLoadingScreen('Enabling Live Test', 'Please wait while the quiz is being prepared...');
      } else {
        showNotification('Live test mode disabled - restarting quiz', 'info');
        showLoadingScreen('Restarting Quiz', 'Please wait while questions are being loaded...');
      }

      setTimeout(() => {
        try {
          import('./quiz-manager.js').then(module => module.restartQuiz());
        } catch (error) {
          console.error('Error during quiz restart:', error);
          hideLoadingScreen();
          showNotification('Failed to restart quiz. Please try again.', 'error');
        }
      }, 500);
    } catch (error) {
      console.error('Error in live test toggle:', error);
      hideLoadingScreen();
      showNotification('An error occurred. Please try again.', 'error');
    }
  } else {
    applyLiveTestUIState(isLiveMode);
  }
}

/**
 * Apply live test UI state
 */
export function applyLiveTestUIState(isLiveMode) {
  if (isLiveMode) {
    setupLiveTestListeners();
    updateLiveScore();
  } else {
    removeLiveTestEffects();
    hideLiveScore();
  }
}

/**
 * Setup listeners for live test
 */
function setupLiveTestListeners() {
  if (liveTestCheckbox && liveTestCheckbox.checked) {
    updateLiveScore();
    const questions = document.querySelectorAll('.question');
    questions.forEach(questionDiv => {
      const checkedRadio = questionDiv.querySelector('input[type="radio"]:checked');
      if (checkedRadio) {
        highlightLiveAnswers(questionDiv);
      }
    });
  }
}

/**
 * Highlight correct/incorrect answers in live mode
 */
export function highlightLiveAnswers(questionDiv) {
  const radios = questionDiv.querySelectorAll('input[type="radio"]');
  const correctAnswer = Array.from(radios).find(radio => radio.dataset.correct === "true");
  const userAnswer = Array.from(radios).find(radio => radio.checked);

  radios.forEach(radio => {
    const answerDiv = radio.closest('.answer');
    answerDiv.classList.remove('correct', 'incorrect');

    if (radio === correctAnswer) {
      answerDiv.classList.add('correct');
    } else if (radio === userAnswer && radio !== correctAnswer) {
      answerDiv.classList.add('incorrect');
    }
  });
}

/**
 * Update live score display
 */
export function updateLiveScore() {
  if (!liveTestCheckbox || !liveTestCheckbox.checked) return;

  const questions = document.querySelectorAll('.question');
  let correct = 0;
  let answered = 0;

  questions.forEach(questionDiv => {
    const radios = questionDiv.querySelectorAll('input[type="radio"]');
    const correctAnswer = Array.from(radios).find(radio => radio.dataset.correct === "true");
    const userAnswer = Array.from(radios).find(radio => radio.checked);

    if (userAnswer) {
      answered++;
      if (userAnswer === correctAnswer) {
        correct++;
      }
    }
  });

  showLiveScore(correct, answered);
}

/**
 * Show live score floating indicator
 */
function showLiveScore(correct, answered) {
  let floatingScore = document.getElementById('floating-live-score');

  if (!floatingScore) {
    floatingScore = document.createElement('div');
    floatingScore.id = 'floating-live-score';
    floatingScore.className = 'floating-live-score';
    document.body.appendChild(floatingScore);
  }

  const percentage = answered === 0 ? 0 : (correct / answered * 100).toFixed(1);
  floatingScore.innerHTML = `
    <div class="score-text">
      <i class="fas fa-chart-line score-icon"></i>
      <span>${percentage}% (${correct}/${answered})</span>
    </div>
  `;

  setTimeout(() => {
    floatingScore.classList.add('show');
  }, 100);
}

/**
 * Hide live score display
 */
function hideLiveScore() {
  const floatingScore = document.getElementById('floating-live-score');
  if (floatingScore) {
    floatingScore.classList.remove('show');
    setTimeout(() => {
      floatingScore.remove();
    }, 300);
  }
}

/**
 * Remove live test visual effects
 */
function removeLiveTestEffects() {
  const answers = document.querySelectorAll('.answer');
  answers.forEach(answer => {
    answer.classList.remove('correct', 'incorrect');
  });
}