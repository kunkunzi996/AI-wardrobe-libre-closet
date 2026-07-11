import { EntityRepository, FilterQuery } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { randomUUID } from 'node:crypto';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import { Garment } from '../dal/entity/garment.entity';
import { File } from '../dal/entity/file.entity';
import { User } from '../dal/entity/user.entity';
import { FileService } from '../file/file-service.abstract';
import { CreateGarmentDto } from './dto/create-garment.dto';
import { UpdateGarmentDto } from './dto/update-garment.dto';
import { SearchGarmentDto } from './dto/search-garment.dto';
import { GarmentCategory } from './garment-category.enum';
import { GarmentColor } from './garment-color.enum';
import { GarmentStatus } from './garment-status.enum';
import {
  GARMENT_CHEST_MARK_POSITION_VALUES,
  GARMENT_CHEST_MARK_TYPE_VALUES,
  GARMENT_FEATURE_PRESENCE_VALUES,
  GARMENT_POCKET_POSITION_VALUES,
  type GarmentChestMarkPosition,
  type GarmentChestMarkType,
  type GarmentFeaturePresence,
  type GarmentPocketPosition,
  type GarmentVisionResult,
} from '../ai/dto/garment-vision-result.dto';
import { sanitizeGarmentTaxonomySelection } from './garment-tag-taxonomy';

const CANONICAL_SIZES = [
  'XX-Small',
  'X-Small',
  'Small',
  'Medium',
  'Large',
  'X-Large',
  'XX-Large',
  '3X-Large',
  '4X-Large',
  '5X-Large',
];

const DUPLICATE_SCORE_THRESHOLD = 70;
const STRONG_DUPLICATE_SCORE_THRESHOLD = 80;
const DETAIL_MATCH_SCORE = 35;

const COMMON_DUPLICATE_SHAPES = [
  '短袖',
  '长袖',
  't恤',
  'tshirt',
  'tee',
  '上衣',
  '衬衫',
  '卫衣',
  '毛衣',
  '背心',
  '裤',
  '裤子',
  '牛仔裤',
  '休闲裤',
  '裙',
  '半裙',
  '裙子',
  '鞋',
  '鞋子',
  '包',
  '包包',
  '配饰',
];

export interface SimilarGarmentCandidate {
  garment: Garment;
  score: number;
  reasons: string[];
}

@Injectable()
export class GarmentService {
  private readonly logger = new Logger(GarmentService.name);

  constructor(
    @InjectRepository(Garment)
    private readonly garmentRepository: EntityRepository<Garment>,
    @InjectRepository(File)
    private readonly fileRepository: EntityRepository<File>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    private readonly fileService: FileService,
  ) {}

  resolveCategoryLabel(value: string, i18n: I18nContext): string {
    const normalized = value.toLowerCase();
    if ((Object.values(GarmentCategory) as string[]).includes(normalized)) {
      return i18n.t(`lang.CATEGORY_${normalized.toUpperCase()}`);
    }
    return value;
  }

  resolveColorLabel(color?: string): string {
    if (!color) return '';
    const labels: Record<GarmentColor, string> = {
      [GarmentColor.RED]: '红色',
      [GarmentColor.PINK]: '粉色',
      [GarmentColor.ORANGE]: '橙色',
      [GarmentColor.YELLOW]: '黄色',
      [GarmentColor.GREEN]: '绿色',
      [GarmentColor.BLUE]: '蓝色',
      [GarmentColor.PURPLE]: '紫色',
      [GarmentColor.BLACK]: '黑色',
      [GarmentColor.WHITE]: '白色',
      [GarmentColor.GREY]: '灰色',
      [GarmentColor.BEIGE]: '米色',
      [GarmentColor.BROWN]: '棕色',
      [GarmentColor.GOLD]: '金色',
      [GarmentColor.SILVER]: '银色',
      [GarmentColor.PATTERN]: '图案',
      [GarmentColor.OTHER]: '其他',
    };
    return labels[color as GarmentColor] ?? color;
  }

