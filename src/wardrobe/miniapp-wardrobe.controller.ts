import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { MultipartFile } from '@fastify/multipart';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { buffer } from 'node:stream/consumers';
import { Readable } from 'node:stream';
import { extname, basename } from 'node:path';
import { GarmentVisionService } from '../ai/garment-vision.service';
import { ConditionalAuthGuard } from '../auth/conditional-auth.guard';
import type { Payload } from '../auth/dto/payload.dto';
import type { Garment } from '../dal/entity/garment.entity';
import { FileService } from '../file/file-service.abstract';
import { GarmentColor } from './garment-color.enum';
import { GarmentStatus } from './garment-status.enum';
import { GarmentService } from './garment.service';

type MiniappRequest = FastifyRequest & {
  protocol?: string;
  host?: string;
};

type MiniappCreateBody = {
  name?: string;
  category?: string;
  color?: GarmentColor;
  season?: string;
  brand?: string;
  size?: string;
  notes?: string;
  subcategory?: string;
  styleTags?: string;
  sceneTags?: string;
  material?: string;
  thickness?: string;
};

type ZipEntry = {
  name: string;
  data: Buffer;
};

type BackupManifestGarment = {
  name?: string;
  category?: string;
  color?: GarmentColor | string;
  status?: GarmentStatus | string;
  seasons?: string[];
  subcategory?: string;
  styleTags?: string[];
  sceneTags?: string[];
  material?: string;
  thickness?: string;
  brand?: string;
  size?: string;
  notes?: string;
  photo?: string;
};

type BackupManifest = {
  backupVersion?: number;
  garments?: BackupManifestGarment[];
};

const CRC32_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

@UseGuards(ConditionalAuthGuard)
@Controller('api/miniapp/garments')
export class MiniappWardrobeController {
  constructor(
    private readonly garmentService: GarmentService,
    private readonly garmentVisionService: GarmentVisionService,
    private readonly fileService: FileService,
  ) {}

  @Get()
  async index(@Req() req: MiniappRequest) {
    const garments = await this.garmentService.findAll(this.userId(req), {});
    return { items: garments.map((garment) => this.toViewModel(garment, req)) };
  }

  @Get(':id')
  async show(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: MiniappRequest,
  ) {
    const garment = await this.garmentService.findOne(id, this.userId(req));
    return { item: this.toViewModel(garment, req) };
  }

  @Post('analyze')
  async analyze(@Req() req: MiniappRequest) {
    const photo = await this.readImageUpload(req);
    const draft = await this.garmentVisionService.analyzeUpload(photo);
    return { draft };
  }

  @Get('backup/export')
  async exportBackup(
    @Req() req: MiniappRequest,
    @Res() reply: FastifyReply,
  ) {
    const garments = await this.garmentService.findAll(this.userId(req), {});
    const entries: ZipEntry[] = [];
    const exportedAt = new Date().toISOString();
    const photoEntries = new Map<number, string>();

    for (const garment of garments) {
      const fileName = garment.photo?.fileName;
      if (!fileName) continue;
      const photo = await this.fileService.get(fileName).catch(() => undefined);
      if (!photo) continue;
      const photoPath = `photos/${garment.id}-${fileName}`;
      entries.push({ name: photoPath, data: await buffer(photo) });
      photoEntries.set(garment.id, photoPath);
    }

    entries.unshift({
      name: 'manifest.json',
      data: Buffer.from(
        JSON.stringify(
          {
            backupVersion: 1,
            exportedAt,
            garmentCount: garments.length,
            photoCount: photoEntries.size,
            garments: garments.map((garment) => ({
              id: garment.id,
              name: garment.name ?? '',
              category: garment.category,
              color: garment.color ?? '',
              status: garment.status,
              seasons: garment.seasons ?? [],
              subcategory: garment.subcategory ?? '',
              styleTags: garment.styleTags ?? [],
              sceneTags: garment.sceneTags ?? [],
              material: garment.material ?? '',
              thickness: garment.thickness ?? '',
              brand: garment.brand ?? '',
              size: garment.size ?? '',
              notes: garment.notes ?? '',
              photo: photoEntries.get(garment.id) ?? '',
            })),
          },
          null,
          2,
        ),
        'utf8',
      ),
    });

    const zip = this.buildZip(entries);
    const fileName = `wardrobe-backup-${exportedAt.slice(0, 10)}.zip`;
    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Disposition', `attachment; filename="${fileName}"`);
    return reply.send(zip);
  }

