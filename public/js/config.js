// config.js - Centralized Application Configuration
// This file contains all configurable static variables for the quiz application
// Modify these values to customize the application behavior without touching module code

export const CONFIG = {
  // ===================================
  // QUIZ DIRECTORY CONFIGURATION
  // ===================================

  QUIZ_DIRECTORY_NAME: 'list quizzes',

  /**
   * true  → /list quizzes  (root)
   * false → /public/list quizzes
   */
  QUIZ_DIRECTORY_IN_ROOT: true,


  // ===================================
  // LINE VALIDATION CONFIGURATION
  // ===================================

  MAX_CONSECUTIVE_LINES: 5,
  MIN_CONSECUTIVE_LINES: 3,


  // ===================================
  // DEFAULT QUIZ SETTINGS
  // ===================================

  DEFAULT_QUESTION_COUNT: 20,
  DEFAULT_LIVE_TEST_MODE: true,


  // ===================================
  // UI CONFIGURATION
  // ===================================

  LOADING_MESSAGES: {
    DEFAULT: 'Loading...',
    QUIZ_LOAD: 'Preparing Live Test',
    FOLDER_OPEN: 'Opening Folder',
    RESTART: 'Restarting Quiz',
    LIVE_TEST_ENABLE: 'Enabling Live Test',
    LEVEL_UPDATE: 'Updating Question Count'
  },

  LOADING_SUBTITLES: {
    DEFAULT: 'Please wait...',
    QUIZ_LOAD: 'Please wait while questions are being loaded...',
    FOLDER_OPEN: 'Loading quizzes...',
    RESTART: 'Please wait while questions are being reloaded...',
    LIVE_TEST_ENABLE: 'Please wait while the quiz is being prepared...'
  },

  NOTIFICATION_DURATION: 3000,
  ANIMATION_DURATION: 300,


  // ===================================
  // GRADE THRESHOLDS
  // ===================================

  GRADE_THRESHOLDS: {
    A_PLUS: 90,
    A: 80,
    B: 70,
    C: 60,
  },


  // ===================================
  // IMAGE CONFIGURATION
  // ===================================

  IMAGE_DIRECTORY: 'images',
  IMAGE_PLACEHOLDER: 'placeholder.png',
  MAX_IMAGE_HEIGHT: '400px',


  // ===================================
  // LEVEL CONFIGURATION
  // ===================================

  NO_LEVEL_LABEL: 'No level',
  LEVEL_PREFIX: 'Level',
  LEVEL_SHORT_PREFIX: 'L',


  // ===================================
  // SCORE MESSAGES
  // ===================================

  SCORE_MESSAGES: {
    90: "Excellent work! Outstanding performance! 🎉",
    80: "Great job! You have a solid understanding! 👍",
    70: "Good work! Keep practicing to improve! 👏",
    60: "Not bad! Review the topics and try again! 📚",
    0:  "Keep studying and you'll improve! Don't give up! 💪"
  },


  // ===================================
  // API ENDPOINTS
  // ===================================

  API_LIST_QUIZZES: '/api/list-quizzes',


  // ===================================
  // RESPONSIVE BREAKPOINTS
  // ===================================

  BREAKPOINTS: {
    MOBILE_SMALL: 480,
    MOBILE: 768,
    TABLET: 1024,
    DESKTOP: 1440
  },


  // ===================================
  // FILE VALIDATION
  // ===================================

  VALID_FILE_EXTENSIONS: ['.txt'],


  // ===================================
  // VALIDATION CACHE
  // ===================================
  //
  // Path to the pre-generated cache file (served from /public).
  // Generate it locally before deploying:
  //   node scripts/generate-validation-cache.js
  //
  // The script always checks BOTH validation criteria and writes full results.
  // What users actually see is controlled by VALIDATION_DISPLAY below.
  //
  // Set to null to disable cache loading (no validation shown to users at all).

  VALIDATION_CACHE_PATH: '/validation-cache.json',


  // ===================================
  // VALIDATION DISPLAY  ← admin-only
  // ===================================
  //
  // Controls which error types are VISIBLE TO USERS.
  // The cache always contains both types of results — these flags just
  // decide what gets rendered in the quiz grid and inside quizzes.
  //
  //   line_count   → 🔴 red    — wrong number of lines per question block
  //   answer_count → 🟣 violet — wrong number of @@ correct answers
  //
  // true  / true  → users see both red and violet
  // true  / false → users see only line-count errors (red)
  // false / true  → users see only answer-count errors (violet)
  // false / false → users see nothing, clean grid

  VALIDATION_DISPLAY: {
    SHOW_LINE_COUNT_ERRORS:   true,
    SHOW_ANSWER_COUNT_ERRORS: false,
  },
};


// ===================================
// HELPER FUNCTIONS
// ===================================

export function getQuizDirectoryPath() {
  return CONFIG.QUIZ_DIRECTORY_IN_ROOT
    ? `./${CONFIG.QUIZ_DIRECTORY_NAME}`
    : `./public/${CONFIG.QUIZ_DIRECTORY_NAME}`;
}

export function getQuizFilePath(filePath) {
  return `./${CONFIG.QUIZ_DIRECTORY_NAME}/${filePath}`;
}

export function getScoreMessage(percentage) {
  const thresholds = [90, 80, 70, 60, 0];
  for (const threshold of thresholds) {
    if (percentage >= threshold) return CONFIG.SCORE_MESSAGES[threshold];
  }
  return CONFIG.SCORE_MESSAGES[0];
}

export function getGrade(percentage) {
  const { A_PLUS, A, B, C } = CONFIG.GRADE_THRESHOLDS;
  if (percentage >= A_PLUS) return 'A+';
  if (percentage >= A)      return 'A';
  if (percentage >= B)      return 'B';
  if (percentage >= C)      return 'C';
  return 'F';
}

if (typeof window !== 'undefined') {
  window.APP_CONFIG = CONFIG;
}

export default CONFIG;
