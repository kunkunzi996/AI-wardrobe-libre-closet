import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Render,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { I18n, I18nContext } from 'nestjs-i18n';
import { ConditionalAuthGuard } from '../auth/conditional-auth.guard';
import { Payload } from '../auth/dto/payload.dto';
import { GarmentCategory } from './garment-category.enum';
import { GarmentColor } from './garment-color.enum';
import { GarmentStatus } from './garment-status.enum';
import { GarmentService } from './garment.service';
import { WardrobeRecommendationService } from './recommendation/wardrobe-recommendation.service';
import type { SearchGarmentDto } from './dto/search-garment.dto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { MultipartFile } from '@fastify/multipart';

@UseGuards(ConditionalAuthGuard)
@Controller('wardrobe')
export class WardrobeController {
  private readonly logger = new Logger(WardrobeController.name);

  constructor(
    @Inject()
    private readonly garmentService: GarmentService,
    @Inject()
    private readonly recommendationService: WardrobeRecommendationService,
  ) {}

  private userId(req: any): number | undefined {
    return (req['user'] as Payload | undefined)?.userId;
  }

  @Get()
  @Render('wardrobe/index')
  async index(
    @Req() req: FastifyRequest,
    @Query() query: SearchGarmentDto,
    @I18n() i18n: I18nContext,
  ) {
    const [garments, filters] = await Promise.all([
      this.garmentService.findAll(this.userId(req), query),
      this.garmentService.findAvailableFilters(this.userId(req)),
    ]);
    const availableCategories = filters.categories.map((value) => ({
      value,
      label: this.garmentService.resolveCategoryLabel(value, i18n),
    }));
    return {
      garments,
      availableCategories,
      colors: Object.values(GarmentColor),
      availableSizes: filters.sizes,
      search: query,
      statuses: Object.values(GarmentStatus),
    };
  }

  @Get('new')
  @Render('wardrobe/form')
  async newForm(@Req() req: FastifyRequest, @I18n() i18n: I18nContext) {
    const filters = await this.garmentService.findAvailableFilters(
      this.userId(req),
    );
    const enumValues = Object.values(GarmentCategory) as string[];
    const customCategories = filters.categories.filter(
      (c) => !enumValues.includes(c),
    );
    const categories = [...enumValues, ...customCategories].map((value) => ({
      value,
      label: this.garmentService.resolveCategoryLabel(value, i18n),
    }));
    return {
      categories,
      colors: Object.values(GarmentColor),
      statuses: Object.values(GarmentStatus),
      garment: null,
    };
  }

  @Get('recommend')
  @Render('wardrobe/recommend')
  async recommendForm(
    @Req() req: FastifyRequest,
    @Query('q') q: string | undefined,
    @I18n() i18n: I18nContext,
  ) {
    const result = q
      ? await this.recommendationService.recommend(this.userId(req), q)
      : null;
    return this.recommendViewModel(result, q ?? '', i18n);
  }

  @Post('recommend')
  @Render('wardrobe/recommend')
  async recommend(
    @Req() req: FastifyRequest,
    @Body() body: { q?: string },
    @I18n() i18n: I18nContext,
  ) {
    const q = body.q?.trim() ?? '';
    const result = q
      ? await this.recommendationService.recommend(this.userId(req), q)
      : null;
    return this.recommendViewModel(result, q, i18n);
  }

  @Post()
  async create(
    @Body()
    body: {
      name?: string;
      category: string;
      brand?: string;
      color?: GarmentColor;
      size?: string;
      subcategory?: string;
      seasons?: string;
      styleTags?: string;
      sceneTags?: string;
      material?: string;
      thickness?: string;
      fit?: string;
      status?: GarmentStatus;
      price?: string;
      purchaseDate?: string;
      purchaseChannel?: string;
      notes?: string;
    },
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const garment = await this.garmentService.create(
      {
        name: body.name,
        category: body.category,
        brand: body.brand,
        color: body.color,
        size: body.size,
        subcategory: body.subcategory,
        seasons: body.seasons,
        styleTags: body.styleTags,
        sceneTags: body.sceneTags,
        material: body.material,
        thickness: body.thickness,
        fit: body.fit,
        status: body.status,
        price: body.price,
        purchaseDate: body.purchaseDate,
        purchaseChannel: body.purchaseChannel,
        notes: body.notes,
      },
      this.userId(req),
    );
    return reply.redirect(`/wardrobe/${garment.id}`, 302);
  }

