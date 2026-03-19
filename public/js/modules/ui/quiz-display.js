// modules/ui/quiz-display.js - Quiz Question Display with Validation
import CONFIG from '../../config.js';
import { parseQuestionWithImages } from '../parser.js';
import { shuffle, addFadeInAnimation } from '../utils.js';
import { getAnsweredQuestions, setAnsweredQuestions } from '../state.js';
import { updateProgressIndicator } from './progress.js';
import { getLiveTestCheckbox, updateLiveScore, highlightLiveAnswers } from '../live-test.js';
import { getQuizState } from '../state.js';

/**
 * Validate a question block.
 * Returns { valid, violationType, reason, lineCount }
 *
 * violationType:
 *   'line_count'   → red    (wrong number of lines)
 *   'answer_count' → violet (wrong number of @@ correct answers)
 *   null           → valid
 */
function validateQuestionBlock(questionText) {
  const lines     = questionText.split('\n').filter(line => line.trim() !== '');
  const lineCount = lines.length;

  const { MIN_CONSECUTIVE_LINES, MAX_CONSECUTIVE_LINES } = CONFIG;

  // STEP 1 — line count (red)
  if (lineCount < MIN_CONSECUTIVE_LINES) {
    return { valid: false, violationType: 'line_count',
      reason: `Too few lines (${lineCount} < ${MIN_CONSECUTIVE_LINES})`, lineCount };
  }
  if (lineCount > MAX_CONSECUTIVE_LINES) {
    return { valid: false, violationType: 'line_count',
      reason: `Too many lines (${lineCount} > ${MAX_CONSECUTIVE_LINES})`, lineCount };
  }

  // STEP 2 — correct-answer count (violet)
  const answerLines  = lines.slice(1);
  const correctCount = answerLines.filter(l => l.trimStart().startsWith('@@')).length;
  if (correctCount !== 1) {
    return { valid: false, violationType: 'answer_count',
      reason: correctCount === 0
        ? 'No correct answer marked (@@)'
        : `${correctCount} correct answers marked (@@) — must be exactly 1`,
      lineCount };
  }

  return { valid: true, violationType: null, lineCount };
}

/**
 * Should this violation type be shown to the user?
 * Reads from CONFIG.VALIDATION_DISPLAY.
 */
function shouldShowViolation(violationType) {
  const { SHOW_LINE_COUNT_ERRORS, SHOW_ANSWER_COUNT_ERRORS } = CONFIG.VALIDATION_DISPLAY;
  if (violationType === 'line_count')   return SHOW_LINE_COUNT_ERRORS;
  if (violationType === 'answer_count') return SHOW_ANSWER_COUNT_ERRORS;
  return false;
}

/**
 * Create question element.
 *
 * If a violation is detected AND the relevant display flag is on:
 *   line_count   → .question-invalid        (red stripes, interaction blocked)
 *   answer_count → .question-invalid-violet (violet stripes, interaction blocked)
 *
 * If the display flag is off the question renders normally (no stripe/block).
 */
export function createQuestionElement(questionText, index) {
  const validation = validateQuestionBlock(questionText);

  // Decide whether to visually mark this question as invalid
  const markInvalid = !validation.valid && shouldShowViolation(validation.violationType);

  const lines       = questionText.split('\n');
  const questionTitle = lines[0];
  const answers     = lines.slice(1);

  const imageInfo   = parseQuestionWithImages(questionTitle);
  const cleanTitle  = questionTitle.replace(/\[IMG:[^\]]+\]/g, '').trim();
  const shuffledAnswers = shuffle([...answers]);

  const questionDiv = document.createElement('div');
  questionDiv.className = 'question';
  questionDiv.id = `question-${index}`;

  if (markInvalid) {
    questionDiv.classList.add(
      validation.violationType === 'answer_count'
        ? 'question-invalid-violet'
        : 'question-invalid'
    );
    questionDiv.setAttribute('data-invalid-reason', validation.reason);
    questionDiv.setAttribute('data-violation-type', validation.violationType);
  }

  const questionHeader = document.createElement('div');
  questionHeader.className = 'question-header';

  const quizState = getQuizState();
  const bankName  = (quizState.bankInfo && quizState.bankInfo[index]) ? quizState.bankInfo[index] : null;

  let badgeLabel;
  if (markInvalid) {
    badgeLabel = validation.violationType === 'answer_count'
      ? `⚠️ Answer Error — Question ${index + 1}`
      : `⚠️ Invalid Question ${index + 1}`;
  } else {
    badgeLabel = `Question ${index + 1}`;
  }

  let headerHTML = `
    <span class="question-number">
      ${badgeLabel}
      ${bankName ? `<span class="bank-label">${bankName}</span>` : ''}
    </span>
    <h3>${cleanTitle.replace(/\\n/g, '<br>')}</h3>
  `;

  if (markInvalid) {
    const bannerClass = validation.violationType === 'answer_count'
      ? 'validation-error validation-error-violet'
      : 'validation-error';
    headerHTML += `
      <div class="${bannerClass}">
        <i class="fas fa-exclamation-triangle"></i>
        <strong>Validation Error:</strong> ${validation.reason}
      </div>
    `;
  }

  if (imageInfo.hasImages) {
    headerHTML += '<div class="question-images">';
    imageInfo.images.forEach(imgFilename => {
      headerHTML += `
        <div class="question-image-container">
          <img src="images/${imgFilename}" alt="Question image" class="question-image"
               onerror="this.onerror=null;this.src='images/placeholder.png';this.alt='Image not found';">
        </div>
      `;
    });
    headerHTML += '</div>';
  }

  questionHeader.innerHTML = headerHTML;
  questionDiv.appendChild(questionHeader);

  const answersContainer = document.createElement('div');
  answersContainer.className = 'answers-container';

  shuffledAnswers.forEach((answer, answerIndex) => {
    const answerElement = createAnswerElement(answer, answerIndex, index, markInvalid);
    answersContainer.appendChild(answerElement);
  });

  questionDiv.appendChild(answersContainer);

  if (markInvalid) {
    const overlay      = document.createElement('div');
    overlay.className  = 'question-invalid-overlay';
    const msgClass     = validation.violationType === 'answer_count'
      ? 'invalid-message invalid-message-violet'
      : 'invalid-message';
    const msgText      = validation.violationType === 'answer_count'
      ? 'Answer Error — Cannot Submit'
      : 'Invalid Format — Cannot Answer';
    overlay.innerHTML  = `
      <div class="${msgClass}">
        <i class="fas fa-ban"></i>
        <span>${msgText}</span>
      </div>
    `;
    questionDiv.appendChild(overlay);
  }

  return questionDiv;
}