  @Post('backup/import')
  async importBackup(@Req() req: MiniappRequest) {
    const backup = await this.readBackupUpload(req);
    const entries = this.readZip(backup);
    const manifestEntry = entries.find((entry) => entry.name === 'manifest.json');
    if (!manifestEntry) {
      throw new BadRequestException('备份包缺少 manifest.json');
    }

    let manifest: BackupManifest;
    try {
      manifest = JSON.parse(manifestEntry.data.toString('utf8')) as BackupManifest;
    } catch {
      throw new BadRequestException('备份包清单格式不正确');
    }

    if (!Array.isArray(manifest.garments)) {
      throw new BadRequestException('备份包没有衣物数据');
    }

    const photoEntries = new Map(entries.map((entry) => [entry.name, entry]));
    let imported = 0;
    let skipped = 0;

    for (const item of manifest.garments) {
      if (!item.category) {
        skipped += 1;
        continue;
      }

      const photoEntry = item.photo ? photoEntries.get(item.photo) : undefined;
      const photo = photoEntry
        ? this.zipEntryToUpload(photoEntry)
        : undefined;

      await this.garmentService.create(
        {
          name: item.name,
          category: item.category,
          color: item.color as GarmentColor | undefined,
          status: item.status as GarmentStatus | undefined,
          seasons: item.seasons,
          subcategory: item.subcategory,
          styleTags: item.styleTags,
          sceneTags: item.sceneTags,
          material: item.material,
          thickness: item.thickness,
          brand: item.brand,
          size: item.size,
          notes: item.notes,
          photo,
        },
        this.userId(req),
      );
      imported += 1;
    }

    return { imported, skipped };
  }

  @Post()
  async create(@Body() body: MiniappCreateBody = {}, @Req() req: MiniappRequest) {
    const photo = await this.readImageUpload(req);
    const form = this.mergeMultipartFields(body, photo);

    if (!form.category) {
      throw new BadRequestException('分类不能为空');
    }

    const garment = await this.garmentService.create(
      {
        name: form.name,
        category: form.category,
        color: form.color,
        seasons: form.season,
        subcategory: form.subcategory,
        styleTags: form.styleTags,
        sceneTags: form.sceneTags,
        material: form.material,
        thickness: form.thickness,
        brand: form.brand,
        size: form.size,
        notes: form.notes,
        photo,
      },
      this.userId(req),
    );
    return { item: this.toViewModel(garment, req) };
  }

  @Post(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: MiniappCreateBody = {},
    @Req() req: MiniappRequest,
  ) {
    if (!body.category) {
      throw new BadRequestException('分类不能为空');
    }

    const garment = await this.garmentService.update(
      id,
      {
        name: body.name,
        category: body.category,
        color: body.color,
        seasons: body.season,
        subcategory: body.subcategory,
        styleTags: body.styleTags,
        sceneTags: body.sceneTags,
        material: body.material,
        thickness: body.thickness,
        brand: body.brand,
        size: body.size,
        notes: body.notes,
      },
      this.userId(req),
    );
    return { item: this.toViewModel(garment, req) };
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: MiniappRequest,
  ) {
    await this.garmentService.remove(id, this.userId(req));
    return { ok: true };
  }

  private userId(req: FastifyRequest): number | undefined {
    return (req['user'] as Payload | undefined)?.userId;
  }

