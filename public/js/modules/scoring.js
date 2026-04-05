// modules/scoring.js - Score Calculation and Display with Invalid Question Handling
import { getGrade, getScoreMessage } from './utils.js';
import { updateQuizState, getQuizState } from './state.js';
import { showNotification } from './ui/notifications.js';
import { hideSubmitButton, showResultsButton } from './ui/progress.js';
import { disableAllAnswers } from './ui/quiz-display.js';
import { disableQuizControls } from './quiz-controls.js';

/**
 * Returns true if this question div is invalid (either red or violet).
 */
function isInvalidQuestion(questionDiv) {
  return (
    questionDiv.classList.contains('question-invalid') ||
    questionDiv.classList.contains('question-invalid-violet')
  );
}

/**
 * Calculate and display quiz score
 */
export function calculateScore() {
  const questions = document.querySelectorAll('.question');
  let score = 0;
  let totalAnswered = 0;
  let totalValid = 0;
  let invalidCount = 0;
  const wrongQuestions = []; // NEW: collect wrong questions

  questions.forEach((questionDiv, index) => {
    if (isInvalidQuestion(questionDiv)) {
      invalidCount++;
      const roundBox = document.querySelector(`#results-container .round-box[data-question-index="${index}"]`);
      if (roundBox) {
        roundBox.classList.remove('unanswered', 'answered', 'correct', 'incorrect');
        roundBox.classList.add('invalid');
      }
      return;
    }

    totalValid++;
    const result = processQuestionForScoring(questionDiv, index, wrongQuestions);
    if (result.answered) {
      totalAnswered++;
      if (result.correct) score++;
    }
  });

  // Save wrong questions to state for redo feature
  updateQuizState({ hasSubmitted: true, wrongQuestions });

  disableQuizControls();
  displayFinalScore(score, totalValid, totalAnswered, invalidCount, wrongQuestions.length);

  // Feature 2: Submit → Results button
  hideSubmitButton();
  showResultsButton();

  disableAllAnswers();

  const validMessage = invalidCount > 0
    ? `Quiz completed! Score: ${score}/${totalValid} (${invalidCount} invalid question${invalidCount > 1 ? 's' : ''} skipped)`
    : `Quiz completed! Score: ${score}/${totalValid}`;

  showNotification(validMessage, 'success');
}

/**
 * Process a single question for scoring
 * Collects wrong questions for redo feature
 */
function processQuestionForScoring(questionDiv, index, wrongQuestions) {
  const radios = questionDiv.querySelectorAll('input[type="radio"]');
  const correctAnswer = Array.from(radios).find(radio => radio.dataset.correct === "true");
  const userAnswer    = Array.from(radios).find(radio => radio.checked);
  const roundBox      = document.querySelector(`#results-container .round-box[data-question-index="${index}"]`);
  const questionHeader = questionDiv.querySelector('h3');

  radios.forEach(radio => {
    radio.closest('.answer').classList.remove('correct', 'incorrect');
  });

  const existingIndicator = questionHeader.querySelector('.result-indicator');
  if (existingIndicator) existingIndicator.remove();

  let result = { answered: false, correct: false };

  if (userAnswer) {
    result.answered = true;
    result.correct  = (userAnswer === correctAnswer);
    if (result.correct) {
      markQuestionCorrect(userAnswer, roundBox, questionHeader);
    } else {
      markQuestionIncorrect(userAnswer, correctAnswer, roundBox, questionHeader);
      // Collect wrong question for redo feature
      collectWrongQuestion(questionDiv, index, wrongQuestions);
    }
  } else {
    markQuestionUnanswered(correctAnswer, roundBox, questionHeader);
    // Unanswered also counts as "wrong" for redo purposes
    collectWrongQuestion(questionDiv, index, wrongQuestions);
  }

  return result;
}

/**
 * Collect a wrong/unanswered question's data for the redo feature
 */
function collectWrongQuestion(questionDiv, index, wrongQuestions) {
  const quizState = getQuizState();
  const bankInfo = quizState.bankInfo && quizState.bankInfo[index];

  // Get the question text from the current displayed questions
  // We reconstruct from the question header + answers
  const h3 = questionDiv.querySelector('h3');
  const questionText = h3 ? h3.textContent.trim() : '';

  // Get all answers, marking the correct one with @@
  const answerDivs = questionDiv.querySelectorAll('.answer');
  const answerLines = [];
  answerDivs.forEach(answerDiv => {
    const radio = answerDiv.querySelector('input[type="radio"]');
    const label = answerDiv.querySelector('label');
    if (radio && label) {
      // Extract just the text (strip the letter label A/B/C/D)
      const labelEl = label.querySelector('.answer-label');
      let text = label.textContent.trim();
      if (labelEl) {
        text = text.replace(labelEl.textContent.trim(), '').trim();
      }
      const prefix = radio.dataset.correct === 'true' ? '@@' : '';
      answerLines.push(prefix + text);
    }
  });

  const fullText = [questionText, ...answerLines].join('\n');

  wrongQuestions.push({
    text: fullText,
    bank: bankInfo || null
  });
}

