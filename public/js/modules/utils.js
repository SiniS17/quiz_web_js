// modules/utils.js - Utility Functions

/**
 * Shuffle array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled copy of array
 */
export function shuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Shuffle questions while keeping passage groups intact.
 * Questions sharing a passageRef stay together as one atomic unit.
 * Standalone questions (no passageRef) are individual units.
 * @param {Array} questions - Array of question objects
 * @returns {Array} Shuffled array with passage groups preserved
 */
export function shuffleWithPassageGroups(questions) {
  const groups = [];
  for (const q of questions) {
    const ref = (typeof q === 'object' && q.passageRef) ? q.passageRef : null;
    const last = groups[groups.length - 1];
    if (ref !== null && last && last.passageRef === ref) {
      last.questions.push(q);
    } else {
      groups.push({ passageRef: ref, questions: [q] });
    }
  }
  return shuffle(groups).flatMap(g => g.questions);
}

/**
 * Add fade-in animation to element
 * @param {HTMLElement} element - Element to animate
 */
export function addFadeInAnimation(element) {
  if (window.jQuery) {
    $(element).hide().fadeIn(400).css('opacity', '1');
  } else {
    element.classList.add('fade-in');
    setTimeout(() => element.classList.remove('fade-in'), 300);
  }
}

/**
 * Calculate grade based on percentage
 * @param {number} percentage - Score percentage
 * @returns {string} Grade letter
 */
export function getGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  return 'F';
}

/**
 * Get score message based on percentage
 * @param {number} percentage - Score percentage
 * @returns {string} Encouragement message
 */
export function getScoreMessage(percentage) {
  if (percentage >= 90) return "Excellent work! Outstanding performance! 🎉";
  if (percentage >= 80) return "Great job! You have a solid understanding! 👍";
  if (percentage >= 70) return "Good work! Keep practicing to improve! 👏";
  if (percentage >= 60) return "Not bad! Review the topics and try again! 📚";
  return "Keep studying and you'll improve! Don't give up! 💪";
}

/**
 * Scroll to specific question
 * @param {number} index - Question index
 */
export function scrollToQuestion(index) {
  const questionElement = document.getElementById(`question-${index}`);
  if (questionElement) {
    questionElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    questionElement.style.background = 'rgba(37, 99, 235, 0.1)';
    setTimeout(() => {
      questionElement.style.background = '';
    }, 2000);
  }
}
