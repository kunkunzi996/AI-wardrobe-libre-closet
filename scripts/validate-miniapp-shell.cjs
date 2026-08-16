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
  'miniprogram/pages/outfit/index.wxml',
  'miniprogram/pages/outfit/index.js',
  'miniprogram/pages/admin-inventory/index.wxml',
  'miniprogram/pages/admin-inventory/index.wxss',
  'miniprogram/pages/admin-inventory/index.js',
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
  'pages/admin-inventory/index',
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
if (!apiJs.includes('backfillAdminUserGarmentTags')) {
  throw new Error('api.js must expose the administrator tag backfill request');
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

const adminInventoryWxml = readRequiredFile(
  'miniprogram/pages/admin-inventory/index.wxml',
);
const adminInventoryJs = readRequiredFile(
  'miniprogram/pages/admin-inventory/index.js',
);
if (
  !adminInventoryWxml.includes('AI补标签') ||
  !adminInventoryWxml.includes('backfillUserTags') ||
  !adminInventoryWxml.includes('backfillResult')
) {
  throw new Error(
    'admin inventory page must render the AI tag backfill action and result dialog',
  );
}
if (
  !adminInventoryJs.includes('backfillAdminUserGarmentTags') ||
  !adminInventoryJs.includes('closeBackfillResult') ||
  !adminInventoryJs.includes('showActionSheet') ||
  !adminInventoryJs.includes('confirmBackfill')
) {
  throw new Error(
    'admin inventory page must select, confirm, and close the tag backfill workflow',
  );
}

let adminInventoryPage;
global.Page = function (definition) {
  adminInventoryPage = definition;
};
require(path.join(root, 'miniprogram/pages/admin-inventory/index.js'));
delete global.Page;

const originalWx = global.wx;
let actionSheetOptions;
const selectedBackfillRuns = [];
const adminInventoryContext = {
  data: {
    backfillingUserId: null,
    users: [{ id: 3, displayName: '老婆账号', garmentCount: 143 }],
  },
  confirmBackfill(userId, displayName, garmentCount, limit) {
    selectedBackfillRuns.push({ userId, displayName, garmentCount, limit });
  },
};

function selectBackfillLimit(tapIndex) {
  actionSheetOptions = null;
  adminInventoryPage.backfillUserTags.call(adminInventoryContext, {
    currentTarget: { dataset: { id: 3 } },
  });

  if (!actionSheetOptions || typeof actionSheetOptions.success !== 'function') {
    throw new Error(
      'admin inventory page must show a selectable backfill action sheet',
    );
  }

  actionSheetOptions.success({ tapIndex });
  return selectedBackfillRuns.pop();
}

try {
  global.wx = {
    showActionSheet(options) {
      actionSheetOptions = options;
    },
  };

  for (const [tapIndex, expectedLimit] of [
    [0, 1],
    [undefined, 1],
    [1, 3],
  ]) {
    const selectedRun = selectBackfillLimit(tapIndex);
    if (
      !selectedRun ||
      selectedRun.userId !== 3 ||
      selectedRun.garmentCount !== 143 ||
      selectedRun.limit !== expectedLimit
    ) {
      throw new Error(
        `admin inventory backfill selection must use limit ${expectedLimit} for tapIndex ${tapIndex}`,
      );
    }
  }
} finally {
  if (originalWx === undefined) {
    delete global.wx;
  } else {
    global.wx = originalWx;
  }
}

const weatherContractFailures = [];
function requireWeatherContract(condition, message) {
  if (!condition) weatherContractFailures.push(message);
}

requireWeatherContract(
  Array.isArray(appJson.requiredPrivateInfos) &&
    appJson.requiredPrivateInfos.includes('getLocation'),
  'app.json must declare getLocation in requiredPrivateInfos',
);
const locationPermission =
  appJson.permission && appJson.permission['scope.userLocation'];
requireWeatherContract(
  locationPermission &&
    typeof locationPermission.desc === 'string' &&
    /天气|城市|穿搭/.test(locationPermission.desc),
  'app.json must explain that location is used for weather-based outfit recommendations',
);

const recommendOutfitMatch = apiJs.match(
  /recommendOutfit\s*:\s*function\s*\(([^)]*)\)\s*\{([\s\S]*?)\n\s*\},\n\s*submitOutfitFeedback/,
);
const recommendOutfitParameters = recommendOutfitMatch
  ? recommendOutfitMatch[1]
      .split(',')
      .map(function (parameter) {
        return parameter.trim();
      })
      .filter(Boolean)
  : [];