  private recommendViewModel(
    result: Awaited<ReturnType<WardrobeRecommendationService['recommend']>> | null,
    q: string,
    i18n: I18nContext,
  ) {
    return {
      q,
      result: result
        ? {
            ...result,
            groups: result.groups.map((group) => ({
              ...group,
              categoryLabel: this.garmentService.resolveCategoryLabel(
                group.category,
                i18n,
              ),
            })),
          }
        : null,
    };
  }

  @Get(':id')
  @Render('wardrobe/show')
  async show(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @I18n() i18n: I18nContext,
  ) {
    const garment = await this.garmentService.findOne(id, this.userId(req));
    return {
      garment,
      categoryLabel: this.garmentService.resolveCategoryLabel(
        garment.category,
        i18n,
      ),
    };
  }

  @Get(':id/edit')
  @Render('wardrobe/form')
  async editForm(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @I18n() i18n: I18nContext,
  ) {
    const [garment, filters] = await Promise.all([
      this.garmentService.findOne(id, this.userId(req)),
      this.garmentService.findAvailableFilters(this.userId(req)),
    ]);
    const enumValues = Object.values(GarmentCategory) as string[];
    const customCategories = filters.categories.filter(
      (c) => !enumValues.includes(c),
    );
    const categories = [...enumValues, ...customCategories].map((value) => ({
      value,
      label: this.garmentService.resolveCategoryLabel(value, i18n),
    }));
    return {
      garment,
      categories,
      colors: Object.values(GarmentColor),
      statuses: Object.values(GarmentStatus),
    };
  }

  @Post(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      category?: string;
      brand?: string;
      color?: GarmentColor;
      size?: string;
      subcategory?: string;
      seasons?: string;
      styleTags?: string;
      sceneTags?: string;
      material?: string;
      thickness?: string;
      fit?: string;
      status?: GarmentStatus;
      price?: string;
      purchaseDate?: string;
      purchaseChannel?: string;
      notes?: string;
    },
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    await this.garmentService.update(
      id,
      {
        name: body.name,
        category: body.category,
        brand: body.brand,
        color: body.color,
        size: body.size,
        subcategory: body.subcategory,
        seasons: body.seasons,
        styleTags: body.styleTags,
        sceneTags: body.sceneTags,
        material: body.material,
        thickness: body.thickness,
        fit: body.fit,
        status: body.status,
        price: body.price,
        purchaseDate: body.purchaseDate,
        purchaseChannel: body.purchaseChannel,
        notes: body.notes,
      },
      this.userId(req),
    );
    return reply.redirect(`/wardrobe/${id}`, 302);
  }

  @Post(':id/photo')
  async uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const files = req.files({ limits: { files: 2 } });
    let photo: MultipartFile | undefined;
    let nobgPhoto: MultipartFile | undefined;

    for await (const file of files) {
      if (file.fieldname === 'photo') {
        photo = file;
      } else if (file.fieldname === 'nobgPhoto') {
        nobgPhoto = file;
      }
    }

    await this.garmentService.update(
      id,
      { photo, nobgPhoto },
      this.userId(req),
    );
    reply.header('HX-Redirect', `/wardrobe/${id}`);
    return reply.send();
  }

  @Post(':id/nobg')
  async updateNobg(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const nobgPhoto = await req.file();
    await this.garmentService.updateNobg(id, nobgPhoto, this.userId(req));
    reply.header('HX-Redirect', `/wardrobe/${id}`);
    return reply.send();
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    await this.garmentService.remove(id, this.userId(req));
    reply.header('HX-Redirect', '/wardrobe');
    return reply.send();
  }
}