  private async readImageUpload(
    req: MiniappRequest,
  ): Promise<MultipartFile> {
    const file = await req.file?.();
    if (!file) {
      throw new BadRequestException('请先选择图片');
    }
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('上传文件必须是图片');
    }
    return file;
  }

  private async readBackupUpload(req: MiniappRequest): Promise<Buffer> {
    const file = await req.file?.();
    if (!file) {
      throw new BadRequestException('请先选择备份文件');
    }
    const fileName = file.filename ?? '';
    const isZip =
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      file.mimetype === 'application/octet-stream' ||
      fileName.toLowerCase().endsWith('.zip');
    if (!isZip) {
      file.file.resume();
      throw new BadRequestException('请上传 .zip 备份包');
    }
    return buffer(file.file);
  }

  private zipEntryToUpload(entry: ZipEntry): MultipartFile {
    const extension = extname(entry.name).toLowerCase();
    const mimetype =
      extension === '.png'
        ? 'image/png'
        : extension === '.jpg' || extension === '.jpeg'
          ? 'image/jpeg'
          : 'image/webp';
    return {
      file: Readable.from(entry.data),
      filename: basename(entry.name),
      mimetype,
      fields: {},
    } as MultipartFile;
  }

  private mergeMultipartFields(
    body: MiniappCreateBody = {},
    file: MultipartFile,
  ): MiniappCreateBody {
    return {
      name: this.fieldValue(body.name, file, 'name'),
      category: this.fieldValue(body.category, file, 'category'),
      color: this.fieldValue(body.color, file, 'color') as
        | GarmentColor
        | undefined,
      season: this.fieldValue(body.season, file, 'season'),
      brand: this.fieldValue(body.brand, file, 'brand'),
      size: this.fieldValue(body.size, file, 'size'),
      notes: this.fieldValue(body.notes, file, 'notes'),
      subcategory: this.fieldValue(body.subcategory, file, 'subcategory'),
      styleTags: this.fieldValue(body.styleTags, file, 'styleTags'),
      sceneTags: this.fieldValue(body.sceneTags, file, 'sceneTags'),
      material: this.fieldValue(body.material, file, 'material'),
      thickness: this.fieldValue(body.thickness, file, 'thickness'),
    };
  }

  private fieldValue(
    bodyValue: string | undefined,
    file: MultipartFile,
    name: string,
  ): string | undefined {
    const value =
      bodyValue ??
      (file.fields?.[name] as { value?: unknown } | undefined)?.value;
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  private toViewModel(garment: Garment, req: MiniappRequest) {
    const photoFileName = garment.photo?.fileName;
    return {
      id: garment.id,
      name: garment.name ?? '',
      category: garment.category,
      categoryLabel: this.categoryLabel(garment.category),
      color: garment.color ?? '',
      colorLabel: this.colorLabel(garment.color),
      status: garment.status,
      statusLabel: this.statusLabel(garment.status),
      season: garment.seasons?.[0] ?? '',
      seasons: garment.seasons ?? [],
      subcategory: garment.subcategory ?? '',
      styleTags: garment.styleTags ?? [],
      sceneTags: garment.sceneTags ?? [],
      material: garment.material ?? '',
      thickness: garment.thickness ?? '',
      brand: garment.brand ?? '',
      size: garment.size ?? '',
      notes: garment.notes ?? '',
      photoUrl: photoFileName ? `${this.origin(req)}/file/${photoFileName}` : '',
      detailUrl: `/api/miniapp/garments/${garment.id}`,
    };
  }

  private origin(req: MiniappRequest): string {
    const forwardedProto = req.headers?.['x-forwarded-proto'];
    const protocol =
      (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) ??
      req.protocol ??
      'https';
    const host = req.host ?? req.headers?.host ?? 'aimatchwear.asia';
    return `${protocol}://${host}`;
  }

  private categoryLabel(category: string): string {
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
    return labels[category] ?? category;
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
    return color ? labels[color] ?? color : '';
  }

  private statusLabel(status?: string): string {
    const labels: Record<string, string> = {
      wearable: '可穿',
      laundry: '待洗',
      stored: '收纳中',
      damaged: '需修补',
      archived: '已归档',
    };
    return status ? labels[status] ?? status : '';
  }

  private buildZip(entries: ZipEntry[]): Buffer {
    const localParts: Buffer[] = [];
    const centralParts: Buffer[] = [];
    let offset = 0;

    for (const entry of entries) {
      const name = Buffer.from(entry.name, 'utf8');
      const crc = this.crc32(entry.data);
      const localHeader = Buffer.alloc(30);
      localHeader.writeUInt32LE(0x04034b50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(0x0800, 6);
      localHeader.writeUInt16LE(0, 8);
      localHeader.writeUInt16LE(0, 10);
      localHeader.writeUInt16LE(0, 12);
      localHeader.writeUInt32LE(crc, 14);
      localHeader.writeUInt32LE(entry.data.length, 18);
      localHeader.writeUInt32LE(entry.data.length, 22);
      localHeader.writeUInt16LE(name.length, 26);
      localHeader.writeUInt16LE(0, 28);
      localParts.push(localHeader, name, entry.data);

      const centralHeader = Buffer.alloc(46);
      centralHeader.writeUInt32LE(0x02014b50, 0);
      centralHeader.writeUInt16LE(20, 4);
      centralHeader.writeUInt16LE(20, 6);
      centralHeader.writeUInt16LE(0x0800, 8);
      centralHeader.writeUInt16LE(0, 10);
      centralHeader.writeUInt16LE(0, 12);
      centralHeader.writeUInt16LE(0, 14);
      centralHeader.writeUInt32LE(crc, 16);
      centralHeader.writeUInt32LE(entry.data.length, 20);
      centralHeader.writeUInt32LE(entry.data.length, 24);
      centralHeader.writeUInt16LE(name.length, 28);
      centralHeader.writeUInt16LE(0, 30);
      centralHeader.writeUInt16LE(0, 32);
      centralHeader.writeUInt16LE(0, 34);
      centralHeader.writeUInt16LE(0, 36);
      centralHeader.writeUInt32LE(0, 38);
      centralHeader.writeUInt32LE(offset, 42);
      centralParts.push(centralHeader, name);

      offset += localHeader.length + name.length + entry.data.length;
    }

    const centralDirectory = Buffer.concat(centralParts);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(centralDirectory.length, 12);
    end.writeUInt32LE(offset, 16);
    end.writeUInt16LE(0, 20);

    return Buffer.concat([...localParts, centralDirectory, end]);
  }

  private crc32(data: Buffer): number {
    let crc = 0xffffffff;
    for (const byte of data) {
      crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  private readZip(zip: Buffer): ZipEntry[] {
    const endOffset = this.findEndOfCentralDirectory(zip);
    const entryCount = zip.readUInt16LE(endOffset + 10);
    const centralOffset = zip.readUInt32LE(endOffset + 16);
    const entries: ZipEntry[] = [];
    let offset = centralOffset;

    for (let index = 0; index < entryCount; index += 1) {
      if (zip.readUInt32LE(offset) !== 0x02014b50) {
        throw new BadRequestException('备份包目录格式不正确');
      }
      const method = zip.readUInt16LE(offset + 10);
      if (method !== 0) {
        throw new BadRequestException('备份包压缩格式暂不支持');
      }
      const compressedSize = zip.readUInt32LE(offset + 20);
      const nameLength = zip.readUInt16LE(offset + 28);
      const extraLength = zip.readUInt16LE(offset + 30);
      const commentLength = zip.readUInt16LE(offset + 32);
      const localOffset = zip.readUInt32LE(offset + 42);
      const name = zip
        .subarray(offset + 46, offset + 46 + nameLength)
        .toString('utf8');
      const data = this.readZipLocalEntry(zip, localOffset, compressedSize);
      entries.push({ name, data });
      offset += 46 + nameLength + extraLength + commentLength;
    }

    return entries;
  }

  private readZipLocalEntry(
    zip: Buffer,
    localOffset: number,
    size: number,
  ): Buffer {
    if (zip.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new BadRequestException('备份包文件格式不正确');
    }
    const nameLength = zip.readUInt16LE(localOffset + 26);
    const extraLength = zip.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + nameLength + extraLength;
    return zip.subarray(dataOffset, dataOffset + size);
  }

  private findEndOfCentralDirectory(zip: Buffer): number {
    const minOffset = Math.max(0, zip.length - 65557);
    for (let offset = zip.length - 22; offset >= minOffset; offset -= 1) {
      if (zip.readUInt32LE(offset) === 0x06054b50) return offset;
    }
    throw new BadRequestException('备份包不是有效 ZIP 文件');
  }
}
