// homepage-auth.js - Homepage Authentication Handler
import { checkAuth, logoutUser, loadUserData, updateUserProfilePicture, updateUsername, addFriend, removeFriend, searchUsersByUsername, getHighScoreLeaderboard, getFriendsWithDetails } from './auth.js';

let currentUser = null;
let isSelectingProfile = false;

// Check if user is logged in, redirect to login if not
checkAuth().then(async (user) => {
  if (!user) {
    console.log('[HOMEPAGE] No user logged in, redirecting to login');
    window.location.href = 'login.html';
  } else {
    console.log('[HOMEPAGE] User logged in:', { uid: user.uid, email: user.email });
    currentUser = user;
    // User is logged in, display their username and profile picture
    const usernameEl = document.getElementById('profileUsername');
    const profilePictureEl = document.getElementById('profilePicture');
    
    console.log('[HOMEPAGE] DOM elements found:', {
      usernameEl: !!usernameEl,
      profilePictureEl: !!profilePictureEl
    });
    
    // Try to load user data from Firestore
    try {
      console.log('[HOMEPAGE] Loading user data from Firestore...');
      const userData = await loadUserData(user.uid);
      if (userData) {
        console.log('[HOMEPAGE] User data loaded, updating UI with:', {
          username: userData.username,
          profilePicture: userData.profilePicture
        });
        // Display username from profile
        usernameEl.textContent = userData.username || user.email.split('@')[0];
        // Display profile picture
        if (userData.profilePicture) {
          profilePictureEl.src = userData.profilePicture;
          console.log('[HOMEPAGE] Profile picture set to:', userData.profilePicture);
        } else {
          // Fallback if no profile picture
          profilePictureEl.src = 'images/profiles/1.png';
          console.log('[HOMEPAGE] No profile picture in data, using fallback');
        }
      } else {
        console.log('[HOMEPAGE] No user data found, using fallback');
        // Fallback if no user data
        usernameEl.textContent = user.email.split('@')[0];
        profilePictureEl.src = 'images/profiles/1.png';
      }
    } catch (error) {
      console.warn('[HOMEPAGE] Could not load user data:', error);
      // Use email as fallback
      usernameEl.textContent = user.email.split('@')[0];
      profilePictureEl.src = 'images/profiles/1.png';
    }
    
    // Set up click handlers after user data loads
    setupClickHandlers();
  }
});

