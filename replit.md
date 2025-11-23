# ExamMaster AI - Replit Setup

## Overview
ExamMaster AI is a React-based Progressive Web App (PWA) that helps students prepare for Indian competitive exams using Google's Gemini AI to generate practice questions.

**Technology Stack:**
- Frontend: React 18 + TypeScript
- Build Tool: Vite 5
- AI Service: Google Gemini API (@google/genai)
- UI: TailwindCSS (via CDN)
- Charts: Recharts
- PWA: Service Worker enabled

## Project Status
- ✅ Successfully imported from GitHub
- ✅ Node.js 20 installed
- ✅ Dependencies installed
- ✅ Vite configured for Replit environment (port 5000, host 0.0.0.0)
- ⏳ API key needs to be configured
- ✅ Development workflow running

## Recent Changes (November 23, 2025)
- Configured Vite to run on port 5000 with host 0.0.0.0 for Replit compatibility
- Set up HMR (Hot Module Replacement) using WSS protocol on port 443 for Replit proxy
- Updated environment variable handling to use Replit's env system
- Moved SignupScreen.tsx to components directory for proper organization
- Created development workflow
- Configured static deployment with build process

## Configuration

### Environment Variables
The app requires a Google Gemini API key:
- **Variable name:** `API_KEY`
- **Required for:** Generating AI-powered exam questions
- **Without it:** The app will fall back to mock data

### Project Architecture
```
/
├── components/          # React components
│   ├── Dashboard.tsx
│   ├── LoginScreen.tsx
│   ├── QuestionCard.tsx
│   ├── PaperGenerator.tsx
│   └── ...
├── services/           # Service layer
│   ├── geminiService.ts    # Google Gemini API integration
│   └── storageService.ts   # Local storage management
├── App.tsx            # Main application component
├── types.ts           # TypeScript type definitions
├── constants.ts       # App constants and mock data
├── index.html         # Entry HTML with PWA config
├── vite.config.ts     # Vite configuration
└── sw.js              # Service Worker for PWA
```

### Key Features
1. **Multi-exam support:** JEE, NEET, UPSC, SSC, GATE, etc.
2. **AI Question Generation:** Uses Gemini to create exam-specific questions
3. **Practice Modes:** Finite and endless practice sessions
4. **Paper Generator:** Create complete mock exam papers
5. **Image Upload:** Extract questions from images using Gemini vision
6. **Statistics Tracking:** User progress and performance analytics
7. **Dark Mode:** Full dark mode support
8. **PWA:** Installable as a mobile app

### User Preferences
- Uses local storage for user authentication (demo mode)
- Tracks user preferences, stats, and question history
- Dark mode preference persisted across sessions

## Development Notes
- The app uses client-side routing (single-page application)
- No backend required - all data stored in browser localStorage
- API key is exposed to client (by original design from AI Studio)
- Service Worker provides offline capabilities
- HMR configured for Replit: WSS protocol, port 443, dynamic host based on REPL_SLUG and REPL_OWNER

## Deployment Notes
- Deployment type: Static site
- Build command: `npm run build`
- Output directory: `dist/`
- Requires API_KEY environment variable to be set
- Vite builds optimized production bundle with code splitting and minification
