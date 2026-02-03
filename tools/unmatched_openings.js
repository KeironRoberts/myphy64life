const fs = require('fs');
const s = fs.readFileSync('game/problemSolver.js','utf8');
let line = 1;
let inSq = false, inDq = false, inBt = false, inLine = false, inBlock = false;
let stack = [];
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
  if (inSq || inDq) continue; // ignore braces inside quotes

  if (c === '{') stack.push({line, i});
  if (c === '}') {
    if (stack.length) stack.pop();
    else console.log('Unmatched closing } at line', line, 'pos', i);
  }
}
console.log('Remaining unmatched openings:', stack.length);
stack.forEach((sObj, idx) => {
  const { line, i } = sObj;
  const lines = fs.readFileSync('game/problemSolver.js','utf8').split('\n');
  const context = lines.slice(Math.max(0, line-3), line+2).map((l,n)=>`${line-2+n}: ${l}`);
  console.log('--- Opening #' + (idx+1) + ' at line', line, '\n', context.join('\n'));
});