function createAnswerElement(answerText, answerIndex, questionIndex, isDisabled = false) {
  const isCorrect   = answerText.startsWith('@@');
  const cleanText   = isCorrect ? answerText.slice(2) : answerText;
  const answerLabel = String.fromCharCode(65 + answerIndex);

  const answerDiv = document.createElement('div');
  answerDiv.className = 'answer';
  answerDiv.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
  if (isDisabled) answerDiv.classList.add('answer-disabled');

  const input    = document.createElement('input');
  input.type     = 'radio';
  input.name     = `question${questionIndex}`;
  input.value    = cleanText;
  input.id       = `q${questionIndex}a${answerIndex}`;
  input.disabled = isDisabled;
  if (isCorrect) input.dataset.correct = 'true';

  const label    = document.createElement('label');
  label.htmlFor  = input.id;
  label.innerHTML = `<span class="answer-label">${answerLabel}</span>${cleanText.replace(/\\n/g, '<br>')}`;

  if (!isDisabled) {
    input.addEventListener('change', () => handleAnswerChange(input, answerDiv, questionIndex));
    answerDiv.addEventListener('click', e => handleAnswerClick(e, input, label, answerDiv, questionIndex));
  }

  answerDiv.appendChild(input);
  answerDiv.appendChild(label);
  return answerDiv;
}

function handleAnswerChange(input, answerDiv, questionIndex) {
  const questionDiv = input.closest('.question');
  questionDiv.querySelectorAll('.answer').forEach(a => a.classList.remove('selected'));
  if (input.checked) answerDiv.classList.add('selected');
  updateAnswerStatus(questionIndex);
  const ltc = getLiveTestCheckbox();
  if (ltc && ltc.checked) { updateLiveScore(); highlightLiveAnswers(questionDiv); }
}

function handleAnswerClick(e, input, label, answerDiv, questionIndex) {
  if (e.target === input) return;
  if (e.target === label || e.target.closest('label') === label) return;

  if (input.checked) {
    input.checked = false;
    answerDiv.classList.remove('selected');
    updateAnswerStatus(questionIndex);
    const ltc = getLiveTestCheckbox();
    if (ltc && ltc.checked) { updateLiveScore(); highlightLiveAnswers(input.closest('.question')); }
  } else {
    const questionDiv = answerDiv.closest('.question');
    questionDiv.querySelectorAll('.answer').forEach(a => a.classList.remove('selected'));
    input.checked = true;
    answerDiv.classList.add('selected');
    updateAnswerStatus(questionIndex);
    const ltc = getLiveTestCheckbox();
    if (ltc && ltc.checked) { updateLiveScore(); highlightLiveAnswers(questionDiv); }
  }
}

function updateAnswerStatus(questionIndex) {
  const answeredQuestions = getAnsweredQuestions();
  answeredQuestions[questionIndex] = true;
  setAnsweredQuestions(answeredQuestions);
  updateProgressIndicator(questionIndex);
}

export function disableAllAnswers() {
  document.querySelectorAll('.answer input[type="radio"]').forEach(r => { r.disabled = true; });
  document.querySelectorAll('.answer').forEach(a => {
    a.style.cursor = 'not-allowed'; a.style.opacity = '0.7'; a.style.pointerEvents = 'none';
  });
}

export function enableAllAnswers() {
  document.querySelectorAll('.answer:not(.answer-disabled)').forEach(a => {
    a.style.cursor = 'pointer'; a.style.opacity = '1'; a.style.pointerEvents = 'auto';
  });
}