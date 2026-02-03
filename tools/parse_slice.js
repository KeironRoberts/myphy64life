const fs = require('fs');
const p = 'c:/research p6/research p6/game/problemSolver.js';
const s = fs.readFileSync(p, 'utf8').split('\n');
const a = 820 - 1,
  b = 1010 - 1;
let slice = s.slice(a, b + 1).join('\n');
slice = slice.replace(/^\s*}/, ''); // remove leading closing brace if present to embed slice correctly within a class bodyconst code='class Dummy {\n'+slice+'\n}';try{new Function(code);console.log('slice parsed OK')}catch(e){console.error('slice parse error:',e.message);const lines=code.split('\n');for(let i=0;i<lines.length;i++){console.error((i+1).toString().padStart(4)+':',lines[i]);if(i>30) break}};