  resolveStatusLabel(status?: string): string {
    if (!status) return '';
    const labels: Record<GarmentStatus, string> = {
      [GarmentStatus.Wearable]: '可穿',
      [GarmentStatus.Laundry]: '待洗',
      [GarmentStatus.Stored]: '收纳中',
      [GarmentStatus.Damaged]: '需修补',
      [GarmentStatus.Archived]: '已归档',
    };
    return labels[status as GarmentStatus] ?? status;
  }

  async findAll(
    userId?: number,
    dto: SearchGarmentDto = {},
  ): Promise<Garment[]> {
    const normalizedSize = this.normalizeSize(dto.size);
    const searchConditions: FilterQuery<Garment> = {
      ...(dto.category ? { category: dto.category } : {}),
      ...(dto.color ? { color: dto.color } : {}),
      ...(dto.subcategory ? { subcategory: dto.subcategory } : {}),
      ...(dto.status ? { status: dto.status } : {}),
      ...(normalizedSize ? { size: normalizedSize } : {}),
    };
    const options = {
      populate: ['photo'] as const,
      orderBy: { id: 'DESC' as const },
    };
    const filterInMemory = (garments: Garment[]) =>
      garments.filter((garment) => this.matchesMetadataFilters(garment, dto));

    if (userId != null) {
      const garments = await this.garmentRepository.find(
        { owner: { id: userId }, ...searchConditions },
        options,
      );
      return filterInMemory(garments);
    }
    // AUTH_ENABLED=false: only return garments that belong to no user
    const garments = await this.garmentRepository.find(
      { owner: null, ...searchConditions },
      options,
    );
    return filterInMemory(garments);
  }

  async findSimilarToDraft(
    draft: Partial<GarmentVisionResult>,
    userId?: number,
  ): Promise<SimilarGarmentCandidate[]> {
    const garments = await this.findAll(userId, {});
    return garments
      .map((garment) => this.scoreSimilarity(garment, draft))
      .filter((candidate) => this.isLikelyDuplicate(candidate, draft))
      .sort((a, b) => b.score - a.score || b.garment.id - a.garment.id)
      .slice(0, 3);
  }

  async findOne(id: number, userId?: number): Promise<Garment> {
    const garment = await this.garmentRepository.findOne(id, {
      populate: ['photo', 'outfits'],
    });
    if (!garment) throw new NotFoundException('Garment not found');
    if (userId != null) {
      // auth mode: must be the owner
      if (garment.owner?.id !== userId) throw new ForbiddenException();
    } else {
      // no-auth mode: only allow ownerless garments
      if (garment.owner != null) throw new ForbiddenException();
    }
    return garment;
  }

  async findOneByShareableId(shareableId: string): Promise<Garment> {
    const garment = await this.garmentRepository.findOne(
      { shareableId },
      { populate: ['photo'] },
    );
    if (!garment) throw new NotFoundException('Garment not found');
    return garment;
  }

