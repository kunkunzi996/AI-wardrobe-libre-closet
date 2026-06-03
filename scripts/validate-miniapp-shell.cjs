const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

const requiredFiles = [
  'project.config.json',
  'miniprogram/app.json',
  'miniprogram/app.wxss',
  'miniprogram/utils/api.js',
  'miniprogram/pages/wardrobe/index.json',
  'miniprogram/pages/wardrobe/index.wxml',
  'miniprogram/pages/wardrobe/index.wxss',
  'miniprogram/pages/wardrobe/index.js',
  'miniprogram/pages/garment-form/index.json',
  'miniprogram/pages/garment-form/index.wxml',
  'miniprogram/pages/garment-form/index.wxss',
  'miniprogram/pages/garment-form/index.js',
  'miniprogram/pages/garment-detail/index.json',
  'miniprogram/pages/garment-detail/index.wxml',
  'miniprogram/pages/garment-detail/index.wxss',
  'miniprogram/pages/garment-detail/index.js',
];

const jsonFiles = [
  'project.config.json',
  'miniprogram/app.json',
  'miniprogram/pages/wardrobe/index.json',
  'miniprogram/pages/garment-form/index.json',
  'miniprogram/pages/garment-detail/index.json',
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
const expectedPages = [
  'pages/wardrobe/index',
  'pages/garment-form/index',
  'pages/garment-detail/index',
];
if (!Array.isArray(appJson.pages)) {
  throw new Error('miniprogram/app.json must define pages');
}

for (const page of expectedPages) {
  if (!appJson.pages.includes(page)) {
    throw new Error(`miniprogram/app.json must include ${page}`);
  }
}

if (appJson.pages[0] !== 'pages/wardrobe/index') {
  throw new Error('miniprogram/app.json must open the native wardrobe page first');
}

const apiJs = readRequiredFile('miniprogram/utils/api.js');
const apiBaseMatch = apiJs.match(/API_BASE_URL\s*=\s*['"]([^'"]+)['"]/);
if (!apiBaseMatch) {
  throw new Error('miniprogram/utils/api.js must configure API_BASE_URL');
}

if (apiBaseMatch[1] !== 'https://aimatchwear.asia') {
  throw new Error('API_BASE_URL must be https://aimatchwear.asia');
}

const wardrobeWxml = readRequiredFile('miniprogram/pages/wardrobe/index.wxml');
if (!wardrobeWxml.includes('garments') || !wardrobeWxml.includes('goToAdd')) {
  throw new Error('wardrobe page must render garments and expose goToAdd');
}

const formWxml = readRequiredFile('miniprogram/pages/garment-form/index.wxml');
if (!formWxml.includes('choosePhoto') || !formWxml.includes('submitGarment')) {
  throw new Error('garment form page must choose a photo and submit a garment');
}

const detailWxml = readRequiredFile('miniprogram/pages/garment-detail/index.wxml');
if (!detailWxml.includes('garment') || !detailWxml.includes('deleteGarment')) {
  throw new Error('garment detail page must render garment data and delete action');
}

console.log('Native mini-program validation passed.');
