import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ConditionalAuthGuard } from '../auth/conditional-auth.guard';
import type { Payload } from '../auth/dto/payload.dto';
import type { Garment } from '../dal/entity/garment.entity';
import { MiniappAdminService } from './miniapp-admin.service';

@UseGuards(ConditionalAuthGuard)
@Controller('api/miniapp/admin')
export class MiniappAdminController {
  constructor(private readonly adminService: MiniappAdminService) {}

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
      { header: '口袋', key: 'pocket', width: 18 },
      { header: '胸前标识', key: 'chestMark', width: 24 },
      { header: '风格标签', key: 'styleTags', width: 24 },
      { header: '场景标签', key: 'sceneTags', width: 24 },
      { header: '备注', key: 'notes', width: 36 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const garment of garments) {
      sheet.addRow(this.toExcelRow(garment));
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

  private toItem(garment: Garment) {
    return {
      id: garment.id,
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

  private toExcelRow(garment: Garment) {
    return {
      id: garment.id,
      name: garment.name ?? '',
      categoryLabel: this.categoryLabel(garment.category),
      subcategory: garment.subcategory ?? '',
      colorLabel: this.colorLabel(garment.color),
      statusLabel: this.statusLabel(garment.status),
      brand: garment.brand ?? '',
      size: garment.size ?? '',
      seasons: (garment.seasons ?? []).join('、'),
      material: garment.material ?? '',
      thickness: garment.thickness ?? '',
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
      styleTags: (garment.styleTags ?? []).join('、'),
      sceneTags: (garment.sceneTags ?? []).join('、'),
      notes: garment.notes ?? '',
    };
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
