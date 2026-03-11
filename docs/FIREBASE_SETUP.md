# Firebase Setup Guide

Follow these steps to set up Firebase authentication and Firestore database for your game:

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add Project"
3. Enter your project name (e.g., "phy64life")
4. Click "Create Project"
5. Wait for the project to be created

## Step 2: Set Up Authentication

1. In your Firebase project, go to **Build** → **Authentication**
2. Click **Get Started**
3. Enable **Email/Password** authentication:
   - Click "Email/Password"
   - Toggle both switches ON
   - Click "Save"

## Step 3: Set Up Firestore Database

1. Go to **Build** → **Firestore Database**
2. Click **Create Database**
3. Choose your region (closest to your users)
4. Start in **Test Mode** (for development)
   - Note: For production, set up proper security rules
5. Click **Create**

## Step 4: Get Your Firebase Credentials

1. Go to **Project Settings** (gear icon at the top)
2. Under **Your Apps**, create a new **Web** app
3. Register app and copy the config object
4. Open `firebase-config.js` in your project
5. Replace the placeholder values:

```javascript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Step 5: Set Up Firestore Rules

For development (Test Mode), the default rules allow all reads/writes. For production, update rules to be more secure:

1. Go to **Firestore Database** → **Rules** tab
2. Replace with these rules:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
  }
}
```

3. Click **Publish**

## Files Created

- `firebase-config.js` - Firebase configuration (update with your credentials)
- `auth.js` - Authentication logic using Firebase SDK
- `login.html` - Login/signup page UI
- `login.css` - Styling for auth pages
- `login.js` - Login/signup form handling
- `homepage-auth.js` - Homepage authentication checks
- `game-auth.js` - Game page authentication checks

## How It Works

1. User visits `index.html` → redirects to `login.html` if not authenticated
2. User creates account or logs in
3. Redirects to `index.html` → can now access the game
4. Game saves scores to both localStorage and Firestore
5. User can logout to return to login page

## Testing

1. Go to your local app
2. You'll be redirected to the login page
3. Create a new account with:
   - Username: any name
   - Email: test@example.com
   - Password: testpass123
4. After login, visit `game/game.html` to play
5. Scores are automatically saved to Firebase!

## Troubleshooting

**"Firebase is not defined"**
- Check that `firebase-config.js` has valid credentials
- Ensure you're using HTTPS in production

**"Firestore rules error"**
- Check your Firestore rules are published
- In test mode, rules should allow all access

**"Auth redirect loop"**
- Clear browser localStorage
- Check that Firebase project is properly configured

## Security Notes

**⚠️ Test Mode is for development only!**
- Anyone can read/write your database
- Set up proper Firestore rules before production
- Never commit your Firebase config with sensitive keys

For production:
1. Enable only necessary authentication methods
2. Set up email verification
3. Implement proper Firestore security rules
4. Use environment variables for sensitive config
5. Enable reCAPTCHA for bot protection
