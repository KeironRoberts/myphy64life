// login.js - Login/Signup Logic
import { registerUser, loginUser, checkAuth } from './auth.js';

// Toggle between login and signup forms
window.toggleForms = function () {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  loginForm.classList.toggle('active');
  signupForm.classList.toggle('active');
};

// Login button
document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  const loadingEl = document.getElementById('loginLoading');
  const btnEl = document.getElementById('loginBtn');

  if (!email || !password) {
    showError(errorEl, 'Please fill in all fields');
    return;
  }

  try {
    btnEl.disabled = true;
    loadingEl.classList.remove('hidden');
    errorEl.classList.remove('show');

    await loginUser(email, password);
    
    // Redirect to game after successful login
    localStorage.setItem('loginRedirect', 'true');
    window.location.href = 'index.html';
  } catch (error) {
    showError(errorEl, error.message);
  } finally {
    btnEl.disabled = false;
    loadingEl.classList.add('hidden');
  }
});

// Signup button
document.getElementById('signupBtn').addEventListener('click', async () => {
  const username = document.getElementById('signupUsername').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const confirm = document.getElementById('signupConfirm').value;
  const errorEl = document.getElementById('signupError');
  const loadingEl = document.getElementById('signupLoading');
  const btnEl = document.getElementById('signupBtn');

  if (!username || !email || !password || !confirm) {
    showError(errorEl, 'Please fill in all fields');
    return;
  }

  if (password !== confirm) {
    showError(errorEl, 'Passwords do not match');
    return;
  }

  if (password.length < 6) {
    showError(errorEl, 'Password must be at least 6 characters');
    return;
  }

  try {
    btnEl.disabled = true;
    loadingEl.classList.remove('hidden');
    errorEl.classList.remove('show');

    await registerUser(email, password, username);
    
    // Redirect to game after successful signup
    localStorage.setItem('loginRedirect', 'true');
    window.location.href = 'index.html';
  } catch (error) {
    showError(errorEl, error.message);
  } finally {
    btnEl.disabled = false;
    loadingEl.classList.add('hidden');
  }
});

// Guest button
document.getElementById('guestBtn').addEventListener('click', () => {
  // Set guest mode flag
  localStorage.setItem('guestMode', 'true');
  localStorage.removeItem('currentUser');
  // Redirect to game
  window.location.href = 'game/game.html';
});

// Redirect if already logged in
checkAuth().then((user) => {
  if (user) {
    localStorage.removeItem('guestMode');
    window.location.href = 'index.html';
  }
});

// Error display helper
function showError(element, message) {
  element.textContent = message;
  element.classList.add('show');
}
