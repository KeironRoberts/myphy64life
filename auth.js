// auth.js - Firebase Authentication Setup
// @ts-ignore - Firebase SDK imports from CDN
import { firebaseConfig } from './firebase-config.js';
// @ts-ignore - Firebase SDK imports from CDN
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
// @ts-ignore - Firebase SDK imports from CDN
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
// @ts-ignore - Firebase SDK imports from CDN
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, where, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Check if user is currently logged in
export function checkAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('[AUTH] checkAuth: User is logged in, UID:', user.uid);
      } else {
        console.log('[AUTH] checkAuth: No user logged in');
      }
      resolve(user);
    });
  });
}

// Register new user with email + password + username
export async function registerUser(email, password, username) {
  try {
    console.log('[AUTH] registerUser called with email:', email, 'username:', username);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('[AUTH] User created successfully, UID:', user.uid);
    
    // Assign a random profile picture (1-20)
    const profilePictureNum = Math.floor(Math.random() * 20) + 1;
    const profilePicture = `images/profiles/${profilePictureNum}.png`;
    console.log('[AUTH] Assigned random profile picture:', profilePicture);
    
    // Try to save user profile to Firestore, but don't fail if it doesn't work
    try {
      console.log('[AUTH] Saving user profile to Firestore...');
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: email,
        username: username,
        usernameLower: username.toLowerCase(),
        profilePicture: profilePicture,
        createdAt: new Date().toISOString(),
        highScore: 0,
        completedProblems: [],
        friends: [],
        lastSession: new Date().toISOString(),
      });
      console.log('[AUTH] User profile saved to Firestore successfully');
    } catch (firestoreError) {
      console.warn('[AUTH] Firestore write failed (non-blocking):', firestoreError);
      // Continue anyway - user is authenticated even if Firestore write failed
    }
    
    return user;
  } catch (error) {
    console.error('[AUTH] registerUser error:', error.message);
    throw new Error(error.message);
  }
}

// Login existing user with email + password
export async function loginUser(email, password) {
  try {
    console.log('[AUTH] loginUser called with email:', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('[AUTH] Login successful, UID:', userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error('[AUTH] Login error:', error.message);
    throw new Error(error.message);
  }
}

// Logout user
export async function logoutUser() {
  try {
    console.log('[AUTH] logoutUser called');
    await signOut(auth);
    console.log('[AUTH] Logout successful');
  } catch (error) {
    console.error('[AUTH] Logout error:', error.message);
    throw new Error(error.message);
  }
}

// Save game progress to Firestore
export async function saveGameProgress(userId, highScore, completedProblems) {
  try {
    console.log('[GAME] saveGameProgress called:', { userId, highScore, completedProblems: completedProblems?.length });
    const userRef = doc(db, 'users', userId);
    
    // Get current data to compare high scores
    const userDoc = await getDoc(userRef);
    const currentHighScore = userDoc.data()?.highScore || 0;
    const newHighScore = Math.max(highScore, currentHighScore);
    
    console.log('[GAME] Current high score:', currentHighScore, 'New high score:', newHighScore);
    
    // Update the document
    await updateDoc(userRef, {
      highScore: newHighScore,
      completedProblems: completedProblems,
      lastSession: new Date().toISOString(),
    });
    
    console.log('[GAME] Progress saved successfully to Firestore');
  } catch (error) {
    console.error('[GAME] Error saving progress:', error.message);
    console.error('[GAME] Error details:', error);
  }
}

// Load user data from Firestore
export async function loadUserData(userId) {
  try {
    console.log('[AUTH] loadUserData called for userId:', userId);
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      console.log('[AUTH] User data loaded successfully:', {
        username: data.username,
        profilePicture: data.profilePicture,
        email: data.email
      });
      return data;
    }
    console.log('[AUTH] User document does not exist for userId:', userId);
    return null;
  } catch (error) {
    console.error('[AUTH] Error loading user data:', error.code, error.message);
    return null;
  }
}

// Update user profile picture
export async function updateUserProfilePicture(userId, profilePicturePath) {
  try {
    console.log('[AUTH] updateUserProfilePicture called:', {
      userId: userId,
      newPath: profilePicturePath
    });
    const userRef = doc(db, 'users', userId);
    console.log('[AUTH] Using setDoc with merge to create/update document...');
    await setDoc(userRef, {
      profilePicture: profilePicturePath,
    }, { merge: true });
    console.log('[AUTH] Profile picture updated successfully in Firestore');
    return true;
  } catch (error) {
    console.error('[AUTH] Error updating profile picture - Code:', error.code, 'Message:', error.message);
    throw error;
  }
}

// Update user username
export async function updateUsername(userId, newUsername) {
  try {
    console.log('[AUTH] updateUsername called:', {
      userId: userId,
      newUsername: newUsername
    });
    const userRef = doc(db, 'users', userId);
    console.log('[AUTH] Using setDoc with merge to create/update document...');
    await setDoc(userRef, {
      username: newUsername,
      usernameLower: newUsername.toLowerCase(),
    }, { merge: true });
    console.log('[AUTH] Username updated successfully in Firestore');
    return true;
  } catch (error) {
    console.error('[AUTH] Error updating username - Code:', error.code, 'Message:', error.message);
    throw error;
  }
}

// Add a friend to user's friends list
export async function addFriend(userId, friendUid) {
  try {
    console.log('[FRIENDS] addFriend called:', { userId, friendUid });
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('[FRIENDS] User document not found');
      throw new Error('User not found');
    }
    
    const friends = userDoc.data().friends || [];
    
    // Check if already friends
    if (friends.includes(friendUid)) {
      console.log('[FRIENDS] Already friends with this user');
      return false;
    }
    
    // Add friend
    friends.push(friendUid);
    await updateDoc(userRef, {
      friends: friends
    });
    
    console.log('[FRIENDS] Friend added successfully');
    return true;
  } catch (error) {
    console.error('[FRIENDS] Error adding friend:', error.message);
    throw error;
  }
}

