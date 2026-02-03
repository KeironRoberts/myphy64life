const fs = require('fs');
const { execSync } = require('child_process');
const lines = fs.readFileSync('game/problemSolver.js','utf8').split('\n');
let lo = 1, hi = lines.length, ans = hi+1;
while (lo <= hi) {
  const mid = Math.floor((lo+hi)/2);
  const prefix = lines.slice(0, mid).join('\n') + '\nexport {}\n';
  fs.writeFileSync('game/tmp_prefix.js', prefix, 'utf8');
  try {
    execSync('npx tsc --noEmit --allowJs --checkJs game/tmp_prefix.js', { stdio: 'ignore' });
    // prefix is OK
    lo = mid + 1;
  } catch (e) {
    ans = mid;
    hi = mid - 1;
  }
}
console.log('first failing line approx', ans, 'of', lines.length);
console.log('Context around that line:');
const start = Math.max(0, ans-10);
const end = Math.min(lines.length, ans+10);
console.log(lines.slice(start, end).map((l, i) => `${start + i + 1}: ${l}`).join('\n'));
