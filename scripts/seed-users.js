// Script to seed Firestore with test users
// Run with: node seed-users.js

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK (uses default credentials)
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'phy64life'
});

const db = admin.firestore();

const usernames = [
  'norm1234',
  'Reynantepogi',
  'Lancemaliit',
  'Kendal:(',
  'ninna_usagi',
  'idontlikechocolate',
  'ashi_ashi',
  'aj_magaling',
  'coolusername'
];

// Function to generate random score between min and max
function randomScore(min = 30, max = 300) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to generate random profile picture (1-20)
function randomProfilePic() {
  return `images/profiles/${Math.floor(Math.random() * 20) + 1}.png`;
}

async function seedUsers() {
  console.log('[SEED] Starting user seeding...');
  let successCount = 0;
  let errorCount = 0;

  const batch = db.batch();
  
  usernames.forEach((username, index) => {
    const userId = `seeduser_${index}_${Date.now()}`;
    const userRef = db.collection('users').doc(userId);
    
    const userData = {
      uid: userId,
      email: `${username}@phy64life.test`,
      username: username,
      usernameLower: username.toLowerCase(),
      profilePicture: randomProfilePic(),
      highScore: randomScore(30, 300),
      completedProblems: [],
      friends: [],
      createdAt: new Date().toISOString(),
      lastSession: new Date().toISOString()
    };
    
    console.log('[SEED] Adding user:', { username, highScore: userData.highScore, uid: userId });
    batch.set(userRef, userData);
  });

  try {
    await batch.commit();
    console.log('[SEED] ✅ Successfully seeded', usernames.length, 'users!');
    process.exit(0);
  } catch (error) {
    console.error('[SEED] ❌ Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();
