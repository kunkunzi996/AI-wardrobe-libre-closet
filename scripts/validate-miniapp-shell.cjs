const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

const requiredFiles = [
  'project.config.json',
  'miniprogram/app.json',
  'miniprogram/app.wxss',
  'miniprogram/pages/webview/index.json',
  'miniprogram/pages/webview/index.wxml',
  'miniprogram/pages/webview/index.wxss',
  'miniprogram/pages/webview/index.js',
  'docs/wechat-miniapp-webview.md',
];

const jsonFiles = [
  'project.config.json',
  'miniprogram/app.json',
  'miniprogram/pages/webview/index.json',
];

function readRequiredFile(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }

  return fs.readFileSync(absolutePath, 'utf8');
}

function parseJson(relativePath) {
  const content = readRequiredFile(relativePath);

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON in ${relativePath}: ${error.message}`);
  }
}

for (const file of requiredFiles) {
  readRequiredFile(file);
}

for (const file of jsonFiles) {
  parseJson(file);
}

const projectConfig = parseJson('project.config.json');
if (projectConfig.miniprogramRoot !== 'miniprogram/') {
  throw new Error('project.config.json must set miniprogramRoot to "miniprogram/"');
}

if (!projectConfig.appid) {
  throw new Error('project.config.json must contain an appid value');
}

const appJson = parseJson('miniprogram/app.json');
if (!Array.isArray(appJson.pages) || !appJson.pages.includes('pages/webview/index')) {
  throw new Error('miniprogram/app.json must include pages/webview/index');
}

const wxml = readRequiredFile('miniprogram/pages/webview/index.wxml');
if (!wxml.includes('<web-view') || !wxml.includes('targetUrl')) {
  throw new Error('miniprogram/pages/webview/index.wxml must render a web-view bound to targetUrl');
}

const pageJs = readRequiredFile('miniprogram/pages/webview/index.js');
if (!pageJs.includes('WEB_APP_URL') || !pageJs.includes('targetUrl')) {
  throw new Error('miniprogram/pages/webview/index.js must define WEB_APP_URL and expose targetUrl');
}

console.log('Mini-program shell validation passed.');
