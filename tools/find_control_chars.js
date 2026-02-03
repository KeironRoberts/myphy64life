const fs = require('fs');
const s = fs.readFileSync('game/problemSolver.js','utf8');
let line = 1;
for (let i = 0; i < s.length; i++) {
  const c = s.charCodeAt(i);
  if (s[i] === '\n') { line++; continue; }
  if (c < 32 && c !== 9 && c !== 10 && c !== 13) {
    console.log('Line', line, 'col', i, 'charCode', c, JSON.stringify(s[i]));
  }
}
console.log('done');
