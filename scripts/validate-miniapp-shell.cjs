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
  'miniprogram/pages/edit-outfit/index.json',
  'miniprogram/pages/edit-outfit/index.wxml',
  'miniprogram/pages/edit-outfit/index.wxss',
  'miniprogram/pages/edit-outfit/index.js',
];

const jsonFiles = [
  'project.config.json',
  'miniprogram/app.json',
  'miniprogram/pages/wardrobe/index.json',
  'miniprogram/pages/garment-form/index.json',
  'miniprogram/pages/garment-detail/index.json',
  'miniprogram/pages/edit-outfit/index.json',
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
  'pages/edit-outfit/index',
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
if (!wardrobeWxml.includes('retryLoad')) {
  throw new Error('wardrobe page must expose retryLoad for server connection failures');
}

const formWxml = readRequiredFile('miniprogram/pages/garment-form/index.wxml');
const formJs = readRequiredFile('miniprogram/pages/garment-form/index.js');
if (!formWxml.includes('choosePhoto') || !formWxml.includes('submitGarment')) {
  throw new Error('garment form page must choose a photo and submit a garment');
}
if (
  !formWxml.includes('toggleFieldGroup') ||
  !formWxml.includes('toggleFieldOption') ||
  !formWxml.includes('fieldGroups')
) {
  throw new Error('garment form page must expose collapsible field selectors');
}
for (const tagGroup of ['天气', '色彩感觉', '穿着感', '长度', '版型']) {
  if (!formJs.includes(tagGroup)) {
    throw new Error(`garment form page must render the ${tagGroup} tag group`);
  }
}
if (!formWxml.includes('toggleTaxonomyTag')) {
  throw new Error('garment form taxonomy tags must be selectable');
}

let garmentFormPage;
global.Page = function (definition) {
  garmentFormPage = definition;
};
require(path.join(root, 'miniprogram/pages/garment-form/index.js'));
delete global.Page;

const taxonomyToggleContext = {
  data: {
    form: { taxonomyTags: '{}' },
    editableTaxonomyGroups: [
      {
        key: 'fit',
        label: '版型',
        tags: ['修身', '宽松'],
        options: [
          { label: '修身', selected: false },
          { label: '宽松', selected: false },
        ],
      },
    ],
  },
  setData(nextData) {
    if (nextData['form.taxonomyTags']) {
      this.data.form.taxonomyTags = nextData['form.taxonomyTags'];
    }
    if (nextData.editableTaxonomyGroups) {
      this.data.editableTaxonomyGroups = nextData.editableTaxonomyGroups;
    }
  },
};
garmentFormPage.toggleTaxonomyTag.call(taxonomyToggleContext, {
  currentTarget: { dataset: { group: 'fit', tag: '宽松' } },
});
const selectedTaxonomy = JSON.parse(
  taxonomyToggleContext.data.form.taxonomyTags,
);
if (!selectedTaxonomy.fit || !selectedTaxonomy.fit.includes('宽松')) {
  throw new Error('selected garment taxonomy tags must be included in form data');
}

const detailWxml = readRequiredFile('miniprogram/pages/garment-detail/index.wxml');
if (!detailWxml.includes('garment') || !detailWxml.includes('deleteGarment')) {
  throw new Error('garment detail page must render garment data and delete action');
}
if (
  !detailWxml.includes('goBackToWardrobe') ||
  !detailWxml.includes('reloadGarment')
) {
  throw new Error('garment detail page must expose wardrobe navigation and reload actions');
}

const editOutfitWxml = readRequiredFile('miniprogram/pages/edit-outfit/index.wxml');
if (
  !editOutfitWxml.includes('修改穿搭') ||
  !editOutfitWxml.includes('choosePhoto') ||
  !editOutfitWxml.includes('save')
) {
  throw new Error('edit outfit page must render edit title, photo picker, and save action');
}

console.log('Native mini-program validation passed.');
