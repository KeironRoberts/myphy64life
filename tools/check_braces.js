const fs = require('fs');
const s = fs.readFileSync('game/problemSolver.js','utf8');
let line = 1;
let inSq = false, inDq = false, inBt = false, inLine = false, inBlock = false;
let braces = [];
for (let i = 0; i < s.length; i++) {
  const c = s[i];
  const n = s[i + 1];
  if (c === '\n') { line++; inLine = false; continue; }
  if (inLine) { if (c === '\n') inLine = false; }
  if (inBlock) { if (c === '*' && n === '/') { inBlock = false; i++; } continue; }
  if (!inSq && !inDq && !inBt && c === '/' && n === '/') { inLine = true; i++; continue; }
  if (!inSq && !inDq && !inBt && c === '/' && n === '*') { inBlock = true; i++; continue; }
  if (!inDq && !inBt && c === "'") { inSq = !inSq; continue; }
  if (!inSq && !inBt && c === '"') { inDq = !inDq; continue; }
  if (!inSq && !inDq && c === '`') { inBt = !inBt; continue; }
  if (inSq || inDq || inBt) continue;
  if (c === '{') braces.push({ type: '{', line });
  if (c === '}') braces.push({ type: '}', line });
}
let balance = 0;
for (let i = 0; i < braces.length; i++) {
  const b = braces[i];
  if (b.type === '{') balance++; else balance--;
  if (balance < 0) { console.log('Extra } at', b.line, 'index', i); balance = 0; }
}
console.log('final balance', balance);
console.log('Last 40 brace events:');
console.log(braces.slice(-40).map((b, i) => `${i + 1}: ${b.type} @ line ${b.line}`).join('\n'));
