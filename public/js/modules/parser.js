// modules/parser.js - Question Parsing Logic with Multi-Quiz Level Recounting
import { clearLevelCounts, incrementLevelCount } from './state.js';
import { getLevelCounts } from './state.js';

function getQuestionText(input) {
  return typeof input === 'string' ? input : input?.text || '';
}


function normalizeLevel(level) {
  const lower = level.toLowerCase();

  // Standard numbered levels
  const match = lower.match(/^level\s*(\d+)$/);
  if (match) {
    return `Level ${match[1]}`;
  }

  // Known text levels
  if (lower === 'no level') return 'No level';
  if (lower === 'not clear') return 'Not clear';

  // Fallback: capitalize first letter only
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}


/**
 * Parse question text and extract image references
 * @param {string} questionText - Raw question text
 * @returns {Object} Parsed question with image info
 */
export function parseQuestionWithImages(questionText) {
  const imgPattern = /\[IMG:([^\]]+)\]/g;

  let hasImages = false;
  let images = [];

  let match;
  while ((match = imgPattern.exec(questionText)) !== null) {
    hasImages = true;
    images.push(match[1]);
  }

  return {
    hasImages,
    images,
    cleanText: questionText
  };
}

/**
 * Detect whether a raw block is a passage block.
 * A passage block's first non-empty line must be exactly "[PASSAGE]".
 * @param {string} blockText - Joined block text
 * @returns {boolean}
 */
export function isPassageBlock(blockText) {
  const firstLine = blockText.split('\n').find(l => l.trim() !== '');
  return firstLine ? firstLine.trim() === '[PASSAGE]' : false;
}

/**
 * Detect whether a raw block is a passage-end marker.
 * A block whose only non-empty content is "[END]" closes the active passage,
 * so that subsequent questions are no longer linked to it.
 * @param {string} blockText - Joined block text
 * @returns {boolean}
 */
export function isEndBlock(blockText) {
  const nonEmpty = blockText.split('\n').filter(l => l.trim() !== '');
  return nonEmpty.length === 1 && nonEmpty[0].trim() === '[END]';
}

/**
 * Extract the passage body (everything after the [PASSAGE] marker line).
 * @param {string} blockText - Raw passage block text
 * @returns {string} Passage body text
 */
export function extractPassageBody(blockText) {
  const lines = blockText.split('\n');
  const markerIndex = lines.findIndex(l => l.trim() === '[PASSAGE]');
  return lines.slice(markerIndex + 1).join('\n').trim();
}

/**
 * Parse raw quiz text into structured question objects.
 * All quizzes use blank-line separation between blocks.
 * A [PASSAGE] block is stored and attached as `passageRef` to
 * all subsequent question objects until an [END] block, the next [PASSAGE], or EOF.
 *
 * @param {string[]} lines - Lines of quiz text
 * @returns {Array<{text:string, passageRef:string|null}>} Array of question objects
 */
export function parseQuestions(lines) {
  const questions = [];
  let currentBlock = [];
  let currentPassage = null; // active passage text, or null

  clearLevelCounts();

  const flushBlock = () => {
    if (currentBlock.length === 0) return;
    const blockText = currentBlock.join('\n');
    currentBlock = [];

    if (isPassageBlock(blockText)) {
      // Update the active passage; do NOT add to questions[]
      currentPassage = extractPassageBody(blockText);
      return;
    }

    if (isEndBlock(blockText)) {
      // Clear the active passage; questions after this are standalone again
      currentPassage = null;
      return;
    }

    // Regular question block
    const questionObj = {
      text: blockText,
      passageRef: currentPassage || null,
    };
    questions.push(questionObj);
    extractAndCountLevel(blockText);
  };

  lines.forEach((line) => {
    if (line.trim() === '') {
      flushBlock();
    } else {
      currentBlock.push(line);
    }
  });

  // Flush last block if file doesn't end with a blank line
  flushBlock();

  return questions;
}

/**
 * Extract levels from question and increment counts.
 * Only checks the END of the first line for level indicators.
 * @param {string} questionText - Question text (plain string, not an object)
 */
