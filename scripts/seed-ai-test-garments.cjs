const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const Database = require('better-sqlite3');
const sharp = require('sharp');

const root = process.cwd();
const dataDir = path.join(root, 'data');
const dbPath = path.join(dataDir, 'sqlite3.db');

const garments = [
  ['AI测试 白色基础T恤', 'tops', 'white', 't-shirt', ['spring', 'summer'], ['casual', 'basic'], ['daily', 'travel'], 'cotton', 'thin', 'regular'],
  ['AI测试 蓝色牛津衬衫', 'tops', 'blue', 'shirt', ['spring', 'autumn'], ['business', 'classic'], ['commute', 'meeting'], 'cotton', 'thin', 'regular'],
  ['AI测试 黑色针织背心', 'tops', 'black', 'knit vest', ['spring', 'autumn', 'winter'], ['minimal', 'layering'], ['daily', 'commute'], 'knit', 'medium', 'slim'],
  ['AI测试 米色真丝衬衫', 'tops', 'beige', 'blouse', ['spring', 'summer'], ['elegant', 'soft'], ['date', 'office'], 'silk', 'thin', 'loose'],
  ['AI测试 绿色短袖Polo', 'tops', 'green', 'polo', ['spring', 'summer'], ['sporty', 'casual'], ['daily', 'outdoor'], 'cotton', 'thin', 'regular'],
  ['AI测试 灰色高领毛衣', 'tops', 'grey', 'turtleneck sweater', ['autumn', 'winter'], ['warm', 'minimal'], ['daily', 'commute'], 'wool blend', 'thick', 'regular'],
  ['AI测试 黑色直筒西裤', 'bottoms', 'black', 'straight trousers', ['spring', 'autumn', 'winter'], ['business', 'classic'], ['commute', 'meeting'], 'wool blend', 'medium', 'straight'],
  ['AI测试 浅蓝直筒牛仔裤', 'bottoms', 'blue', 'straight jeans', ['spring', 'summer', 'autumn'], ['casual', 'denim'], ['daily', 'travel'], 'denim', 'medium', 'straight'],
  ['AI测试 米白阔腿裤', 'bottoms', 'white', 'wide-leg pants', ['spring', 'summer'], ['relaxed', 'elegant'], ['daily', 'date'], 'linen blend', 'thin', 'loose'],
  ['AI测试 卡其工装裤', 'bottoms', 'beige', 'cargo pants', ['spring', 'autumn'], ['utility', 'casual'], ['outdoor', 'travel'], 'cotton twill', 'medium', 'loose'],
  ['AI测试 黑色A字半裙', 'bottoms', 'black', 'a-line skirt', ['spring', 'summer', 'autumn'], ['feminine', 'classic'], ['date', 'office'], 'polyester', 'thin', 'regular'],
  ['AI测试 棕色百褶半裙', 'bottoms', 'brown', 'pleated skirt', ['autumn', 'winter'], ['retro', 'soft'], ['daily', 'date'], 'wool blend', 'medium', 'regular'],
  ['AI测试 米色短风衣', 'outerwear', 'beige', 'trench coat', ['spring', 'autumn'], ['classic', 'business'], ['commute', 'travel'], 'cotton blend', 'medium', 'regular'],
  ['AI测试 黑色西装外套', 'outerwear', 'black', 'blazer', ['spring', 'autumn', 'winter'], ['business', 'formal'], ['meeting', 'commute'], 'wool blend', 'medium', 'regular'],
  ['AI测试 牛仔夹克', 'outerwear', 'blue', 'denim jacket', ['spring', 'autumn'], ['casual', 'denim'], ['daily', 'travel'], 'denim', 'medium', 'regular'],
  ['AI测试 奶白羽绒服', 'outerwear', 'white', 'puffer jacket', ['winter'], ['warm', 'casual'], ['daily', 'outdoor'], 'polyester', 'thick', 'loose'],
  ['AI测试 军绿色派克外套', 'outerwear', 'green', 'parka', ['autumn', 'winter'], ['outdoor', 'utility'], ['outdoor', 'travel'], 'nylon', 'thick', 'loose'],
  ['AI测试 驼色羊毛大衣', 'outerwear', 'brown', 'wool coat', ['autumn', 'winter'], ['elegant', 'classic'], ['commute', 'date'], 'wool', 'thick', 'regular'],
  ['AI测试 黑色针织连衣裙', 'dresses', 'black', 'knit dress', ['autumn', 'winter'], ['minimal', 'elegant'], ['date', 'office'], 'knit', 'medium', 'slim'],
  ['AI测试 蓝色衬衫裙', 'dresses', 'blue', 'shirt dress', ['spring', 'summer'], ['fresh', 'casual'], ['daily', 'travel'], 'cotton', 'thin', 'regular'],
  ['AI测试 印花吊带裙', 'dresses', 'pattern', 'floral dress', ['summer'], ['romantic', 'vacation'], ['date', 'travel'], 'viscose', 'thin', 'loose'],
  ['AI测试 小白鞋', 'footwear', 'white', 'sneakers', ['spring', 'summer', 'autumn'], ['casual', 'sporty'], ['daily', 'travel'], 'leather', 'medium', 'regular'],
  ['AI测试 黑色乐福鞋', 'footwear', 'black', 'loafers', ['spring', 'autumn'], ['classic', 'business'], ['commute', 'meeting'], 'leather', 'medium', 'regular'],
  ['AI测试 棕色短靴', 'footwear', 'brown', 'ankle boots', ['autumn', 'winter'], ['retro', 'classic'], ['daily', 'date'], 'leather', 'medium', 'regular'],
  ['AI测试 银色凉鞋', 'footwear', 'silver', 'sandals', ['summer'], ['light', 'vacation'], ['date', 'travel'], 'synthetic leather', 'thin', 'regular'],
  ['AI测试 黑色通勤托特包', 'bags', 'black', 'tote bag', ['spring', 'summer', 'autumn', 'winter'], ['business', 'minimal'], ['commute', 'meeting'], 'leather', 'medium', 'regular'],
  ['AI测试 米色小方包', 'bags', 'beige', 'crossbody bag', ['spring', 'summer', 'autumn'], ['elegant', 'soft'], ['date', 'daily'], 'leather', 'medium', 'regular'],
  ['AI测试 红色棒球帽', 'accessories', 'red', 'baseball cap', ['spring', 'summer'], ['sporty', 'street'], ['outdoor', 'travel'], 'cotton', 'thin', 'regular'],
  ['AI测试 灰色羊毛围巾', 'accessories', 'grey', 'scarf', ['autumn', 'winter'], ['warm', 'classic'], ['daily', 'commute'], 'wool', 'thick', 'regular'],
  ['AI测试 金色细腰带', 'accessories', 'gold', 'belt', ['spring', 'summer', 'autumn'], ['elegant', 'accent'], ['date', 'office'], 'metal leather', 'thin', 'regular'],
].map(([name, category, color, subcategory, seasons, styleTags, sceneTags, material, thickness, fit], index) => ({
  name,
  category,
  color,
  subcategory,
  seasons,
  styleTags,
  sceneTags,
  material,
  thickness,
  fit,
  index,
}));

