import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { buffer } from 'node:stream/consumers';
import sharp from 'sharp';
import { ConditionalAuthGuard } from '../auth/conditional-auth.guard';
import type { Payload } from '../auth/dto/payload.dto';
import type { Garment } from '../dal/entity/garment.entity';
import { FileService } from '../file/file-service.abstract';
import {
  GARMENT_TAG_GROUP_LABELS,
  GARMENT_TAG_TAXONOMY,
  sanitizeGarmentTaxonomySelection,
  type GarmentTagGroup,
} from './garment-tag-taxonomy';
import {
  BACKFILL_LIMIT_DEFAULT,
  BACKFILL_LIMIT_MAX,
  MiniappAdminService,
} from './miniapp-admin.service';

type BackfillTagsBody = {
  limit?: unknown;
};

@UseGuards(ConditionalAuthGuard)
@Controller('api/miniapp/admin')
export class MiniappAdminController {
  constructor(
    private readonly adminService: MiniappAdminService,
    private readonly fileService: FileService,
  ) {}

  @Get('users')
  async users(@Req() req: FastifyRequest) {
    const items = await this.adminService.listUsers(this.userId(req));
    return { items };
  }

  @Get('users/:id/garments')
  async userGarments(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
  ) {
    const garments = await this.adminService.findUserGarments(
      this.userId(req),
      id,
    );
    return { items: garments.map((garment) => this.toItem(garment)) };
  }

  @Post('users/:id/garments/backfill-tags')
  async backfillUserGarmentTags(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: BackfillTagsBody = {},
    @Req() req: FastifyRequest,
  ) {
    return this.adminService.backfillUserGarmentTags(
      this.userId(req),
      id,
      this.backfillLimit(body?.limit),
    );
  }

