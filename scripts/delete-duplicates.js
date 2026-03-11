// delete-duplicates.js - Remove duplicate usernames, keeping highest score
// Run with: node delete-duplicates.js

const admin = require('firebase-admin');
const fs = require('fs');

if (!fs.existsSync('./firebase-key.json')) {
  console.error('❌ Error: firebase-key.json not found!');
  process.exit(1);
}

const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'phy64life'
});

const db = admin.firestore();

async function deleteDuplicates() {
  console.log('[DELETE] Starting duplicate removal...\n');
  
  try {
    // Fetch all users
    const usersSnapshot = await db.collection('users').get();
    const allUsers = [];
    
    usersSnapshot.forEach(doc => {
      allUsers.push({
        docId: doc.id,
        uid: doc.data().uid,
        username: doc.data().username,
        usernameLower: doc.data().usernameLower || doc.data().username.toLowerCase(),
        highScore: doc.data().highScore || 0,
        email: doc.data().email
      });
    });
    
    console.log(`[DELETE] Found ${allUsers.length} total users\n`);
    
    // Group by lowercase username
    const userGroups = {};
    allUsers.forEach(user => {
      const key = user.usernameLower.toLowerCase();
      if (!userGroups[key]) {
        userGroups[key] = [];
      }
      userGroups[key].push(user);
    });
    
    // Find duplicates
    const duplicates = Object.entries(userGroups)
      .filter(([username, users]) => users.length > 1)
      .map(([username, users]) => ({
        username,
        users: users.sort((a, b) => b.highScore - a.highScore) // Sort by score desc
      }));
    
    if (duplicates.length === 0) {
      console.log('[DELETE] ✅ No duplicates found!');
      process.exit(0);
    }
    
    console.log(`[DELETE] Found ${duplicates.length} duplicate usernames:\n`);
    
    let totalDeleted = 0;
    
    for (const dup of duplicates) {
      console.log(`Username: ${dup.username}`);
      
      // Keep the first one (highest score), delete the rest
      for (let i = 1; i < dup.users.length; i++) {
        const userToDelete = dup.users[i];
        console.log(`  ❌ Deleting: ${userToDelete.docId} (Score: ${userToDelete.highScore}, Email: ${userToDelete.email})`);
        
        await db.collection('users').doc(userToDelete.docId).delete();
        totalDeleted++;
      }
      
      console.log(`  ✅ Keeping: ${dup.users[0].docId} (Score: ${dup.users[0].highScore}, Email: ${dup.users[0].email})\n`);
    }
    
    console.log(`[DELETE] ✅ Deleted ${totalDeleted} duplicate users!`);
    process.exit(0);
  } catch (error) {
    console.error('[DELETE] Error:', error.message);
    process.exit(1);
  }
}

deleteDuplicates();