// Set up click handlers
function setupClickHandlers() {
  console.log('[HANDLERS] Setting up click handlers...');
  
  // Profile picture click
  const profilePic = document.getElementById('profilePicture');
  if (profilePic) {
    profilePic.addEventListener('click', openProfileModal);
    console.log('[HANDLERS] Profile picture click handler attached');
  } else {
    console.error('[HANDLERS] profilePicture element not found!');
  }
  
  // Username click
  const username = document.getElementById('profileUsername');
  if (username) {
    username.addEventListener('click', openUsernameModal);
    console.log('[HANDLERS] Username click handler attached');
  } else {
    console.error('[HANDLERS] profileUsername element not found!');
  }
  
  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      console.log('[HANDLERS] Logout button clicked');
      try {
        console.log('[HANDLERS] Calling logoutUser()...');
        await logoutUser();
        console.log('[HANDLERS] Logout successful, redirecting to login');
        window.location.href = 'login.html';
      } catch (error) {
        console.error('[HANDLERS] Logout error:', error);
        alert('Error logging out: ' + error.message);
      }
    });
    console.log('[HANDLERS] Logout button click handler attached');
  } else {
    console.error('[HANDLERS] logoutBtn element not found!');
  }
  
  // Save username button
  const saveBtn = document.getElementById('saveUsernameBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      console.log('[HANDLERS] Save username button clicked');
      await handleSaveUsername();
    });
    console.log('[HANDLERS] Save username button click handler attached');
  } else {
    console.error('[HANDLERS] saveUsernameBtn element not found!');
  }
  
  // Close username modal button
  const closeUsernameBtn = document.getElementById('closeUsernameModalBtn');
  if (closeUsernameBtn) {
    closeUsernameBtn.addEventListener('click', closeUsernameModal);
    console.log('[HANDLERS] Close username modal button click handler attached');
  } else {
    console.error('[HANDLERS] closeUsernameModalBtn element not found!');
  }
  
  // Close profile modal button
  const closeProfileBtn = document.getElementById('closeModalBtn');
  if (closeProfileBtn) {
    closeProfileBtn.addEventListener('click', closeProfileModal);
    console.log('[HANDLERS] Close profile modal button click handler attached');
  } else {
    console.error('[HANDLERS] closeModalBtn element not found!');
  }
  
  // View Friends button
  const viewFriendsBtn = document.getElementById('viewFriendsBtn');
  if (viewFriendsBtn) {
    viewFriendsBtn.addEventListener('click', openFriendsListModal);
    console.log('[HANDLERS] View Friends button click handler attached');
  }
  
  // Search Users button
  const searchUsersBtn = document.getElementById('searchUsersBtn');
  if (searchUsersBtn) {
    searchUsersBtn.addEventListener('click', openSearchUsersModal);
    console.log('[HANDLERS] Search Users button click handler attached');
  }
  
  // View Leaderboard button
  const viewLeaderboardBtn = document.getElementById('viewLeaderboardBtn');
  if (viewLeaderboardBtn) {
    viewLeaderboardBtn.addEventListener('click', openLeaderboardModal);
    console.log('[HANDLERS] View Leaderboard button click handler attached');
  }
  
  // Search button in search modal
  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', performUserSearch);
    console.log('[HANDLERS] Search button click handler attached');
  }
  
  // Close modals buttons
  const closeFriendsBtn = document.getElementById('closeFriendsListBtn');
  if (closeFriendsBtn) {
    closeFriendsBtn.addEventListener('click', closeFriendsListModal);
    console.log('[HANDLERS] Close friends list button click handler attached');
  }
  
  const closeSearchBtn = document.getElementById('closeSearchModalBtn');
  if (closeSearchBtn) {
    closeSearchBtn.addEventListener('click', closeSearchUsersModal);
    console.log('[HANDLERS] Close search modal button click handler attached');
  }
  
  const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
  if (closeLeaderboardBtn) {
    closeLeaderboardBtn.addEventListener('click', closeLeaderboardModal);
    console.log('[HANDLERS] Close leaderboard modal button click handler attached');
  }
  
  // Search input enter key
  const searchInput = document.getElementById('searchUserInput');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        performUserSearch();
      }
    });
  }
  
  console.log('[HANDLERS] Setup complete');
}

// Open profile selector modal
function openProfileModal() {
  console.log('openProfileModal called');
  const modal = document.getElementById('profileModal');
  const profileGrid = document.getElementById('profileGrid');
  
  if (!modal || !profileGrid) {
    console.error('Modal or profileGrid element not found!');
    return;
  }
  
  // Clear previous options and remove old event listener
  profileGrid.innerHTML = '';
  if (profileGrid._profileSelectionListener) {
    profileGrid.removeEventListener('click', profileGrid._profileSelectionListener);
  }
  
  // Create profile options (1-20)
  for (let i = 1; i <= 20; i++) {
    const option = document.createElement('div');
    option.className = 'profile-option';
    option.setAttribute('data-profile', i);
    option.innerHTML = `<img src="images/profiles/${i}.png" alt="Profile ${i}" />`;
    
    // Check if this is the current profile picture
    const currentSrc = document.getElementById('profilePicture').src;
    if (currentSrc.includes(`/${i}.png`)) {
      option.classList.add('selected');
    }
    
    profileGrid.appendChild(option);
  }
  
  // Use event delegation for profile selection
  const profileSelectionListener = function(e) {
    const option = e.target.closest('.profile-option');
    if (option) {
      const profileNum = parseInt(option.getAttribute('data-profile'), 10);
      selectProfilePicture(profileNum, option);
    }
  };
  
  profileGrid.addEventListener('click', profileSelectionListener);
  profileGrid._profileSelectionListener = profileSelectionListener;
  
  // Show modal
  modal.classList.remove('hidden');
}

