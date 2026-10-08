import type { Readable } from 'node:stream';

export type GarmentPhotoRole = 'original' | 'display' | 'candidate';

export interface NormalizationView {
  attemptKey: string | null;
  status: 'idle' | 'queued' | 'processing' | 'uncertain' | 'ready' | 'failed';
  family: import('../../ai/garment-image.service').GarmentImageFamily | null;
  message: string;
  originalPhotoUrl: string;
  candidatePhotoUrl: string;
  adopted: boolean;
  canStart: boolean;
  canAdopt: boolean;
}

export interface NormalizationWorkItem {
  recordId: number;
  attemptKey: string;
  garmentId: number;
  ownerId: number;
  sourceFileName: string;
  family: import('../../ai/garment-image.service').GarmentImageFamily;
}

/** 仅 Worker 内部使用，供应商下载 URL 不进入用户响应。 */
export interface NormalizationDownloadWorkItem extends NormalizationWorkItem {
  resultUrl: string;
}

/** 业务读取给 Controller 的流，不包含私有物理文件名。 */
export interface OwnedGarmentPhoto {
  stream: Readable;
  mimetype: string;
}
