const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const failures = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push('missing file: ' + relativePath);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function requireText(content, snippet, message) {
  if (!content.includes(snippet)) {
    failures.push(message);
  }
}

const apiJs = read('miniprogram/utils/api.js');
const pageJs = read('miniprogram/pages/admin-inventory/index.js');
const pageWxml = read('miniprogram/pages/admin-inventory/index.wxml');

requireText(
  apiJs,
  'setAdminAcceptanceSandbox',
  'api.js must export setAdminAcceptanceSandbox',
);
requireText(
  apiJs,
  '/api/miniapp/admin/users/',
  'api.js must call the admin user sandbox path',
);
requireText(
  apiJs,
  'acceptance-sandbox',
  'api.js must call POST /api/miniapp/admin/users/:id/acceptance-sandbox',
);
requireText(
  apiJs,
  'previewAdminWardrobeCopy',
  'api.js must export previewAdminWardrobeCopy',
);
requireText(
  apiJs,
  '/api/miniapp/admin/wardrobe-copy/preview',
  'api.js must call GET /api/miniapp/admin/wardrobe-copy/preview',
);
requireText(
  apiJs,
  'copyAdminWardrobe',
  'api.js must export copyAdminWardrobe',
);
requireText(
  apiJs,
  '/api/miniapp/admin/wardrobe-copy',
  'api.js must call POST /api/miniapp/admin/wardrobe-copy',
);

requireText(
  pageJs,
  'setAdminAcceptanceSandbox',
  'admin inventory page must call setAdminAcceptanceSandbox',
);
requireText(
  pageJs,
  'previewAdminWardrobeCopy',
  'admin inventory page must call previewAdminWardrobeCopy',
);
requireText(
  pageJs,
  'copyAdminWardrobe',
  'admin inventory page must call copyAdminWardrobe',
);
requireText(
  pageJs,
  'overwrite',
  'admin inventory page must pass overwrite when replacing an existing sandbox copy',
);
requireText(
  pageJs,
  'showModal',
  'admin inventory page must confirm copy counts before writing',
);

requireText(
  pageWxml,
  '验收沙盒',
  'admin inventory page must render an acceptance sandbox mark',
);
requireText(
  pageWxml,
  'sourceUserId',
  'admin inventory page must let the admin choose a source wardrobe',
);
requireText(
  pageWxml,
  'targetUserId',
  'admin inventory page must let the admin choose a sandbox target',
);
requireText(
  pageWxml,
  'garmentCount',
  'admin inventory page must show preview garment counts',
);
requireText(
  pageWxml,
  'copyResult',
  'admin inventory page must show whether the copy is complete',
);

if (pageJs.includes('正式启用') || pageWxml.includes('正式启用')) {
  failures.push(
    'admin inventory copy success copy must not announce official recommendation enablement',
  );
}

if (failures.length > 0) {
  throw new Error(
    'Admin wardrobe copy page contract is not implemented:\n- ' +
      failures.join('\n- '),
  );
}

console.log('Admin wardrobe copy page validation passed.');