// Select and save profile picture
async function selectProfilePicture(number, element) {
  console.log('[PROFILE] selectProfilePicture called with number:', number);
  
  // Prevent multiple rapid calls
  if (isSelectingProfile) {
    console.log('[PROFILE] Profile selection already in progress, ignoring call');
    return;
  }
  
  if (!currentUser) {
    console.error('[PROFILE] currentUser not set!');
    return;
  }
  
  isSelectingProfile = true;
  const newProfilePath = `images/profiles/${number}.png`;
  console.log('[PROFILE] Starting profile picture update process');
  console.log('[PROFILE] Current user UID:', currentUser.uid);
  console.log('[PROFILE] New profile path:', newProfilePath);
  
  try {
    console.log('[PROFILE] Calling updateUserProfilePicture...');
    // Update Firestore
    await updateUserProfilePicture(currentUser.uid, newProfilePath);
    console.log('[PROFILE] updateUserProfilePicture completed successfully');
  } catch (error) {
    console.warn('[PROFILE] Firestore update failed:', error.code, error.message);
    console.warn('[PROFILE] Error details:', error);
    // Continue even if Firestore fails - update UI anyway
  }
  
  // Always update the UI, regardless of Firestore success
  const profileImg = document.getElementById('profilePicture');
  console.log('[PROFILE] Setting profile image src to:', newProfilePath);
  profileImg.src = newProfilePath;
  console.log('[PROFILE] Profile image src updated in DOM');
  
  // Force image reload to ensure it loads
  profileImg.onload = () => console.log('[PROFILE] Profile image loaded successfully');
  profileImg.onerror = () => console.error('[PROFILE] Profile image failed to load:', newProfilePath);
  
  // Update selected state in modal
  document.querySelectorAll('.profile-option').forEach(opt => {
    opt.classList.remove('selected');
  });
  if (element) {
    element.classList.add('selected');
  }
  
  // Close modal after selection
  console.log('[PROFILE] Closing profile modal after 300ms');
  setTimeout(() => {
    closeProfileModal();
    console.log('[PROFILE] Profile modal closed');
    isSelectingProfile = false;
  }, 300);
}

