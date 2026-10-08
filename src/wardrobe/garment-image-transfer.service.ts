import { BadRequestException, Injectable } from '@nestjs/common';
import { extname } from 'node:path';
import { buffer } from 'node:stream/consumers';
import type { File } from '../dal/entity/file.entity';
import { FileService } from '../file/file-service.abstract';
import type { CreateGarmentDto } from './dto/create-garment.dto';
import { GarmentService, type StoredGarmentPhotoRef } from './garment.service';
import {
  GarmentImageNormalizationService,
  type NormalizationTransferSnapshot,
} from './garment-image-normalization.service';

export interface GarmentTransferImages {
  photo?: string;
  originalPhoto?: string;
  normalizationSnapshot?: NormalizationTransferSnapshot<string>;
}
export type ExportImageRegistry = Map<number, { name: string; data: Buffer }>;

/** 全包预检时使用；只检查图片合同，不写文件、衣物或任务。 */
export function assertCompleteImageReferences(
  images: GarmentTransferImages,
  entries: Map<string, Buffer>,
): void {
  const snapshot = images.normalizationSnapshot;
  if (
    snapshot &&
    (!['queued', 'processing', 'uncertain', 'ready', 'failed'].includes(
      snapshot.status,
    ) ||
      !['上衣', '裤子', '半身裙', '连衣裙', '外套'].includes(
        snapshot.promptFamily,
      ) ||
      typeof snapshot.promptVersion !== 'string' ||
      !snapshot.promptVersion ||
      snapshot.promptVersion.length > 100 ||
      snapshot.model !== 'qwen-image-3.0-pro' ||
      !snapshot.sourcePhotoRef ||
      (snapshot.status === 'ready' && !snapshot.candidatePhotoRef))
  )
    throw new BadRequestException('整理快照不完整或格式不正确');
  for (const ref of [
    images.photo,
    images.originalPhoto,
    snapshot?.sourcePhotoRef,
    snapshot?.candidatePhotoRef,
  ]) {
    if (ref == null || ref === '') continue;
    if (typeof ref !== 'string' || !entries.has(ref) || ref === 'manifest.json')
      throw new BadRequestException('备份包缺少声明的图片，数据不完整');
  }
}

/** 图片转移协调器：只调用 Owner/文件公开方法，不访问内部 Repository。 */
@Injectable()
export class GarmentImageTransferService {
  constructor(
    private readonly garments: GarmentService,
    private readonly normalization: GarmentImageNormalizationService,
    private readonly files: FileService,
  ) {}

  async exportImages(
    id: number,
    userId: number,
    registry: ExportImageRegistry,
  ): Promise<GarmentTransferImages> {
    const photos = await this.garments.exportPhotoSnapshot(id, userId);
    const snapshot = await this.normalization.exportSnapshot(id, userId);
    const reference = async (
      file: StoredGarmentPhotoRef | undefined,
    ): Promise<string | undefined> => {
      if (!file) return undefined;
      if (!registry.has(file.id)) {
        const stream = await this.files.get(file.fileName);
        if (!stream)
          throw new BadRequestException('原衣橱缺少图片，不能导出完整备份');
        registry.set(file.id, {
          name: `photos/image-${file.id}${extname(file.fileName) || '.png'}`,
          data: await buffer(stream),
        });
      }
      return registry.get(file.id)!.name;
    };
    return {
      photo: await reference(photos.photo),
      originalPhoto: await reference(photos.originalPhoto),
      normalizationSnapshot: snapshot
        ? {
            status: snapshot.status,
            promptFamily: snapshot.promptFamily,
            promptVersion: snapshot.promptVersion,
            model: snapshot.model,
            sourcePhotoRef: (await reference(snapshot.sourcePhotoRef))!,
            candidatePhotoRef: await reference(snapshot.candidatePhotoRef),
          }
        : undefined,
    };
  }

  async importImages(
    dto: CreateGarmentDto,
    images: GarmentTransferImages,
    entries: Map<string, Buffer>,
    userId: number,
    registry: Map<string, File>,
  ) {
    assertCompleteImageReferences(images, entries);
    const reference = async (
      ref: string | undefined,
    ): Promise<File | undefined> => {
      if (!ref) return undefined;
      if (!registry.has(ref))
        registry.set(
          ref,
          await this.files.storePrivateImageBuffer(entries.get(ref)!, userId),
        );
      return registry.get(ref)!;
    };
    const photo = await reference(images.photo),
      original = await reference(images.originalPhoto);
    const source = await reference(
      images.normalizationSnapshot?.sourcePhotoRef,
    );
    const candidate = await reference(
      images.normalizationSnapshot?.candidatePhotoRef,
    );
    const created = await this.garments.create(
      {
        ...dto,
        photo: undefined,
        photoSource: 'stored-image',
        photoFileName: photo?.fileName,
        originalPhotoFileName: original?.fileName,
      },
      userId,
    );
    if (images.normalizationSnapshot)
      await this.normalization.restoreSnapshot(created.id, userId, {
        ...images.normalizationSnapshot,
        sourcePhotoRef: source!.id,
        candidatePhotoRef: candidate?.id,
      });
    return created;
  }

  async copyImages(
    id: number,
    sourceUserId: number,
    targetUserId: number,
    dto: CreateGarmentDto,
    registry: Map<number, File>,
  ) {
    const photos = await this.garments.exportPhotoSnapshot(id, sourceUserId);
    const snapshot = await this.normalization.exportSnapshot(id, sourceUserId);
    const reference = async (
      ref: StoredGarmentPhotoRef | undefined,
    ): Promise<File | undefined> => {
      if (!ref) return undefined;
      if (!registry.has(ref.id))
        registry.set(
          ref.id,
          await this.files.copyStoredFile(ref.fileName, targetUserId),
        );
      return registry.get(ref.id)!;
    };
    const photo = await reference(photos.photo),
      original = await reference(photos.originalPhoto);
    const source = await reference(snapshot?.sourcePhotoRef),
      candidate = await reference(snapshot?.candidatePhotoRef);
    const created = await this.garments.create(
      {
        ...dto,
        photo: undefined,
        photoSource: 'stored-image',
        photoFileName: photo?.fileName,
        originalPhotoFileName: original?.fileName,
      },
      targetUserId,
    );
    if (snapshot)
      await this.normalization.restoreSnapshot(created.id, targetUserId, {
        ...snapshot,
        sourcePhotoRef: source!.id,
        candidatePhotoRef: candidate?.id,
      });
    return created;
  }
}
