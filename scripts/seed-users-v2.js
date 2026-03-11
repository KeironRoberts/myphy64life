// seed-users-v2.js - Add more users with score 0
// Run with: node seed-users-v2.js

const admin = require('firebase-admin');
const fs = require('fs');

// Check if firebase-key.json exists
if (!fs.existsSync('./firebase-key.json')) {
  console.error('❌ Error: firebase-key.json not found!');
  console.error('Please download it from Firebase Console and save it in this folder.');
  process.exit(1);
}

const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'phy64life'
});

const db = admin.firestore();

const usernames = [
  'tungtungtung',
  'sixseven',
  'ayokomagresearch',
  'kumakain_ngadobo',
  'misskonasiya',
  'bagsakakosachem',
  'juaquinandres'
];

function randomProfilePic() {
  return `images/profiles/${Math.floor(Math.random() * 20) + 1}.png`;
}

async function seedUsers() {
  console.log('[SEED] Starting user seeding for', usernames.length, 'users with score 0...\n');
  let successCount = 0;
  let errorCount = 0;

  for (const username of usernames) {
    try {
      const userId = `seeduser_${username}_${Date.now()}`;
      const userRef = db.collection('users').doc(userId);
      
      const userData = {
        uid: userId,
        email: `${username}@phy64life.test`,
        username: username,
        usernameLower: username.toLowerCase(),
        profilePicture: randomProfilePic(),
        highScore: 0,
        completedProblems: [],
        friends: [],
        createdAt: new Date().toISOString(),
        lastSession: new Date().toISOString()
      };
      
      await userRef.set(userData);
      console.log(`✅ Added user: ${username} (Score: 0, UID: ${userId})`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error adding ${username}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n[SEED] ✅ Seeding complete! Added ${successCount}/${usernames.length} users`);
  if (errorCount > 0) {
    console.log(`[SEED] ❌ ${errorCount} users failed`);
  }
  process.exit(0);
}

seedUsers().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
