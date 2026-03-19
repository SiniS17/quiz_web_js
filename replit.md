# Overview

This is a modern web-based quiz application built with **Next.js** (React) that serves educational quizzes for aviation maintenance training. The application provides an interactive quiz system covering various aviation topics including ATA chapters, aircraft maintenance modules, and engine-specific training materials. Users can browse through organized quiz categories, select specific quizzes, configure question counts, and take tests with immediate feedback and scoring.

The app is designed to be deployed on **Vercel** using Next.js.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Backend Architecture
- **Framework**: Next.js API routes (Node.js)
- **File System Based**: Quiz content stored as plain text files in organized directory structure under `public/list quizzes/`
- **Static File Serving**: `public/` directory serves all frontend assets (HTML, CSS, JavaScript) and quiz data files
- **API Endpoint**: `/api/list-quizzes` — Next.js API route for directory browsing and file listing with alphabetical sorting
- **Port Configuration**: Port 5000 (dev), configurable via `npm run start`

## Frontend Architecture
- **Framework**: Next.js with pages router (`pages/index.js`)
- **UI**: Existing vanilla JS/jQuery app loaded via ES module script injection in `useEffect`
- **Custom Document**: `pages/_document.js` for global stylesheets and jQuery CDN
- **Design System**: CSS custom properties (variables) for consistent theming and responsive design
- **Typography**: Google Fonts (Inter) with responsive font scaling using clamp()
- **Icons**: Font Awesome 6.4.0

## Data Storage
- **File-Based Storage**: Quiz content stored as structured `.txt` files in `public/list quizzes/`
- **Directory Organization**: Hierarchical folder structure for quiz categorization
- **Question Format**: Standardized format with question text, options, and `@@` marking correct answers
- **No Database**: File system serves as data persistence layer

## File Structure
```
pages/
  index.js          - Main Next.js page (renders quiz app shell)
  _document.js      - Custom document (stylesheets, jQuery CDN)
  api/
    list-quizzes.js - API route for listing quiz files/folders
public/
  styles.css        - Main stylesheet
  js/               - Vanilla JS quiz application modules
    config.js
    main.js
    modules/        - App modules (api, quiz-manager, parser, etc.)
  images/           - Static images
  list quizzes/     - Quiz data files (.txt) organized in folders
next.config.js      - Next.js configuration (allowedDevOrigins for Replit proxy)
package.json        - Node.js dependencies and scripts
```

## Scripts
- `npm run dev` — Start development server on port 5000
- `npm run build` — Build for production (used by Vercel)
- `npm run start` — Start production server on port 5000

## Deployment
- **Vercel**: Push to GitHub and connect to Vercel. Vercel auto-detects Next.js.
- **Replit**: Configured with `npm run build` + `npm run start` on autoscale.
<<<<<<< HEAD

## GitHub Integration Note
GitHub integration was not authorized through Replit's OAuth flow. To push to GitHub, use a GitHub Personal Access Token (PAT) stored as a secret (GITHUB_TOKEN), or ask the user to connect GitHub via Replit integrations (connector:ccfg_github_01K4B9XD3VRVD2F99YM91YTCAF).
=======
>>>>>>> 371556a (Saved progress at the end of the loop)