  async create(dto: CreateGarmentDto, userId?: number): Promise<Garment> {
    let photo: File | undefined = undefined;
    if (dto.photo) {
      photo = await this.fileService.storeImageFromFileUpload(
        dto.photo,
        userId,
      );
    } else if (dto.photoFileName) {
      photo =
        (await this.fileRepository.findOne({
          fileName: dto.photoFileName,
          ...(userId != null ? { createdBy: userId } : { createdBy: null }),
        })) ?? undefined;
    }

    const garment = this.garmentRepository.create({
      name: dto.name,
      category: dto.category,
      subcategory: dto.subcategory,
      brand: dto.brand,
      color: dto.color,
      size: this.normalizeSize(dto.size),
      seasons: this.normalizeTags(dto.seasons),
      styleTags: this.normalizeTags(dto.styleTags),
      sceneTags: this.normalizeTags(dto.sceneTags),
      material: dto.material,
      thickness: dto.thickness,
      pocketPresence: this.normalizeFeaturePresence(dto.pocketPresence),
      pocketPosition: this.normalizePocketPosition(
        dto.pocketPresence,
        dto.pocketPosition,
      ),
      chestMarkPresence: this.normalizeFeaturePresence(dto.chestMarkPresence),
      chestMarkType: this.normalizeChestMarkType(
        dto.chestMarkPresence,
        dto.chestMarkType,
      ),
      chestMarkPosition: this.normalizeChestMarkPosition(
        dto.chestMarkPresence,
        dto.chestMarkPosition,
      ),
      chestMarkText: this.normalizeChestMarkText(
        dto.chestMarkPresence,
        dto.chestMarkText,
      ),
      fit: dto.fit,
      taxonomyTags: sanitizeGarmentTaxonomySelection(dto.taxonomyTags),
      status: dto.status ?? GarmentStatus.Wearable,
      price: this.normalizeNumber(dto.price),
      purchaseDate: this.normalizeDate(dto.purchaseDate),
      purchaseChannel: dto.purchaseChannel,
      wearCount: this.normalizeNumber(dto.wearCount) ?? 0,
      lastWornDate: this.normalizeDate(dto.lastWornDate),
      notes: dto.notes,
      photo: photo ?? undefined,
    });

    if (userId != null) {
      const user = await this.userRepository.findOneOrFail(userId);
      garment.owner = user as any;
    }

    await this.garmentRepository.getEntityManager().persistAndFlush(garment);
    return garment;
  }