  @Get('users/:id/garments/export.xlsx')
  async exportUserGarments(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const garments = await this.adminService.findUserGarments(
      this.userId(req),
      id,
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('用户库存');
    sheet.columns = [
      { header: '衣物ID', key: 'id', width: 10 },
      { header: '照片', key: 'photo', width: 16 },
      { header: '衣物名称', key: 'name', width: 24 },
      { header: '分类', key: 'categoryLabel', width: 12 },
      { header: '细分', key: 'subcategory', width: 18 },
      { header: '颜色', key: 'colorLabel', width: 12 },
      { header: '状态', key: 'statusLabel', width: 12 },
      { header: '品牌', key: 'brand', width: 18 },
      { header: '尺码', key: 'size', width: 12 },
      { header: '季节', key: 'seasons', width: 20 },
      { header: '材质', key: 'material', width: 16 },
      { header: '厚薄', key: 'thickness', width: 14 },
      { header: '版型', key: 'fit', width: 14 },
      { header: '口袋', key: 'pocket', width: 18 },
      { header: '胸前标识', key: 'chestMark', width: 24 },
      { header: '风格标签', key: 'styleTags', width: 24 },
      { header: '场景标签', key: 'sceneTags', width: 24 },
      { header: '结构化标签', key: 'taxonomyTags', width: 56 },
      { header: 'AI补标时间(北京时间)', key: 'tagsBackfilledAt', width: 24 },
      { header: '备注', key: 'notes', width: 36 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const garment of garments) {
      const row = sheet.addRow(this.toExcelRow(garment));
      await this.addPhotoToRow(workbook, sheet, row, garment);
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const fileName = `user-${id}-garments-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;
    reply.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    reply.header('Content-Disposition', `attachment; filename="${fileName}"`);
    return reply.send(buffer);
  }

  private userId(req: FastifyRequest): number | undefined {
    return (req['user'] as Payload | undefined)?.userId;
  }

  private backfillLimit(value: unknown): number {
    if (value === undefined) return BACKFILL_LIMIT_DEFAULT;
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      !Number.isInteger(value) ||
      value < 1 ||
      value > BACKFILL_LIMIT_MAX
    ) {
      throw new BadRequestException(
        `limit 必须是 1 至 ${BACKFILL_LIMIT_MAX} 的整数`,
      );
    }
    return value;
  }

  private toItem(garment: Garment) {
    return {
      id: garment.id,
      photo: garment.photo?.fileName ? '见图' : '无照片',
      name: garment.name ?? '',
      category: garment.category,
      categoryLabel: this.categoryLabel(garment.category),
      subcategory: garment.subcategory ?? '',
      color: garment.color ?? '',
      colorLabel: this.colorLabel(garment.color),
      status: garment.status,
      statusLabel: this.statusLabel(garment.status),
      brand: garment.brand ?? '',
      size: garment.size ?? '',
    };
  }

  private async addPhotoToRow(
    workbook: ExcelJS.Workbook,
    sheet: ExcelJS.Worksheet,
    row: ExcelJS.Row,
    garment: Garment,
  ): Promise<void> {
    const fileName = garment.photo?.fileName;
    if (!fileName) return;

    try {
      const photoStream = await this.fileService.get(fileName);
      if (!photoStream) return;

      const photo = await sharp(await buffer(photoStream))
        .autoOrient()
        .resize(96, 96, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .png()
        .toBuffer();
      const imageId = workbook.addImage({
        base64: photo.toString('base64'),
        extension: 'png',
      });
      row.height = 76;
      sheet.addImage(imageId, {
        tl: { col: 1.15, row: row.number - 0.85 },
        ext: { width: 72, height: 72 },
        editAs: 'oneCell',
      });
    } catch {
      row.getCell('photo').value = '照片读取失败';
    }
  }

  private text(value?: string): string {
    return value ?? '';
  }

  private joinTags(values?: string[]): string {
    return (values ?? []).join('、');
  }

  private toExcelRow(garment: Garment) {
    return {
      id: garment.id,
      name: this.text(garment.name),
      categoryLabel: this.categoryLabel(garment.category),
      subcategory: this.text(garment.subcategory),
      colorLabel: this.colorLabel(garment.color),
      statusLabel: this.statusLabel(garment.status),
      brand: this.text(garment.brand),
      size: this.text(garment.size),
      seasons: this.joinTags(garment.seasons),
      material: this.text(garment.material),
      thickness: this.text(garment.thickness),
      fit: this.text(garment.fit),
      pocket: [garment.pocketPresence, garment.pocketPosition]
        .filter(Boolean)
        .join(' / '),
      chestMark: [
        garment.chestMarkPresence,
        garment.chestMarkType,
        garment.chestMarkPosition,
        garment.chestMarkText,
      ]
        .filter(Boolean)
        .join(' / '),
      styleTags: this.joinTags(garment.styleTags),
      sceneTags: this.joinTags(garment.sceneTags),
      taxonomyTags: this.taxonomyTagsLabel(garment.taxonomyTags),
      tagsBackfilledAt: this.beijingTime(garment.tagsBackfilledAt),
      notes: this.text(garment.notes),
    };
  }

  // 数据库存的是 UTC，导出给人看要北京时间。中国全年固定 UTC+8 且无夏令时，
  // 直接偏移 8 小时即可，不依赖服务器时区设置，也不依赖 Node 的 ICU 时区数据。
  private beijingTime(date?: Date): string {
    if (!date) return '';
    const offsetMs = 8 * 60 * 60 * 1000;
    return new Date(date.getTime() + offsetMs)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');
  }

  // 结构化标签是分组对象，摊平成「组名：值、值」单行文本，按标签库定义的组顺序输出，
  // 空组直接跳过，避免整列被占位符撑满。
  private taxonomyTagsLabel(taxonomyTags?: unknown): string {
    const selection = sanitizeGarmentTaxonomySelection(taxonomyTags);
    return (Object.keys(GARMENT_TAG_TAXONOMY) as GarmentTagGroup[])
      .flatMap((group) => {
        const tags = selection[group] ?? [];
        if (tags.length === 0) return [];
        return [`${GARMENT_TAG_GROUP_LABELS[group]}：${tags.join('、')}`];
      })
      .join('；');
  }

  private categoryLabel(category?: string): string {
    const labels: Record<string, string> = {
      accessories: '配饰',
      bags: '包包',
      outerwear: '外套',
      dresses: '连衣裙',
      tops: '上衣',
      bottoms: '下装',
      footwear: '鞋子',
      other: '其他',
    };
    return category ? (labels[category] ?? category) : '';
  }

  private colorLabel(color?: string): string {
    const labels: Record<string, string> = {
      red: '红色',
      pink: '粉色',
      orange: '橙色',
      yellow: '黄色',
      green: '绿色',
      blue: '蓝色',
      purple: '紫色',
      black: '黑色',
      white: '白色',
      grey: '灰色',
      beige: '米色',
      brown: '棕色',
      gold: '金色',
      silver: '银色',
      pattern: '图案',
      other: '其他',
    };
    return color ? (labels[color] ?? color) : '';
  }

  private statusLabel(status?: string): string {
    const labels: Record<string, string> = {
      wearable: '可穿',
      laundry: '待洗',
      stored: '收纳中',
      damaged: '需修补',
      archived: '已归档',
    };
    return status ? (labels[status] ?? status) : '';
  }
}