// Remove a friend from user's friends list
export async function removeFriend(userId, friendUid) {
  try {
    console.log('[FRIENDS] removeFriend called:', { userId, friendUid });
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('[FRIENDS] User document not found');
      throw new Error('User not found');
    }
    
    let friends = userDoc.data().friends || [];
    
    // Remove friend
    friends = friends.filter(uid => uid !== friendUid);
    await updateDoc(userRef, {
      friends: friends
    });
    
    console.log('[FRIENDS] Friend removed successfully');
    return true;
  } catch (error) {
    console.error('[FRIENDS] Error removing friend:', error.message);
    throw error;
  }
}

// Search users by username (exact match or partial match)
export async function searchUsersByUsername(searchTerm) {
  try {
    console.log('[SEARCH] searchUsersByUsername called:', searchTerm);
    const usersRef = collection(db, 'users');
    
    // Try to use usernameLower if available (case-insensitive)
    const searchTermLower = searchTerm.toLowerCase();
    const q = query(usersRef, where('usernameLower', '==', searchTermLower));
    
    try {
      const querySnapshot = await getDocs(q);
      
      const results = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        results.push({
          uid: doc.id,
          username: userData.username,
          profilePicture: userData.profilePicture || 'images/profiles/1.png',
          highScore: userData.highScore || 0
        });
      });
      
      console.log('[SEARCH] Found', results.length, 'results for:', searchTerm);
      return results;
    } catch (fieldError) {
      // Fallback: if usernameLower doesn't exist, get all users and filter client-side
      console.log('[SEARCH] usernameLower not available, fetching all users for client-side filtering');
      const allUsersSnapshot = await getDocs(collection(db, 'users'));
      
      const results = [];
      allUsersSnapshot.forEach((doc) => {
        const userData = doc.data();
        // Case-insensitive match
        if (userData.username && userData.username.toLowerCase() === searchTermLower) {
          results.push({
            uid: doc.id,
            username: userData.username,
            profilePicture: userData.profilePicture || 'images/profiles/1.png',
            highScore: userData.highScore || 0
          });
        }
      });
      
      console.log('[SEARCH] Found', results.length, 'results (via client-side filtering) for:', searchTerm);
      return results;
    }
  } catch (error) {
    console.error('[SEARCH] Error searching users:', error.message);
    throw error;
  }
}

// Get high score leaderboard (top 100 users)
export async function getHighScoreLeaderboard(limit_num = 100) {
  try {
    console.log('[LEADERBOARD] getHighScoreLeaderboard called with limit:', limit_num);
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('highScore', 'desc'), limit(limit_num));
    const querySnapshot = await getDocs(q);
    
    const leaderboard = [];
    let position = 1;
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      leaderboard.push({
        position: position++,
        uid: doc.id,
        username: userData.username,
        profilePicture: userData.profilePicture || 'images/profiles/1.png',
        highScore: userData.highScore || 0
      });
    });
    
    console.log('[LEADERBOARD] Retrieved', leaderboard.length, 'users from leaderboard');
    return leaderboard;
  } catch (error) {
    console.error('[LEADERBOARD] Error getting leaderboard:', error.message);
    throw error;
  }
}

// Get friends with detailed information
export async function getFriendsWithDetails(userId) {
  try {
    console.log('[FRIENDS] getFriendsWithDetails called for userId:', userId);
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('[FRIENDS] User document not found');
      throw new Error('User not found');
    }
    
    const friendUids = userDoc.data().friends || [];
    const friendsData = [];
    
    // Fetch data for each friend
    for (const friendUid of friendUids) {
      try {
        const friendDoc = await getDoc(doc(db, 'users', friendUid));
        if (friendDoc.exists()) {
          const friendData = friendDoc.data();
          friendsData.push({
            uid: friendUid,
            username: friendData.username,
            profilePicture: friendData.profilePicture || 'images/profiles/1.png',
            highScore: friendData.highScore || 0
          });
        }
      } catch (error) {
        console.warn('[FRIENDS] Could not fetch friend data for:', friendUid);
      }
    }
    
    console.log('[FRIENDS] Retrieved', friendsData.length, 'friends');
    return friendsData;
  } catch (error) {
    console.error('[FRIENDS] Error getting friends with details:', error.message);
    throw error;
  }
}