function extractAndCountLevel(questionInput) {
  const questionText = getQuestionText(questionInput);
  const firstLine = questionText.split('\n')[0].trim();

  const endPattern = /\(([^)]+)\)\s*$/;
  const match = endPattern.exec(firstLine);

  let foundLevels = new Set();

  if (match) {
    const content = match[1].trim();

    if (!content.includes('IMG:')) {
      const parts = content.split(/[,;]/).map(part => part.trim());
      parts.forEach(part => {
        if (part) {
          foundLevels.add(normalizeLevel(part));
        }
      });
    }
  }

  if (foundLevels.size === 0) {
    foundLevels.add('No level');
  }

  foundLevels.forEach(level => {
    incrementLevelCount(level);
  });
}

/**
 * Get levels from a single question.
 * Only checks the END of the first line.
 * @param {string|Object} questionInput - Question text or object
 * @returns {string[]} Array of level names
 */
export function getQuestionLevels(questionInput) {
  const questionText = getQuestionText(questionInput);
  const firstLine = questionText.split('\n')[0].trim();

  const endPattern = /\(([^)]+)\)\s*$/;
  const match = endPattern.exec(firstLine);

  let levels = [];

  if (match) {
    const content = match[1].trim();

    if (!content.includes('IMG:')) {
      const parts = content.split(/[,;]/).map(part => part.trim());
      parts.forEach(part => {
        if (part && !levels.includes(part)) {
          levels.push(normalizeLevel(part));
        }
      });
    }
  }

  if (levels.length === 0) {
    levels.push('No level');
  }

  return levels;
}

/**
 * Recount levels for an array of questions (for multi-quiz mode).
 * Accepts both plain strings and question objects.
 * @param {Array<string|Object>} questions - Array of all combined questions
 */
export function recountLevelsForQuestions(questions) {
  clearLevelCounts();

  console.log('🔄 Recounting levels for combined quiz...');
  console.log(`📊 Total questions to process: ${questions.length}`);

  questions.forEach(question => {
    const levels = getQuestionLevels(question);
    levels.forEach(level => {
      incrementLevelCount(level);
    });
  });

  const finalCounts = getLevelCounts();
  console.log('✅ Final level counts:', finalCounts);
  console.log('📈 Total unique levels:', Object.keys(finalCounts).length);
  console.log('💡 Each count = number of questions that HAVE that level');
}

/**
 * Filter questions by selected levels.
 * Accepts both plain strings and question objects.
 * @param {Array<string|Object>} questions - All questions
 * @param {string[]} selectedLevels - Selected level names
 * @returns {Array} Filtered questions (same type as input elements)
 */
export function filterQuestionsByLevel(questions, selectedLevels) {
  if (selectedLevels.length === 0) return questions;

  return questions.filter(question => {
    const questionLevels = getQuestionLevels(question);
    return questionLevels.some(level => selectedLevels.includes(level));
  });
}

/**
 * Get selected levels from checkboxes.
 * @returns {string[]} Array of selected level names
 */
export function getSelectedLevels() {
  const checkboxes = document.querySelectorAll('#level-checkboxes input[type="checkbox"]:checked');
  return Array.from(checkboxes).map(cb => cb.dataset.level);
}

/**
 * Sort levels for display (numbers first, then alphabetically).
 * @param {Object} levelCounts - Object with level names as keys
 * @returns {Array} Sorted array of [level, count] pairs
 */
export function sortLevelsForDisplay(levelCounts) {
  const entries = Object.entries(levelCounts);

  return entries.sort((a, b) => {
    const [levelA] = a;
    const [levelB] = b;

    const numA = parseInt(levelA);
    const numB = parseInt(levelB);

    const isNumA = !isNaN(numA) && String(numA) === levelA;
    const isNumB = !isNaN(numB) && String(numB) === levelB;

    if (isNumA && isNumB) return numA - numB;
    if (isNumA && !isNumB) return -1;
    if (!isNumA && isNumB) return 1;

    return levelA.toLowerCase().localeCompare(levelB.toLowerCase());
  });
}