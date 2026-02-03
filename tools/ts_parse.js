const ts = require('typescript');
const fs = require('fs');
const path = 'c:/research p6/research p6/game/problemSolver.js';
const src = fs.readFileSync(path, 'utf8');
const sf = ts.createSourceFile(path, src, ts.ScriptTarget.ES2020, true, ts.ScriptKind.JS);
const diagnostics = ts.getPreEmitDiagnostics(sf);
if (diagnostics.length === 0) {
  console.log('No syntax diagnostics (TS parser OK)');
} else {
  diagnostics.forEach((d) => {
    const { line, character } = sf.getLineAndCharacterOfPosition(d.start || 0);
    console.error(`Diag: ${d.messageText} at ${line + 1}:${character + 1}`);
  });
}
