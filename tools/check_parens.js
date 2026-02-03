const fs = require('fs');
const p = 'c:/research p6/research p6/game/problemSolver.js';
const s = fs.readFileSync(p, 'utf8');
let inSingle = false,
  inDouble = false,
  inBack = false,
  inLineComment = false,
  inBlockComment = false;
let open = 0;
let line = 1;
for (let i = 0; i < s.length; i++) {
  const c = s[i],
    n = s[i + 1];
  if (c === '\n') {
    line++;
    if (inLineComment) inLineComment = false;
  }
  if (inLineComment) continue;
  if (inBlockComment) {
    if (c === '*' && n === '/') {
      inBlockComment = false;
      i++;
    }
    continue;
  }
  if (!inSingle && !inDouble && !inBack && c === '/' && n === '/') {
    inLineComment = true;
    i++;
    continue;
  }
  if (!inSingle && !inDouble && !inBack && c === '/' && n === '*') {
    inBlockComment = true;
    i++;
    continue;
  }
  if (!inDouble && !inBack && c == "'") {
    inSingle = !inSingle;
    continue;
  }
  if (!inSingle && !inBack && c == '"') {
    inDouble = !inDouble;
    continue;
  }
  if (!inSingle && !inDouble && c == '`') {
    inBack = !inBack;
    continue;
  }
  if (inSingle || inDouble || inBack) continue;
  if (c === '(') open++;
  if (c === ')') open--;
}
console.log('net parentheses count (ignoring strings/comments):', open);
if (open !== 0) console.log('Unbalanced parentheses detected');
else console.log('Parentheses appear balanced (ignoring strings/comments)');
