const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const hasNonAscii = /[^\x00-\x7F]/.test(root);

function runGenerate(cwd) {
  if (process.platform === 'win32') {
    execFileSync('cmd.exe', ['/d', '/s', '/c', 'npm.cmd run generate:sw:mapped'], {
      cwd,
      stdio: 'inherit',
    });
    return;
  }

  execFileSync('npm', ['run', 'generate:sw:mapped'], {
    cwd,
    stdio: 'inherit',
  });
}

if (process.platform !== 'win32' || !hasNonAscii) {
  runGenerate(root);
  process.exit(0);
}

const drive = ['Z', 'Y', 'X', 'W', 'V'].find(
  (candidate) => !fs.existsSync(`${candidate}:\\`),
);

if (!drive) {
  throw new Error('No free temporary drive letter is available for service worker build.');
}

execFileSync('subst', [`${drive}:`, root], { stdio: 'inherit' });

try {
  runGenerate(`${drive}:\\`);
} finally {
  execFileSync('subst', [`${drive}:`, '/D'], { stdio: 'inherit' });
}