function markQuestionCorrect(userAnswer, roundBox, questionHeader) {
  roundBox.classList.remove('unanswered', 'answered', 'incorrect');
  roundBox.classList.add('correct');
  userAnswer.closest('.answer').classList.add('correct');

  const checkmark = document.createElement('i');
  checkmark.className = 'fas fa-check-circle result-indicator correct-indicator';
  checkmark.style.cssText = 'color: var(--success-color); margin-left: 10px; font-size: 1.1em;';
  questionHeader.appendChild(checkmark);
}

function markQuestionIncorrect(userAnswer, correctAnswer, roundBox, questionHeader) {
  roundBox.classList.remove('unanswered', 'answered', 'correct');
  roundBox.classList.add('incorrect');
  userAnswer.closest('.answer').classList.add('incorrect');

  const cross = document.createElement('i');
  cross.className = 'fas fa-times-circle result-indicator incorrect-indicator';
  cross.style.cssText = 'color: var(--error-color); margin-left: 10px; font-size: 1.1em;';
  questionHeader.appendChild(cross);

  if (correctAnswer) correctAnswer.closest('.answer').classList.add('correct');
}

function markQuestionUnanswered(correctAnswer, roundBox, questionHeader) {
  roundBox.classList.remove('answered', 'correct', 'incorrect');
  roundBox.classList.add('unanswered');

  const cross = document.createElement('i');
  cross.className = 'fas fa-minus-circle result-indicator unanswered-indicator';
  cross.style.cssText = 'color: var(--text-muted); margin-left: 10px; font-size: 1.1em;';
  questionHeader.appendChild(cross);

  if (correctAnswer) correctAnswer.closest('.answer').classList.add('correct');
}

/**
 * Display final score in floating box
 */
function displayFinalScore(score, total, answered, invalidCount = 0, wrongCount = 0) {
  const existingScore = document.getElementById('floating-score-display');
  if (existingScore) existingScore.remove();

  const scoreDisplay = document.createElement('div');
  scoreDisplay.id = 'floating-score-display';
  scoreDisplay.className = 'floating-score-box';

  const percentage = (score / total * 100).toFixed(1);
  const grade = getGrade(percentage);

  let invalidWarning = '';
  if (invalidCount > 0) {
    invalidWarning = `
      <div class="score-warning">
        <i class="fas fa-exclamation-triangle"></i>
        <span>${invalidCount} invalid question${invalidCount > 1 ? 's' : ''} excluded from scoring</span>
      </div>
    `;
  }

  // Feature 3: redo wrong questions button
  let redoButton = '';
  if (wrongCount > 0) {
    redoButton = `
      <button class="redo-wrong-btn" onclick="window.redoWrongQuestions()">
        <i class="fas fa-redo-alt"></i>
        Redo ${wrongCount} Wrong Question${wrongCount > 1 ? 's' : ''}
      </button>
    `;
  }

  scoreDisplay.innerHTML = `
    <div class="score-header">
      <i class="fas fa-trophy"></i>
      <h3>Quiz Complete!</h3>
      <button class="close-score-btn" onclick="window.closeScoreDisplay()">
        <i class="fas fa-times"></i>
      </button>
    </div>
    ${invalidWarning}
    <div class="score-main">
      <div class="score-value">${score}/${total}</div>
      <div class="score-percentage">${percentage}%</div>
      <div class="grade grade-${grade.toLowerCase().replace('+', 'plus')}">${grade}</div>
    </div>
    <div class="score-details">
      <div class="score-stat">
        <span class="stat-label">Valid Questions:</span>
        <span class="stat-value">${total}</span>
      </div>
      <div class="score-stat">
        <span class="stat-label">Answered:</span>
        <span class="stat-value">${answered}/${total}</span>
      </div>
      <div class="score-stat">
        <span class="stat-label">Correct:</span>
        <span class="stat-value">${score}/${answered || total}</span>
      </div>
    </div>
    <div class="score-message">
      ${getScoreMessage(percentage)}
    </div>
    ${redoButton}
  `;

  document.body.appendChild(scoreDisplay);
  setTimeout(() => { scoreDisplay.classList.add('show'); }, 100);
}

export function closeScoreDisplay() {
  const scoreDisplay = document.getElementById('floating-score-display');
  if (scoreDisplay) {
    scoreDisplay.classList.remove('show');
    setTimeout(() => { scoreDisplay.remove(); }, 300);
  }
}

window.closeScoreDisplay = closeScoreDisplay;

// Feature 3: expose redo to window
window.redoWrongQuestions = function() {
  closeScoreDisplay();
  import('./quiz-manager.js').then(module => module.redoWrongQuestions());
};