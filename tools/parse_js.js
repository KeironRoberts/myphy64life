const fs = require('fs');
const path = 'c:/research p6/research p6/game/problemSolver.js';
let src = fs.readFileSync(path, 'utf8');
// Remove any import/export lines to allow parsing in Function
src = src
  .split('\n')
  .filter((l) => !l.trim().startsWith('import'))
  .map((l) => l.replace(/^\s*export\s+class\s+/, 'class '))
  .join('\n');
const lines = src.split('\n');
let acc = '';
for (let i = 0; i < lines.length; i++) {
  acc += lines[i] + '\n';
  try {
    new Function(acc);
  } catch (e) {
    console.error('Parse error at line', i + 1, e.message);
    // print a few surrounding lines for context
    for (let j = Math.max(0, i - 3); j <= Math.min(lines.length - 1, i + 3); j++) {
      console.error((j + 1).toString().padStart(4) + ':', lines[j]);
    }
    process.exit(1);
  }
}
console.log('Parsed OK (no SyntaxError detected by Function parser)');