const weatherParameter = recommendOutfitParameters[2];
requireWeatherContract(
  Boolean(recommendOutfitMatch && weatherParameter),
  'api.recommendOutfit must accept a weather request object',
);
requireWeatherContract(
  Boolean(
    recommendOutfitMatch &&
      weatherParameter &&
      new RegExp(
        `data\\.weather\\s*=\\s*${weatherParameter.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&',
        )}`,
      ).test(recommendOutfitMatch[2]),
  ),
  'api.recommendOutfit must include weather in the current recommendation payload',
);

const outfitJs = readRequiredFile('miniprogram/pages/outfit/index.js');
const outfitWxml = readRequiredFile('miniprogram/pages/outfit/index.wxml');
requireWeatherContract(
  /wx\.getLocation\s*\(\s*\{[\s\S]*?type\s*:\s*['"]gcj02['"]/.test(
    outfitJs,
  ),
  'outfit page must request gcj02 location for automatic weather mode',
);
requireWeatherContract(
  /recommendOutfit\s*\(\s*requestText\s*,[\s\S]*?,[\s\S]*?weather/.test(
    outfitJs,
  ),
  'outfit page must send the current weather request to api.recommendOutfit',
);

let outfitPage;
global.Page = function (definition) {
  outfitPage = definition;
};
require(path.join(root, 'miniprogram/pages/outfit/index.js'));
delete global.Page;

requireWeatherContract(
  outfitPage && typeof outfitPage.saveWeatherPreference === 'function',
  'outfit page must expose saveWeatherPreference for device-local mode and city storage',
);
if (outfitPage && typeof outfitPage.saveWeatherPreference === 'function') {
  const storedPreferences = [];
  const previousWx = global.wx;
  try {
    global.wx = {
      setStorageSync(key, value) {
        storedPreferences.push({ key, value });
      },
    };
    outfitPage.saveWeatherPreference({
      mode: 'auto',
      latitude: 31.2304,
      longitude: 121.4737,
    });
    outfitPage.saveWeatherPreference({
      mode: 'manual',
      city: '杭州市',
      latitude: 30.2741,
      longitude: 120.1551,
    });
  } finally {
    if (previousWx === undefined) {
      delete global.wx;
    } else {
      global.wx = previousWx;
    }
  }

  requireWeatherContract(
    storedPreferences.length === 2 &&
      JSON.stringify(storedPreferences[0].value) ===
        JSON.stringify({ mode: 'auto' }) &&
      JSON.stringify(storedPreferences[1].value) ===
        JSON.stringify({ mode: 'manual', city: '杭州市' }),
    'weather preferences must store only {mode} or {mode, city}, never coordinates',
  );
}

for (const label of ['自动定位', '手动城市']) {
  requireWeatherContract(
    outfitWxml.includes(label),
    `outfit page must render the ${label} weather mode`,
  );
}
requireWeatherContract(
  /当前温度/.test(outfitWxml) && /未来\s*8\s*小时|未来八小时/.test(outfitWxml),
  'outfit page must render the current temperature and future eight-hour basis',
);
requireWeatherContract(
  outfitWxml.includes('本次未使用实时温度'),
  'outfit page must render the real-time temperature degradation message',
);

if (weatherContractFailures.length > 0) {
  throw new Error(
    `Weather outfit contract is not implemented:\n- ${weatherContractFailures.join(
      '\n- ',
    )}`,
  );
}

console.log('Native mini-program validation passed.');
