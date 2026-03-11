# Project Structure Documentation

## Overview
This is a physics education game built with Firebase, vanilla JavaScript, and HTML5 Canvas. The project is organized into logical folders for better maintainability.

## Directory Structure

```
phy64life/
├── Root Files (Application Core)
│   ├── index.html              # Homepage & main entry point
│   ├── login.html              # User login page
│   ├── login.js                # Login page logic
│   ├── login.css               # Login page styling
│   ├── about.html              # About page
│   ├── contact.html            # Contact page
│   ├── app.js                  # Main app initialization
│   ├── auth.js                 # Firebase authentication & user management
│   ├── firebase-config.js      # Firebase SDK initialization
│   ├── homepage-auth.js        # Homepage modal controllers
│   ├── homepage_style.css      # Homepage styling
│   │
│   ├── package.json            # NPM dependencies
│   └── package-lock.json       # Locked dependency versions
│
├── config/                     # Configuration & setup files
│   ├── firebase.json           # Firebase Hosting configuration
│   ├── firebase-key.json       # Firebase Admin SDK key (⚠️ sensitive)
│   ├── tsconfig.json           # TypeScript configuration
│   ├── eslint.config.cjs       # ESLint rules
│   ├── .eslintrc.json          # ESLint configuration
│   └── .prettierrc             # Prettier code formatting config
│
├── scripts/                    # Database & utility scripts
│   ├── seed-users.js           # Populate Firestore with test users (random scores)
│   ├── seed-users-v2.js        # Populate Firestore with test users (score 0)
│   ├── seed-users-rest.js      # Alternative seed script using REST API
│   └── delete-duplicates.js    # Remove duplicate usernames from Firestore
│
├── docs/                       # Documentation
│   └── FIREBASE_SETUP.md       # Firebase project setup & configuration guide
│
├── game/                       # Game application code
│   ├── game.html               # Game page HTML structure
│   ├── config.js               # Game configuration & problem definitions
│   ├── problemSolver.js        # Main game engine & physics simulation
│   ├── animations.js           # Canvas animation rendering logic
│   ├── animations.css          # Animation styling
│   ├── gameStyle.css           # Game layout & responsive design
│   ├── gameUtilities.js        # Utility functions (audio, drag-drop, debug)
│   ├── problemSolver.css       # Problem solver panel styling
│   ├── game-auth.js            # Game authentication & score saving
│   ├── templates.js            # HTML template definitions
│   ├── images/                 # Game-related images
│   └── sounds/                 # Game audio files
│       ├── correct-yay.mp3     # Correct answer sound
│       ├── wrong-buzzer.mp3    # Wrong answer sound
│       ├── tap-sfx.wav         # Tap/drag sound
│       ├── drop-sfx.wav        # Drop sound
│       └── music/              # Background music tracks
│
├── images/                     # Application images
│   └── profiles/               # User profile pictures
│
├── types/                      # TypeScript type definitions
│   └── globals.d.ts            # Global TypeScript definitions
│
├── node_modules/               # NPM packages (generated, ignored in .gitignore)
│
└── .git/                       # Git repository (ignored in .gitignore)
```

## File Organization Guide

### 🔧 Configuration Files (`/config`)
These files control build, linting, and Firebase setup. Keep them organized here:
- **firebase.json** - Specifies Hosting configuration (public folder, rewrites for SPA)
- **firebase-key.json** - Service account key (⚠️ SENSITIVE - never commit to public repo)
- **tsconfig.json** - TypeScript compiler settings
- **eslint.config.cjs** - Code linting rules
- **.eslintrc.json** - ESLint configuration
- **.prettierrc** - Code formatter configuration

### 📜 Scripts (`/scripts`)
Utility scripts for database management and one-time setup tasks:
- **seed-users.js** - Creates test users with random scores (30-300)
- **seed-users-v2.js** - Creates test users with score 0
- **seed-users-rest.js** - Alternative REST API-based seeding
- **delete-duplicates.js** - Removes duplicate usernames from Firestore

**Usage:**
```bash
cd scripts
node seed-users.js        # Add test users
node delete-duplicates.js # Clean up duplicates
```

### 📚 Documentation (`/docs`)
Reference materials and setup guides:
- **FIREBASE_SETUP.md** - Complete Firebase project configuration steps

### 🎮 Game Files (`/game`)
Core game engine and related assets:
- **problemSolver.js** - Main game logic (drag-drop, scoring, progress)
- **animations.js** - Canvas rendering for physics simulations
- **gameUtilities.js** - Audio, drag handlers, debug utilities
- **game-auth.js** - User authentication during gameplay
- **config.js** - Physics problems and game settings

### 🎨 Styling
**Root level:**
- **homepage_style.css** - Homepage, modals, profile styling

**Game folder:**
- **gameStyle.css** - Game layout, responsive breakpoints
- **animations.css** - Animation and canvas styling
- **problemSolver.css** - Problem solver panel styling

### 📱 Responsive Design Breakpoints
The layout adapts to different screen sizes:
- **Desktop** (>1200px) - Side-by-side layout (animation + problem solver)
- **iPad/Tablets** (768px - 1200px) - Horizontal layout with replay button
- **Mobile** (<768px) - Stacked vertical layout

## Key Files & Their Purposes

| File | Purpose |
|------|---------|
| `index.html` | Homepage with social features (friends, search, leaderboard) |
| `game.html` | Game page with canvas and solver panel |
| `auth.js` | User registration, login, score saving, friend management |
| `app.js` | Main app initialization and routing |
| `problemSolver.js` | Physics game engine, drag-drop logic, progress tracking |
| `animations.js` | Physics animation rendering on canvas |
| `gameUtilities.js` | Audio playback, sound effects, utility functions |

## Firebase Structure

**Firestore Database Collections:**
```
users/
  ├── uid
  ├── email
  ├── username (unique)
  ├── usernameLower (for case-insensitive search)
  ├── profilePicture (URL)
  ├── highScore (0-300)
  ├── completedProblems (array of problem indices)
  ├── friends (array of user UIDs)
  ├── createdAt (timestamp)
  └── lastSession (timestamp)
```

**Hosting:** Firebase Hosting with SPA routing (root redirects to index.html)

## Deleted Files

The following files were removed to clean up the workspace:
- `desktop.ini` - Windows system file (unnecessary)
- `tools/` - Development utility scripts folder (no longer needed)
- `game/tmp_prefix.js` - Temporary prefix script

## Git Workflow

1. **Add changes:** `git add .`
2. **Commit:** `git commit -m "Description"`
3. **Push to GitHub:** `git push origin main`
4. **Deploy to Firebase:** `firebase deploy --project phy64life`

## Environment Variables

**Required credentials (in config/):**
- `firebase-key.json` - Firebase Admin SDK service account (⚠️ SENSITIVE)
  - Never commit to public repositories
  - Use `.gitignore` to keep it local

## Development Notes

- **Package.json scripts:** None currently defined (add as needed)
- **ESLint:** Run `npx eslint .` to check code quality
- **Prettier:** Run `npx prettier --write .` to format code
- **Firebase CLI:** Install with `npm install -g firebase-tools`

## Quick Start Guide

1. **Setup:** Install dependencies
   ```bash
   npm install
   ```

2. **Configure Firebase:** Copy credentials to `config/firebase-key.json`

3. **Seed Database:** Add test users (optional)
   ```bash
   node scripts/seed-users.js
   ```

4. **Deploy:** Push to production
   ```bash
   firebase deploy --project phy64life
   ```

5. **View:** Visit https://phy64life.web.app

---

**Last Updated:** March 12, 2026