// Close profile modal
function closeProfileModal() {
  const modal = document.getElementById('profileModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Open username change modal
function openUsernameModal() {
  const modal = document.getElementById('usernameModal');
  const input = document.getElementById('newUsernameInput');
  const errorEl = document.getElementById('usernameError');
  
  if (!modal || !input) {
    console.error('Username modal elements not found');
    return;
  }
  
  // Set current username
  const currentUsername = document.getElementById('profileUsername').textContent;
  input.value = currentUsername;
  input.placeholder = currentUsername;
  errorEl.classList.remove('show');
  errorEl.textContent = '';
  
  // Show modal
  modal.classList.remove('hidden');
  setTimeout(() => input.focus(), 100);
}

// Close username modal
function closeUsernameModal() {
  const modal = document.getElementById('usernameModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Save new username
async function handleSaveUsername() {
  console.log('[USERNAME] handleSaveUsername called');
  const inputEl = document.getElementById('newUsernameInput');
  const errorEl = document.getElementById('usernameError');
  const newUsername = inputEl.value.trim();
  
  console.log('[USERNAME] Current username input:', newUsername);
  console.log('[USERNAME] Current user UID:', currentUser?.uid);
  
  if (!newUsername) {
    errorEl.textContent = 'Username cannot be empty';
    errorEl.classList.add('show');
    console.log('[USERNAME] Username is empty, showing error');
    return;
  }
  
  if (newUsername.length < 2) {
    errorEl.textContent = 'Username must be at least 2 characters';
    errorEl.classList.add('show');
    console.log('[USERNAME] Username too short, showing error');
    return;
  }
  
  if (!currentUser) {
    errorEl.textContent = 'Error: Not logged in';
    errorEl.classList.add('show');
    console.error('[USERNAME] currentUser not set!');
    return;
  }
  
  try {
    console.log('[USERNAME] Calling updateUsername with:', { userId: currentUser.uid, newUsername });
    await updateUsername(currentUser.uid, newUsername);
    console.log('[USERNAME] updateUsername completed successfully');
    
    // Update display
    document.getElementById('profileUsername').textContent = newUsername;
    console.log('[USERNAME] UI updated with new username:', newUsername);
    closeUsernameModal();
  } catch (error) {
    console.error('[USERNAME] Error updating username - Code:', error.code, 'Message:', error.message);
    console.error('[USERNAME] Full error:', error);
    errorEl.textContent = 'Error: ' + error.message;
    errorEl.classList.add('show');
  }
}

// ============= FRIENDS LIST FUNCTIONS =============

// Open Friends List Modal
async function openFriendsListModal() {
  console.log('[FRIENDS] openFriendsListModal called');
  const modal = document.getElementById('friendsListModal');
  const friendsList = document.getElementById('friendsList');
  
  if (!modal || !friendsList) {
    console.error('[FRIENDS] Modal elements not found');
    return;
  }
  
  // Show loading state
  friendsList.innerHTML = '<p class="loading-text">Loading friends...</p>';
  modal.classList.remove('hidden');
  
  try {
    // Load friends
    const friends = await getFriendsWithDetails(currentUser.uid);
    console.log('[FRIENDS] Loaded', friends.length, 'friends');
    
    if (friends.length === 0) {
      friendsList.innerHTML = '<p class="loading-text">No friends yet. Use Search Users to add friends!</p>';
      return;
    }
    
    // Render friends
    friendsList.innerHTML = '';
    friends.forEach(friend => {
      const friendEl = document.createElement('div');
      friendEl.className = 'friend-item';
      friendEl.innerHTML = `
        <img src="${friend.profilePicture}" alt="${friend.username}" />
        <div class="friend-info">
          <div class="friend-name">${friend.username}</div>
          <div class="friend-score">Score: ${friend.highScore}</div>
        </div>
        <button class="friend-remove-btn" data-friend-uid="${friend.uid}">Remove</button>
      `;
      
      // Add remove event listener
      const removeBtn = friendEl.querySelector('.friend-remove-btn');
      removeBtn.addEventListener('click', async () => {
        try {
          await removeFriend(currentUser.uid, friend.uid);
          console.log('[FRIENDS] Friend removed:', friend.username);
          // Refresh the list
          await openFriendsListModal();
        } catch (error) {
          console.error('[FRIENDS] Error removing friend:', error);
          alert('Error removing friend: ' + error.message);
        }
      });
      
      friendsList.appendChild(friendEl);
    });
  } catch (error) {
    console.error('[FRIENDS] Error loading friends:', error);
    friendsList.innerHTML = '<p class="loading-text">Error loading friends. Try again later.</p>';
  }
}

// Close Friends List Modal
function closeFriendsListModal() {
  const modal = document.getElementById('friendsListModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// ============= SEARCH USERS FUNCTIONS =============

// Open Search Users Modal
function openSearchUsersModal() {
  console.log('[SEARCH] openSearchUsersModal called');
  const modal = document.getElementById('searchUsersModal');
  const input = document.getElementById('searchUserInput');
  const resultsEl = document.getElementById('searchResults');
  
  if (!modal || !input) {
    console.error('[SEARCH] Modal elements not found');
    return;
  }
  
  // Clear previous state
  input.value = '';
  resultsEl.innerHTML = '<p class="loading-text">Enter a username to search</p>';
  
  // Show modal
  modal.classList.remove('hidden');
  setTimeout(() => input.focus(), 100);
}

// Close Search Users Modal
function closeSearchUsersModal() {
  const modal = document.getElementById('searchUsersModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Perform user search
async function performUserSearch() {
  console.log('[SEARCH] performUserSearch called');
  const input = document.getElementById('searchUserInput');
  const resultsEl = document.getElementById('searchResults');
  const searchTerm = input.value.trim();
  
  if (!searchTerm) {
    resultsEl.innerHTML = '<p class="loading-text">Enter a username to search</p>';
    return;
  }
  
  resultsEl.innerHTML = '<p class="loading-text">Searching...</p>';
  
  try {
    // Get current user's friends
    const currentUserData = await loadUserData(currentUser.uid);
    const currentFriends = currentUserData.friends || [];
    
    // Search users
    const results = await searchUsersByUsername(searchTerm);
    console.log('[SEARCH] Found', results.length, 'results');
    
    if (results.length === 0) {
      resultsEl.innerHTML = '<p class="loading-text">No users found with that username</p>';
      return;
    }
    
    // Render results
    resultsEl.innerHTML = '';
    results.forEach(user => {
      // Don't show current user in results
      if (user.uid === currentUser.uid) {
        return;
      }
      
      const isFriend = currentFriends.includes(user.uid);
      const resultEl = document.createElement('div');
      resultEl.className = 'search-result-item';
      resultEl.innerHTML = `
        <img src="${user.profilePicture}" alt="${user.username}" />
        <div class="user-info">
          <div class="user-name">${user.username}</div>
          <div class="user-score">Score: ${user.highScore}</div>
        </div>
        <button class="add-friend-btn ${isFriend ? 'added' : ''}" data-user-uid="${user.uid}">${isFriend ? 'Added' : 'Add'}</button>
      `;
      
      // Add friend event listener
      const addBtn = resultEl.querySelector('.add-friend-btn');
      addBtn.addEventListener('click', async () => {
        if (isFriend) {
          console.log('[SEARCH] User already added');
          return;
        }
        
        try {
          await addFriend(currentUser.uid, user.uid);
          console.log('[SEARCH] Friend added:', user.username);
          addBtn.textContent = 'Added';
          addBtn.classList.add('added');
          addBtn.disabled = true;
        } catch (error) {
          console.error('[SEARCH] Error adding friend:', error);
          alert('Error adding friend: ' + error.message);
        }
      });
      
      resultsEl.appendChild(resultEl);
    });
  } catch (error) {
    console.error('[SEARCH] Error searching users:', error);
    resultsEl.innerHTML = '<p class="loading-text">Error searching users. Try again later.</p>';
  }
}

// ============= LEADERBOARD FUNCTIONS =============

// Open Leaderboard Modal
async function openLeaderboardModal() {
  console.log('[LEADERBOARD] openLeaderboardModal called');
  const modal = document.getElementById('leaderboardModal');
  const leaderboardEl = document.getElementById('leaderboardTable');
  
  if (!modal || !leaderboardEl) {
    console.error('[LEADERBOARD] Modal elements not found');
    return;
  }
  
  // Show loading state
  leaderboardEl.innerHTML = '<p class="loading-text">Loading leaderboard...</p>';
  modal.classList.remove('hidden');
  
  try {
    // Load leaderboard
    const leaderboard = await getHighScoreLeaderboard(100);
    console.log('[LEADERBOARD] Loaded', leaderboard.length, 'users');
    
    if (leaderboard.length === 0) {
      leaderboardEl.innerHTML = '<p class="loading-text">No users found</p>';
      return;
    }
    
    // Render leaderboard header
    leaderboardEl.innerHTML = `
      <div class="leaderboard-header">
        <span>Rank</span>
        <span>User</span>
        <span></span>
        <span>Score</span>
      </div>
    `;
    
    // Render leaderboard rows
    leaderboard.forEach(user => {
      const rowEl = document.createElement('div');
      rowEl.className = 'leaderboard-row';
      
      // Highlight top 3
      let positionClass = '';
      if (user.position <= 3) {
        positionClass = 'top-3';
      }
      
      rowEl.innerHTML = `
        <div class="leaderboard-position ${positionClass}">${user.position}</div>
        <div class="leaderboard-user">
          <img src="${user.profilePicture}" alt="${user.username}" class="leaderboard-pic" />
          <span class="leaderboard-username">${user.username}</span>
        </div>
        <div></div>
        <div class="leaderboard-score">${user.highScore}</div>
      `;
      
      leaderboardEl.appendChild(rowEl);
    });
  } catch (error) {
    console.error('[LEADERBOARD] Error loading leaderboard:', error);
    leaderboardEl.innerHTML = '<p class="loading-text">Error loading leaderboard. Try again later.</p>';
  }
}

// Close Leaderboard Modal
function closeLeaderboardModal() {
  const modal = document.getElementById('leaderboardModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Close modals when clicking outside
window.addEventListener('click', (event) => {
  const usernameModal = document.getElementById('usernameModal');
  const profileModal = document.getElementById('profileModal');
  const friendsModal = document.getElementById('friendsListModal');
  const searchModal = document.getElementById('searchUsersModal');
  const leaderboardModal = document.getElementById('leaderboardModal');
  
  if (event.target === usernameModal) {
    closeUsernameModal();
  }
  if (event.target === profileModal) {
    closeProfileModal();
  }
  if (event.target === friendsModal) {
    closeFriendsListModal();
  }
  if (event.target === searchModal) {
    closeSearchUsersModal();
  }
  if (event.target === leaderboardModal) {
    closeLeaderboardModal();
  }
});