const palette = {
  red: ['#c83238', '#7f1d1d'],
  pink: ['#f4a6b7', '#a33c5a'],
  orange: ['#f59e0b', '#9a3412'],
  yellow: ['#facc15', '#a16207'],
  green: ['#477b55', '#1f4d35'],
  blue: ['#6aa6d8', '#1f4d7a'],
  purple: ['#8b5cf6', '#4c1d95'],
  black: ['#1f2933', '#050505'],
  white: ['#f8fafc', '#cbd5e1'],
  grey: ['#9ca3af', '#4b5563'],
  beige: ['#d8c4a5', '#9a7b52'],
  brown: ['#9a6a3a', '#4a2a14'],
  gold: ['#d4af37', '#8a6f12'],
  silver: ['#d8dde3', '#8a96a3'],
  pattern: ['#84cc16', '#2563eb'],
};

function itemSvg(item) {
  const [fill, stroke] = palette[item.color] ?? ['#ddd', '#777'];
  const pattern = item.color === 'pattern';
  const common = `fill="${fill}" stroke="${stroke}" stroke-width="8" stroke-linejoin="round"`;
  const detail = `stroke="${stroke}" stroke-width="5" stroke-linecap="round" opacity=".55"`;
  const shapes = {
    tops: `<path ${common} d="M205 130 145 175 90 275 145 325 180 275v300h295V275l35 50 55-50-55-100-60-45-75 35H280l-75-35Z"/><path ${detail} d="M280 165c20 45 75 45 95 0M235 260h185M235 330h185"/>`,
    bottoms: `<path ${common} d="M220 120h215l25 455H335l-22-300-38 300H155l45-455Z"/><path ${detail} d="M235 170h185M313 195v330"/>`,
    outerwear: `<path ${common} d="M210 105 130 170 90 325l70 35 40-100v320h260V260l40 100 70-35-40-155-80-65-70 50H280l-70-50Z"/><path ${detail} d="M330 165v390M245 260h55M360 260h55"/>`,
    dresses: `<path ${common} d="M250 115h160l35 115 100 345H115l100-345 35-115Z"/><path ${detail} d="M280 145c18 34 82 34 100 0M210 300h240"/>`,
    footwear: `<path ${common} d="M120 390c120 5 145-20 210-75 60 45 110 70 205 76 34 2 55 30 45 66-8 29-38 43-82 43H160c-55 0-78-20-78-56 0-32 15-55 38-54Z"/><path ${detail} d="M180 420h275M270 365l45 45M330 350l45 50"/>`,
    bags: `<path ${common} d="M160 225h335l45 305H115l45-305Z"/><path ${detail} d="M255 225c0-70 145-70 145 0M190 300h275"/>`,
    accessories: item.subcategory.includes('scarf')
      ? `<path ${common} d="M255 95h105c35 0 65 30 65 65v380h-95V335h-45v205h-95V160c0-35 30-65 65-65Z"/><path ${detail} d="M225 205h165M285 335v170"/>`
      : item.subcategory.includes('belt')
        ? `<rect ${common} x="105" y="280" width="430" height="90" rx="25"/><rect fill="none" stroke="${stroke}" stroke-width="14" x="365" y="260" width="120" height="130" rx="20"/>`
        : `<path ${common} d="M150 285c25-115 95-170 170-170s145 55 170 170H150Z"/><path ${common} d="M105 285h430v70H105z"/><path ${detail} d="M210 265h220"/>`,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
  <rect width="640" height="640" fill="#ffffff"/>
  <ellipse cx="320" cy="585" rx="190" ry="28" fill="#e5e7eb" opacity=".55"/>
  ${shapes[item.category] ?? shapes.tops}
  ${pattern ? '<circle cx="255" cy="255" r="18" fill="#f97316"/><circle cx="345" cy="320" r="18" fill="#ec4899"/><circle cx="410" cy="245" r="18" fill="#22c55e"/><circle cx="280" cy="405" r="18" fill="#3b82f6"/>' : ''}
</svg>`;
}

async function main() {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(dbPath);
  const existing = db.prepare('select id from garment where name = ?');
  const insertFile = db.prepare(`
    insert into file (shareable_id, flagged, banned, file_name, mimetype, created_on, created_by_id)
    values (?, null, null, ?, ?, ?, null)
  `);
  const insertGarment = db.prepare(`
    insert into garment (
      shareable_id, flagged, banned, name, category, color, brand, size, notes, photo_id, owner_id,
      subcategory, seasons, style_tags, scene_tags, material, thickness, fit, status, price,
      purchase_date, purchase_channel, wear_count, last_worn_date
    ) values (
      ?, null, null, ?, ?, ?, ?, ?, ?, ?, null,
      ?, ?, ?, ?, ?, ?, ?, ?, null,
      null, ?, 0, null
    )
  `);

  let created = 0;
  const now = new Date().toISOString();

  for (const item of garments) {
    if (existing.get(item.name)) continue;

    const fileName = `${randomUUID()}.webp`;
    const filePath = path.join(dataDir, fileName);
    await sharp(Buffer.from(itemSvg(item)))
      .webp({ quality: 96 })
      .toFile(filePath);

    const fileResult = insertFile.run(randomUUID(), fileName, 'image/webp', now);
    insertGarment.run(
      randomUUID(),
      item.name,
      item.category,
      item.color,
      'AI测试素材',
      '',
      `${item.name.replace(/^AI测试\s*/, '')}，用于 AI 智能穿搭验收的测试单品。`,
      fileResult.lastInsertRowid,
      item.subcategory,
      JSON.stringify(item.seasons),
      JSON.stringify(item.styleTags),
      JSON.stringify(item.sceneTags),
      item.material,
      item.thickness,
      item.fit,
      'wearable',
      'AI生成测试素材',
    );
    created += 1;
  }

  const total = db.prepare("select count(*) as count from garment where name like 'AI测试 %'").get().count;
  console.log(`created=${created}`);
  console.log(`ai_test_total=${total}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
