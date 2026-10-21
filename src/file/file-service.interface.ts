import { MultipartFile } from '@fastify/multipart';
import { NotFoundException } from '@nestjs/common';
import type { File } from '../dal/entity/file.entity';
import { Readable } from 'stream';

export interface GarmentPhotos {
  originalPhoto: File;
  photo: File;
}

/** 私有前缀只是存储标记；业务读取还必须验证图片所属主人。 */
export function isPrivateImageFileName(fileName: string): boolean {
  return fileName.toLowerCase().startsWith('private-');
}

export function isStoredImageFileName(fileName: string): boolean {
  if (!fileName || /^[.]|[/\\%:]/.test(fileName)) return false;
  for (let index = 0; index < fileName.length; index += 1) {
    const code = fileName.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return false;
  }
  return true;
}

export function assertPublicImageFileName(fileName: string): void {
  if (!isStoredImageFileName(fileName) || isPrivateImageFileName(fileName)) {
    throw new NotFoundException('图片不存在');
  }
}

const STORED_FILE_MIMETYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  avif: 'image/avif',
  heif: 'image/heif',
  heic: 'image/heif',
};

export function mimetypeForStoredFileName(
  fileName: string,
): string | undefined {
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0 || dot === fileName.length - 1) return undefined;
  return STORED_FILE_MIMETYPES[fileName.slice(dot + 1).toLowerCase()];
}

export interface FileServiceInterface {
  storeGarmentPhotosFromFileUpload(
    upload: MultipartFile | undefined,
    userId: number,
  ): Promise<GarmentPhotos>;
  storePrivateImageBuffer(input: Buffer, userId: number): Promise<File>;
  /**
   * @param file FileUpload with readableStream & supporting information on the upload
   * @param userId user responsible for the file
   * @returns imageFileName as it's stored from the upload
   */
  storeImageFromFileUpload(
    upload: MultipartFile | undefined,
    userId: any,
    fileName?: string,
  ): Promise<File>;
  storeOriginalImageFromFileUpload(
    upload: MultipartFile | undefined,
    userId: any,
    fileName?: string,
  ): Promise<File>;
  delete(fileName: string): Promise<void>;
  deleteById(fileId: any, userId: any): Promise<any>;
  get(fileName: string): Promise<Readable | undefined>;
  getByShareableId(shareableId: string): Promise<Readable | undefined>;
}
