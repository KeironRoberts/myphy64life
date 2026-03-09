// game-auth.js - Game Authentication Handler
import { checkAuth } from '../auth.js';

// Check if user is logged in or in guest mode
checkAuth().then((user) => {
  const guestMode = localStorage.getItem('guestMode') === 'true';
  
  if (user) {
    // User is logged in
    localStorage.removeItem('guestMode');
    window.currentUser = user;
    console.log('User logged in:', user.email);
  } else if (guestMode) {
    // User chose guest mode
    window.currentUser = null;
    console.log('Guest mode enabled');
  } else {
    // Not logged in and not guest mode - redirect to login
    window.location.href = '../login.html';
  }
});
