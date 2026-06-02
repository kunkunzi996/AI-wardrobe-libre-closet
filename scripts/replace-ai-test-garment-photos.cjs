const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const Database = require('better-sqlite3');
const sharp = require('sharp');

const garmentNames = [
  'AI测试 白色基础T恤',
  'AI测试 蓝色牛津衬衫',
  'AI测试 黑色针织背心',
  'AI测试 米色真丝衬衫',
  'AI测试 绿色短袖Polo',
  'AI测试 灰色高领毛衣',
  'AI测试 黑色直筒西裤',
  'AI测试 浅蓝直筒牛仔裤',
  'AI测试 米白阔腿裤',
  'AI测试 卡其工装裤',
  'AI测试 黑色A字半裙',
  'AI测试 棕色百褶半裙',
  'AI测试 米色短风衣',
  'AI测试 黑色西装外套',
  'AI测试 牛仔夹克',
  'AI测试 奶白羽绒服',
  'AI测试 军绿色派克外套',
  'AI测试 驼色羊毛大衣',
  'AI测试 黑色针织连衣裙',
  'AI测试 蓝色衬衫裙',
  'AI测试 印花吊带裙',
  'AI测试 小白鞋',
  'AI测试 黑色乐福鞋',
  'AI测试 棕色短靴',
  'AI测试 银色凉鞋',
  'AI测试 黑色通勤托特包',
  'AI测试 米色小方包',
  'AI测试 红色棒球帽',
  'AI测试 灰色羊毛围巾',
  'AI测试 金色细腰带',
];

async function main() {
  const sheetPaths = process.argv.slice(2);
  if (sheetPaths.length !== 3) {
    throw new Error(
      'Usage: node scripts/replace-ai-test-garment-photos.cjs <sheet-1.png> <sheet-2.png> <sheet-3.png>',
    );
  }

  const root = process.cwd();
  const dataDir = path.join(root, 'data');
  const db = new Database(path.join(dataDir, 'sqlite3.db'));
  const insertFile = db.prepare(`
    insert into file (shareable_id, flagged, banned, file_name, mimetype, created_on, created_by_id)
    values (?, null, null, ?, ?, ?, null)
  `);
  const updateGarment = db.prepare(`
    update garment set photo_id = ? where name = ?
  `);
  const findGarment = db.prepare(`
    select id from garment where name = ?
  `);

  const now = new Date().toISOString();
  let index = 0;

  for (const sheetPath of sheetPaths) {
    const source = path.resolve(sheetPath);
    const meta = await sharp(source).metadata();
    if (!meta.width || !meta.height) {
      throw new Error(`Cannot read image dimensions: ${source}`);
    }

    const cellWidth = Math.floor(meta.width / 5);
    const cellHeight = Math.floor(meta.height / 2);

    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        const garmentName = garmentNames[index];
        if (!garmentName) break;
        if (!findGarment.get(garmentName)) {
          throw new Error(`Missing garment: ${garmentName}`);
        }

        const fileName = `${randomUUID()}.webp`;
        const filePath = path.join(dataDir, fileName);
        await sharp(source)
          .extract({
            left: col * cellWidth,
            top: row * cellHeight,
            width: col === 4 ? meta.width - col * cellWidth : cellWidth,
            height: row === 1 ? meta.height - row * cellHeight : cellHeight,
          })
          .resize(1080, 1080, {
            fit: 'inside',
            background: '#ffffff',
            withoutEnlargement: true,
          })
          .flatten({ background: '#ffffff' })
          .webp({ quality: 96 })
          .toFile(filePath);

        const fileResult = insertFile.run(
          randomUUID(),
          fileName,
          'image/webp',
          now,
        );
        updateGarment.run(fileResult.lastInsertRowid, garmentName);
        index += 1;
      }
    }
  }

  console.log(`updated=${index}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
