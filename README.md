# Aviation Quiz Application

A modern quiz application for aviation maintenance training and certification preparation. Built with Next.js and vanilla JavaScript, it supports single and multi-quiz modes with live feedback, progress tracking, and intelligent question validation.

---

## Table of Contents

- [Introduction](#introduction)
- [Key Features](#key-features)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Project](#running-the-project)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Usage Guide](#usage-guide)
  - [Quiz Format](#quiz-format)
  - [Multi-Quiz Mode](#multi-quiz-mode)
- [Deployment](#deployment)
- [License](#license)

---

## Introduction

The Aviation Quiz Application is a learning platform for aviation maintenance professionals preparing for certification exams. It provides instant feedback, progress tracking, and flexible quiz management across desktop and mobile devices.

**Perfect for:**
- Aviation maintenance students
- Certification exam preparation
- Training organizations
- Self-paced learning

---

## Key Features

### 🎯 Core Functionality

- **Single & Multi-Quiz Modes**: Study from one quiz or combine multiple quizzes into a unified bank
- **Live Test Mode**: Get instant feedback on answers with color-coded indicators
- **Intelligent Question Validation**: Automatic detection and flagging of malformed quiz files
- **Level-Based Filtering**: Organize and filter questions by difficulty or topic
- **Progress Tracking**: Visual sidebar showing answered, correct, and incorrect questions
- **Image Support**: Display diagrams, schematics, and reference images within questions

### 📱 User Experience

- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Floating Controls**: Quick access to settings via floating action buttons
- **Smart Navigation**: Breadcrumb-style folder navigation with confirmation dialogs
- **Keyboard Shortcuts**: ESC to close modals, Enter to apply settings
- **Accessibility**: ARIA labels, semantic HTML, keyboard navigation support

### ⚙️ Advanced Features

- **Question Shuffling**: Randomize question and answer order for each session
- **Customizable Question Count**: Select how many questions to attempt
- **Score Analysis**: Detailed scoring with grade calculation and performance feedback
- **Quiz Validation**: Pre-flight checks for file format compliance
- **Session Persistence**: Resume quizzes with maintained state

---

## Architecture Overview

```mermaid
graph TD
    A[Client Browser] --> B[Next.js Server]
    B --> C[Static File Serving]
    B --> D[/api/list-quizzes]

    A --> E[Frontend Modules]
    E --> F[State Management]
    E --> G[UI Components]
    E --> H[Quiz Logic]
    E --> I[Parser Engine]

    D --> J[Quiz Files .txt]
    D --> K[Image Assets]

    F --> L[Local Storage API]
    H --> I
    I --> J
```

### Technology Stack

**Backend:**
- Next.js 14 (API routes, Node.js)

**Frontend:**
- Vanilla JavaScript (ES6 modules)
- jQuery 3.7.1 (DOM manipulation, animations)
- Font Awesome 6.4 (icons)
- Inter Font Family (typography)

---

## Getting Started

### Prerequisites

- **Node.js 18+**
- **npm**
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository:**

```bash
git clone https://github.com/yourusername/aviation-quiz.git
cd aviation-quiz
```

2. **Install dependencies:**

```bash
npm install
```

### Running the Project

**Development mode:**

```bash
npm run dev
```

**Production mode:**

```bash
npm run build
npm start
```

The app runs on `http://localhost:5000` by default.

---

## Configuration

Edit `public/js/config.js` to customize application behavior:

```javascript
export const CONFIG = {
  QUIZ_DIRECTORY_NAME: 'list quizzes',
  QUIZ_DIRECTORY_IN_ROOT: true,  // true = public/, false = project root

  // Validation rules
  MAX_CONSECUTIVE_LINES: 5,
  MIN_CONSECUTIVE_LINES: 3,

  // Defaults
  DEFAULT_QUESTION_COUNT: 20,
  DEFAULT_LIVE_TEST_MODE: true,

  // Grade thresholds (%)
  GRADE_THRESHOLDS: {
    A_PLUS: 90,
    A: 80,
    B: 70,
    C: 60
  }
};
```

---

## Project Structure

```
aviation-quiz/
├── pages/
│   ├── index.js              # Main Next.js page
│   ├── _document.js          # Custom document (CDN links)
│   └── api/
│       └── list-quizzes.js   # API route for directory listing
│
├── public/
│   ├── styles.css            # Application styles
│   ├── images/               # Question images
│   ├── validation-cache.json # Pre-built quiz validation results
│   │
│   ├── list quizzes/         # Quiz data files (.txt), organized in folders
│   │   ├── Category 1/
│   │   │   └── quiz1.txt
│   │   └── quiz2.txt
│   │
│   └── js/                   # Vanilla JS application
│       ├── main.js           # Entry point
│       ├── config.js         # Configuration
│       └── modules/
│           ├── app.js
│           ├── state.js
│           ├── api.js
│           ├── parser.js
│           ├── quiz-manager.js
│           ├── scoring.js
│           ├── live-test.js
│           └── ui/
│               ├── navigation.js
│               ├── quiz-display.js
│               ├── progress.js
│               ├── controls.js
│               ├── modal.js
│               ├── notifications.js
│               └── loading.js
│
├── scripts/
│   └── generate-validation-cache.js  # Pre-builds validation-cache.json
│
├── next.config.js
├── package.json
└── README.md
```

---

## Usage Guide

### Quiz Format

Quiz files are plain `.txt` files. Each question block is separated by a blank line. The correct answer is prefixed with `@@`.

```
What is the primary purpose of a wing? (Level 1)
To generate lift
@@To provide structural support for the aircraft
To house fuel tanks
To improve aerodynamics

Which tool is used to measure torque? (Level 2)
Micrometer
@@Torque wrench
Dial indicator
Calipers
```

**Format rules:**
1. First line of each block = question text
2. Following lines = answer options
3. Prefix correct answer with `@@`
4. Add levels in parentheses at the end of the question: `(Level 1)` or `(Level 1, Level 2)`
5. Embed images with `[IMG:filename.png]` in the question line
6. Separate question blocks with a blank line

**With image:**
```
Identify the component shown. [IMG:engine-diagram.png]
Carburetor
@@Fuel injector
Oil pump
Alternator
```

### Multi-Quiz Mode

1. Navigate to a folder containing multiple quiz files
2. Check the boxes next to the quizzes you want
3. Click **"Start Combined Quiz"**
4. Questions from all selected quizzes are shuffled together into one session

---

## Deployment

### Vercel

Push to GitHub and connect the repo to [Vercel](https://vercel.com). Vercel auto-detects Next.js — no extra configuration needed.

### Replit

The app is configured to build and run on Replit automatically:

```
npm run build && npm start
```

It serves on port 5000.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

**Built with ❤️ for the aviation community**
