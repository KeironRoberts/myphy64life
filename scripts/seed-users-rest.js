// seed-users-rest.js - Seed users using Firestore REST API
// Run with: node seed-users-rest.js

const https = require('https');

const PROJECT_ID = 'phy64life';
const API_KEY = 'AIzaSyDDK896yGwYWp6UAZ7tveF-F4BINJ-eLlc'; // From firebase-config.js

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

function randomScore(min = 30, max = 300) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomProfilePic() {
  return `images/profiles/${Math.floor(Math.random() * 20) + 1}.png`;
}

function addUserViaREST(username, index) {
  return new Promise((resolve, reject) => {
    const userId = `seeduser_${index}_${Date.now()}`;
    const highScore = randomScore(30, 300);
    const profilePic = randomProfilePic();
    
    const documentData = {
      uid: { stringValue: userId },
      email: { stringValue: `${username}@phy64life.test` },
      username: { stringValue: username },
      usernameLower: { stringValue: username.toLowerCase() },
      profilePicture: { stringValue: profilePic },
      highScore: { integerValue: highScore },
      completedProblems: { arrayValue: { values: [] } },
      friends: { arrayValue: { values: [] } },
      createdAt: { timestampValue: new Date().toISOString() },
      lastSession: { timestampValue: new Date().toISOString() }
    };

    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${userId}?key=${API_KEY}`;
    
    const options = {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`✅ Added user: ${username} (Score: ${highScore}, ID: ${userId})`);
          resolve();
        } else {
          console.error(`❌ Failed to add ${username}:`, res.statusCode, data);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify({
      fields: documentData
    }));
    req.end();
  });
}

async function seedAllUsers() {
  console.log('[SEED] Starting user seeding with Firestore REST API...\n');
  
  for (let i = 0; i < usernames.length; i++) {
    try {
      await addUserViaREST(usernames[i], i);
      // Add small delay between requests
      await new Promise(r => setTimeout(r, 500));
    } catch (error) {
      console.error(`Error adding ${usernames[i]}:`, error.message);
    }
  }
  
  console.log('\n[SEED] ✅ Seeding complete!');
  process.exit(0);
}

seedAllUsers().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
