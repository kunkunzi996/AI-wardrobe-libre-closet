const path = require('node:path');
const fs = require('node:fs');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '..');
const entry = path.join(root, 'views', 'assets', 'src-sw.ts');

esbuild.buildSync({
  absWorkingDir: root,
  nodePaths: [path.join(root, 'node_modules')],
  stdin: {
    contents: fs.readFileSync(entry, 'utf8'),
    resolveDir: root,
    sourcefile: 'views/assets/src-sw.ts',
    loader: 'ts',
  },
  outfile: path.join(root, 'views', 'assets', 'src-sw.js'),
  bundle: true,
});