  async findAvailableFilters(userId?: number): Promise<{
    brands: string[];
    sizes: string[];
    categories: string[];
  }> {
    const where = userId != null ? { owner: { id: userId } } : { owner: null };
    const garments = await this.garmentRepository.find(where);

    const brands = [
      ...new Set(garments.map((g) => g.brand).filter(Boolean) as string[]),
    ].sort();
    const allSizes = [
      ...new Set(garments.map((g) => g.size).filter(Boolean) as string[]),
    ];
    const sizes = allSizes.sort((a, b) => {
      const ai = CANONICAL_SIZES.indexOf(a);
      const bi = CANONICAL_SIZES.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    const categories = [
      ...new Set(garments.map((g) => g.category).filter(Boolean)),
    ].sort();

    return { brands, sizes, categories };
  }

  async update(
    id: number,
    dto: UpdateGarmentDto,
    userId?: number,
  ): Promise<Garment> {
    // Process the file upload BEFORE any async DB operations.
    // The multipart interceptor calls stream.resume() on all file streams before
    // the controller runs. With Postgres, the async findOne() yields the event
    // loop long enough for a resume()'d stream to drain/discard its data. By
    // piping the stream to disk first (synchronous from the stream's perspective)
    // we consume it before any Postgres round-trip can drain it.
    //
    // IMPORTANT: photo and nobgPhoto must be subscribed concurrently, not
    // sequentially. Both come from the same hot Subject in the multipart
    // interceptor.
    let photo: File | undefined;
    if (dto.photo) {
      const photoFileName = `${randomUUID()}.webp`;
      const photoPromise = this.fileService.storeImageFromFileUpload(
        dto.photo,
        userId,
        photoFileName,
      );
      const nobgPromise = this.streamNobgIfPresent(
        dto.nobgPhoto,
        photoFileName,
      );

      [photo] = await Promise.all([photoPromise, nobgPromise]);
    }

    const garment = await this.findOne(id, userId);

    if (photo) {
      await this.deleteOldPhoto(garment);
      garment.photo = photo as any;
    }

    garment.name = dto.name ?? garment.name;
    garment.category = dto.category ?? garment.category;
    if ('subcategory' in dto) garment.subcategory = dto.subcategory;
    if ('brand' in dto) garment.brand = dto.brand;
    if ('color' in dto) garment.color = dto.color;
    if ('size' in dto) garment.size = this.normalizeSize(dto.size);
    if ('seasons' in dto) garment.seasons = this.normalizeTags(dto.seasons);
    if ('styleTags' in dto)
      garment.styleTags = this.normalizeTags(dto.styleTags);
    if ('sceneTags' in dto)
      garment.sceneTags = this.normalizeTags(dto.sceneTags);
    if ('material' in dto) garment.material = dto.material;
    if ('thickness' in dto) garment.thickness = dto.thickness;
    if ('pocketPresence' in dto) {
      garment.pocketPresence = this.normalizeFeaturePresence(
        dto.pocketPresence,
      );
      garment.pocketPosition = this.normalizePocketPosition(
        dto.pocketPresence,
        'pocketPosition' in dto ? dto.pocketPosition : garment.pocketPosition,
      );
    } else if ('pocketPosition' in dto) {
      garment.pocketPosition = this.normalizePocketPosition(
        garment.pocketPresence,
        dto.pocketPosition,
      );
    }
    if ('chestMarkPresence' in dto) {
      garment.chestMarkPresence = this.normalizeFeaturePresence(
        dto.chestMarkPresence,
      );
      garment.chestMarkType = this.normalizeChestMarkType(
        dto.chestMarkPresence,
        'chestMarkType' in dto ? dto.chestMarkType : garment.chestMarkType,
      );
      garment.chestMarkPosition = this.normalizeChestMarkPosition(
        dto.chestMarkPresence,
        'chestMarkPosition' in dto
          ? dto.chestMarkPosition
          : garment.chestMarkPosition,
      );
      garment.chestMarkText = this.normalizeChestMarkText(
        dto.chestMarkPresence,
        'chestMarkText' in dto ? dto.chestMarkText : garment.chestMarkText,
      );
    } else {
      if ('chestMarkType' in dto) {
        garment.chestMarkType = this.normalizeChestMarkType(
          garment.chestMarkPresence,
          dto.chestMarkType,
        );
      }
      if ('chestMarkPosition' in dto) {
        garment.chestMarkPosition = this.normalizeChestMarkPosition(
          garment.chestMarkPresence,
          dto.chestMarkPosition,
        );
      }
      if ('chestMarkText' in dto) {
        garment.chestMarkText = this.normalizeChestMarkText(
          garment.chestMarkPresence,
          dto.chestMarkText,
        );
      }
    }
    if ('fit' in dto) garment.fit = dto.fit;
    if ('taxonomyTags' in dto) {
      garment.taxonomyTags = sanitizeGarmentTaxonomySelection(dto.taxonomyTags);
    }
    if ('status' in dto) garment.status = dto.status ?? GarmentStatus.Wearable;
    if ('price' in dto) garment.price = this.normalizeNumber(dto.price);
    if ('purchaseDate' in dto)
      garment.purchaseDate = this.normalizeDate(dto.purchaseDate);
    if ('purchaseChannel' in dto) garment.purchaseChannel = dto.purchaseChannel;
    if ('wearCount' in dto)
      garment.wearCount = this.normalizeNumber(dto.wearCount) ?? 0;
    if ('lastWornDate' in dto)
      garment.lastWornDate = this.normalizeDate(dto.lastWornDate);
    if ('notes' in dto) garment.notes = dto.notes;

    await this.garmentRepository.getEntityManager().flush();
    return garment;
  }

  private async deleteOldPhoto(garment: Garment) {
    const oldFileName = garment.photo?.fileName;
    if (oldFileName) {
      await this.fileService
        .delete(oldFileName)
        .catch((err) => this.logger.warn(err));
      const nobgFileName = this.fileService.nobgFileName(oldFileName);
      await this.fileService
        .delete(nobgFileName)
        .catch((err) => this.logger.warn(err));
    }
  }

  async updateNobg(
    id: number,
    nobgPhoto: UpdateGarmentDto['nobgPhoto'],
    userId?: number,
  ): Promise<void> {
    const garment = await this.findOne(id, userId);
    if (!garment.photo?.fileName) return;
    await this.streamNobgIfPresent(nobgPhoto, garment.photo.fileName);
  }

  private streamNobgIfPresent(
    nobgPhoto: UpdateGarmentDto['nobgPhoto'],
    photoFileName: string,
  ): Promise<void> {
    if (!nobgPhoto) return Promise.resolve();
    const fileStream = nobgPhoto.file;
    return this.fileService.storeNobgVariantFromStream(
      fileStream,
      photoFileName,
    );
  }

  async remove(id: number, userId?: number): Promise<void> {
    const garment = await this.findOne(id, userId);
    await this.garmentRepository.getEntityManager().removeAndFlush(garment);
  }

  private normalizeSize(input?: string): string | undefined {
    if (!input) return undefined;
    const s = input
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '');
    if (['xxxxxl', '5xl', '5xlarge', 'xxxxxlarge'].includes(s))
      return '5X-Large';
    if (['xxxxl', '4xl', '4xlarge', 'xxxxlarge'].includes(s)) return '4X-Large';
    if (['xxxl', '3xl', '3xlarge', 'xxxlarge'].includes(s)) return '3X-Large';
    if (['xxl', '2xl', '2xlarge', 'xxlarge'].includes(s)) return 'XX-Large';
    if (['xl', 'xlarge'].includes(s)) return 'X-Large';
    if (['l', 'large'].includes(s)) return 'Large';
    if (['m', 'medium'].includes(s)) return 'Medium';
    if (['s', 'small'].includes(s)) return 'Small';
    if (['xs', 'xsmall'].includes(s)) return 'X-Small';
    if (['xxs', '2xs', '2xsmall', 'xxsmall'].includes(s)) return 'XX-Small';
    return input.trim();
  }

  private normalizeTags(input?: string | string[]): string[] | undefined {
    if (input == null) return undefined;
    const values = Array.isArray(input) ? input : input.split(/[,，、]/);
    const tags = values.map((value) => value.trim()).filter(Boolean);
    return tags.length > 0 ? tags : undefined;
  }

  private normalizeNumber(input?: number | string): number | undefined {
    if (input == null || input === '') return undefined;
    const value = typeof input === 'number' ? input : Number(input);
    return Number.isFinite(value) ? value : undefined;
  }

  private normalizeDate(input?: Date | string): Date | undefined {
    if (input == null || input === '') return undefined;
    if (input instanceof Date) return input;
    const value = new Date(input);
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  private matchesMetadataFilters(
    garment: Garment,
    dto: SearchGarmentDto,
  ): boolean {
    if (dto.season && !this.hasTag(garment.seasons, dto.season)) return false;
    if (dto.style && !this.hasTag(garment.styleTags, dto.style)) return false;
    if (dto.scene && !this.hasTag(garment.sceneTags, dto.scene)) return false;
    if (dto.keyword && !this.matchesKeyword(garment, dto.keyword)) return false;
    return true;
  }

  private hasTag(tags: string[] | undefined, expected: string): boolean {
    const needle = expected.trim().toLowerCase();
    return Boolean(
      needle && tags?.some((tag) => tag.trim().toLowerCase().includes(needle)),
    );
  }

  private matchesKeyword(garment: Garment, keyword: string): boolean {
    const needle = keyword.trim().toLowerCase();
    if (!needle) return true;
    const values = [
      garment.name,
      garment.notes,
      garment.brand,
      garment.category,
      garment.subcategory,
      garment.material,
      garment.thickness,
      garment.fit,
      garment.purchaseChannel,
      ...(garment.seasons ?? []),
      ...(garment.styleTags ?? []),
      ...(garment.sceneTags ?? []),
    ];
    return values.some((value) => value?.toLowerCase().includes(needle));
  }

  private scoreSimilarity(
    garment: Garment,
    draft: Partial<GarmentVisionResult>,
  ): SimilarGarmentCandidate {
    let score = 0;
    const reasons: string[] = [];

    if (draft.category && garment.category === draft.category) {
      score += 35;
      reasons.push('分类相同');
    }
    if (draft.color && garment.color === draft.color) {
      score += 20;
      reasons.push('颜色相同');
    }
    if (this.sameText(garment.subcategory, draft.subcategory)) {
      score += 25;
      reasons.push('细分相同');
    } else if (this.containsText(garment.subcategory, draft.subcategory)) {
      score += 15;
      reasons.push('细分相近');
    }
    if (this.sameText(garment.material, draft.material)) {
      score += 10;
      reasons.push('材质相同');
    }
    if (this.sameText(garment.thickness, draft.thickness)) {
      score += 5;
      reasons.push('厚薄相同');
    }
    if (
      this.samePositiveFeaturePresence(
        garment.pocketPresence,
        draft.pocketPresence,
      )
    ) {
      score += 10;
      reasons.push('口袋结构相同');
    }
    if (
      this.sameStructuredValue(
        garment.pocketPosition,
        draft.pocketPosition,
        'unknown',
      )
    ) {
      score += 10;
      reasons.push('口袋位置相同');
    }
    if (
      this.samePositiveFeaturePresence(
        garment.chestMarkPresence,
        draft.chestMarkPresence,
      )
    ) {
      score += 8;
      reasons.push('胸前标识状态相同');
    }
    if (
      this.sameStructuredValue(
        garment.chestMarkType,
        draft.chestMarkType,
        'unknown',
      )
    ) {
      score += 10;
      reasons.push('胸前标识类型相同');
    }
    if (
      this.sameStructuredValue(
        garment.chestMarkPosition,
        draft.chestMarkPosition,
        'unknown',
      )
    ) {
      score += 8;
      reasons.push('胸前标识位置相同');
    }
    if (
      this.sameText(garment.chestMarkText, draft.chestMarkText ?? undefined)
    ) {
      score += 15;
      reasons.push('胸前文字相同');
    }

    const seasonOverlap = this.overlapCount(garment.seasons, draft.seasons);
    if (seasonOverlap > 0) {
      score += Math.min(10, seasonOverlap * 5);
      reasons.push('季节相近');
    }

    const styleOverlap = this.overlapCount(garment.styleTags, draft.styleTags);
    if (styleOverlap > 0) {
      score += Math.min(10, styleOverlap * 5);
      reasons.push('风格相近');
    }

    const sceneOverlap = this.overlapCount(garment.sceneTags, draft.sceneTags);
    if (sceneOverlap > 0) {
      score += Math.min(5, sceneOverlap * 3);
      reasons.push('场景相近');
    }

    if (this.containsText(garment.name, draft.subcategory)) {
      score += 10;
      reasons.push('名称相近');
    }

    if (this.hasDistinctiveDetailOverlap(garment, draft)) {
      score += DETAIL_MATCH_SCORE;
      reasons.push('细节相同');
    }

    return { garment, score, reasons };
  }

  private isLikelyDuplicate(
    candidate: SimilarGarmentCandidate,
    draft: Partial<GarmentVisionResult>,
  ): boolean {
    if (this.hasStructuredDifference(candidate.garment, draft)) return false;
    if (candidate.score < DUPLICATE_SCORE_THRESHOLD) return false;
    if (candidate.reasons.includes('细节相同')) return true;

    if (this.isCommonSameColorShape(candidate.garment, draft)) {
      return false;
    }

    return candidate.score >= STRONG_DUPLICATE_SCORE_THRESHOLD;
  }

  private isCommonSameColorShape(
    garment: Garment,
    draft: Partial<GarmentVisionResult>,
  ): boolean {
    if (!draft.category || !draft.color) return false;
    if (garment.category !== draft.category || garment.color !== draft.color) {
      return false;
    }

    const shapeText = this.normalizeComparisonText(
      [garment.subcategory, draft.subcategory].filter(Boolean).join(' '),
    );
    return COMMON_DUPLICATE_SHAPES.some((shape) =>
      shapeText.includes(this.normalizeComparisonText(shape)),
    );
  }

  private hasStructuredDifference(
    garment: Garment,
    draft: Partial<GarmentVisionResult>,
  ): boolean {
    const garmentPocketPresence = this.compareFeaturePresence(
      garment.pocketPresence,
    );
    const draftPocketPresence = this.compareFeaturePresence(
      draft.pocketPresence,
    );
    if (
      garmentPocketPresence &&
      draftPocketPresence &&
      garmentPocketPresence !== draftPocketPresence
    ) {
      return true;
    }

    if (
      garmentPocketPresence === 'yes' &&
      draftPocketPresence === 'yes' &&
      this.structuredValuesDiffer(
        garment.pocketPosition,
        draft.pocketPosition,
        'unknown',
      )
    ) {
      return true;
    }

    const garmentMarkPresence = this.compareFeaturePresence(
      garment.chestMarkPresence,
    );
    const draftMarkPresence = this.compareFeaturePresence(
      draft.chestMarkPresence,
    );
    if (
      garmentMarkPresence &&
      draftMarkPresence &&
      garmentMarkPresence !== draftMarkPresence
    ) {
      return true;
    }

    if (
      garmentMarkPresence === 'yes' &&
      draftMarkPresence === 'yes' &&
      (this.structuredValuesDiffer(
        garment.chestMarkType,
        draft.chestMarkType,
        'unknown',
      ) ||
        this.structuredValuesDiffer(
          garment.chestMarkPosition,
          draft.chestMarkPosition,
          'unknown',
        ))
    ) {
      return true;
    }

    return this.structuredTextsDiffer(
      garment.chestMarkText,
      draft.chestMarkText ?? undefined,
    );
  }

  private hasDistinctiveDetailOverlap(
    garment: Garment,
    draft: Partial<GarmentVisionResult>,
  ): boolean {
    const genericWords = this.genericDetailWords(garment, draft);
    const garmentDetails = [garment.name, garment.notes]
      .map((value) => this.normalizeDistinctiveText(value, genericWords))
      .filter((value) => value.length >= 2);
    const draftDetails = [draft.notes]
      .map((value) => this.normalizeDistinctiveText(value, genericWords))
      .filter((value) => value.length >= 2);

    return garmentDetails.some((left) =>
      draftDetails.some(
        (right) => left.includes(right) || right.includes(left),
      ),
    );
  }

  private genericDetailWords(
    garment: Garment,
    draft: Partial<GarmentVisionResult>,
  ): string[] {
    return [
      garment.category,
      draft.category,
      garment.color,
      draft.color,
      this.resolveColorLabel(garment.color),
      this.resolveColorLabel(draft.color),
      garment.subcategory,
      draft.subcategory,
      garment.chestMarkText,
      draft.chestMarkText ?? undefined,
      '衣服',
      '衣物',
      '适合',
      '场合',
      '日常',
      '休闲',
      '通勤',
      '上班',
      '春',
      '夏',
      '秋',
      '冬',
      ...COMMON_DUPLICATE_SHAPES,
    ].filter((value): value is string => Boolean(value));
  }

  private normalizeDistinctiveText(
    value?: string,
    genericWords: string[] = [],
  ): string {
    let normalized = this.normalizeComparisonText(value);
    for (const word of genericWords) {
      const normalizedWord = this.normalizeComparisonText(word);
      if (normalizedWord)
        normalized = normalized.split(normalizedWord).join('');
    }
    return normalized;
  }

  private normalizeFeaturePresence(
    value?: string | null,
  ): GarmentFeaturePresence | undefined {
    const normalized = this.normalizeComparisonText(value);
    if (!normalized) return undefined;
    return GARMENT_FEATURE_PRESENCE_VALUES.find(
      (item) => item === normalized,
    ) as GarmentFeaturePresence | undefined;
  }

  private normalizePocketPosition(
    presence?: string | null,
    value?: string | null,
  ): GarmentPocketPosition | undefined {
    if (this.normalizeFeaturePresence(presence) !== 'yes') {
      return this.normalizeFeaturePresence(presence) ? 'unknown' : undefined;
    }
    const normalized = this.normalizeStructuredToken(value);
    if (!normalized) return 'unknown';
    return (
      GARMENT_POCKET_POSITION_VALUES.find((item) => item === normalized) ??
      'unknown'
    );
  }

  private normalizeChestMarkType(
    presence?: string | null,
    value?: string | null,
  ): GarmentChestMarkType | undefined {
    if (this.normalizeFeaturePresence(presence) !== 'yes') {
      return this.normalizeFeaturePresence(presence) ? 'unknown' : undefined;
    }
    const normalized = this.normalizeStructuredToken(value);
    if (!normalized) return 'unknown';
    return (
      GARMENT_CHEST_MARK_TYPE_VALUES.find((item) => item === normalized) ??
      'unknown'
    );
  }

  private normalizeChestMarkPosition(
    presence?: string | null,
    value?: string | null,
  ): GarmentChestMarkPosition | undefined {
    if (this.normalizeFeaturePresence(presence) !== 'yes') {
      return this.normalizeFeaturePresence(presence) ? 'unknown' : undefined;
    }
    const normalized = this.normalizeStructuredToken(value);
    if (!normalized) return 'unknown';
    return (
      GARMENT_CHEST_MARK_POSITION_VALUES.find((item) => item === normalized) ??
      'unknown'
    );
  }

  private normalizeChestMarkText(
    presence?: string | null,
    value?: string | null,
  ): string | undefined {
    if (this.normalizeFeaturePresence(presence) !== 'yes') {
      return this.normalizeFeaturePresence(presence) ? undefined : undefined;
    }
    const text = value?.trim();
    return text ? text : undefined;
  }

  private compareFeaturePresence(
    value?: string | null,
  ): 'yes' | 'no' | undefined {
    const normalized = this.normalizeFeaturePresence(value);
    return normalized === 'yes' || normalized === 'no' ? normalized : undefined;
  }

  private samePositiveFeaturePresence(
    left?: string | null,
    right?: string | null,
  ): boolean {
    const normalizedLeft = this.compareFeaturePresence(left);
    const normalizedRight = this.compareFeaturePresence(right);
    return normalizedLeft === 'yes' && normalizedRight === 'yes';
  }

  private sameStructuredValue(
    left?: string | null,
    right?: string | null,
    unknownValue = 'unknown',
  ): boolean {
    const normalizedLeft = this.normalizeComparisonText(left);
    const normalizedRight = this.normalizeComparisonText(right);
    return Boolean(
      normalizedLeft &&
        normalizedRight &&
        normalizedLeft !== unknownValue &&
        normalizedRight !== unknownValue &&
        normalizedLeft === normalizedRight,
    );
  }

  private structuredValuesDiffer(
    left?: string | null,
    right?: string | null,
    unknownValue = 'unknown',
  ): boolean {
    const normalizedLeft = this.normalizeComparisonText(left);
    const normalizedRight = this.normalizeComparisonText(right);
    return Boolean(
      normalizedLeft &&
        normalizedRight &&
        normalizedLeft !== unknownValue &&
        normalizedRight !== unknownValue &&
        normalizedLeft !== normalizedRight,
    );
  }

  private structuredTextsDiffer(
    left?: string | null,
    right?: string | null,
  ): boolean {
    const normalizedLeft = this.normalizeComparisonText(left);
    const normalizedRight = this.normalizeComparisonText(right);
    return Boolean(
      normalizedLeft && normalizedRight && normalizedLeft !== normalizedRight,
    );
  }

  private sameText(left?: string, right?: string): boolean {
    const normalizedLeft = this.normalizeComparisonText(left);
    const normalizedRight = this.normalizeComparisonText(right);
    return Boolean(normalizedLeft && normalizedLeft === normalizedRight);
  }

  private containsText(left?: string, right?: string): boolean {
    const normalizedLeft = this.normalizeComparisonText(left);
    const normalizedRight = this.normalizeComparisonText(right);
    return Boolean(
      normalizedLeft &&
        normalizedRight &&
        (normalizedLeft.includes(normalizedRight) ||
          normalizedRight.includes(normalizedLeft)),
    );
  }

  private overlapCount(left?: string[], right?: string[]): number {
    const leftValues = new Set(
      (left ?? []).map((value) => this.normalizeComparisonText(value)),
    );
    return (right ?? []).filter((value) =>
      leftValues.has(this.normalizeComparisonText(value)),
    ).length;
  }

  private normalizeComparisonText(value?: string | null): string {
    return (value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[\s,，、。._-]+/g, '');
  }

  private normalizeStructuredToken(value?: string | null): string {
    return (value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-');
  }
}
