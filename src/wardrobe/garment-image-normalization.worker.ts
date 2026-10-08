import { MikroORM, RequestContext } from '@mikro-orm/core';
import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { buffer } from 'node:stream/consumers';
import { FileService } from '../file/file-service.abstract';
import {
  GarmentImageError,
  GarmentImageService,
} from '../ai/garment-image.service';
import { GarmentImageNormalizationService } from './garment-image-normalization.service';
import type { NormalizationWorkItem } from './dto/garment-image-normalization.dto';

/** 小程序请求只受理；模型执行由独立数据库上下文驱动。 */
@Injectable()
export class GarmentImageNormalizationWorker
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  constructor(
    private readonly orm: MikroORM,
    private readonly tasks: GarmentImageNormalizationService,
    private readonly images: GarmentImageService,
    private readonly files: FileService,
  ) {}

  async onApplicationBootstrap() {
    // 关闭新生成不能关闭旧任务恢复；只等数据库，不等耗时模型任务。
    await this.tasks.recoverDispatched();
    void this.runPending().catch(() => {});
    this.timer = setInterval(() => {
      void this.runPending().catch(() => {});
    }, 2000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async recoverOnStartup(): Promise<void> {
    await this.tasks.recoverDispatched();
    await this.runPending();
  }

  private async downloadCandidate(work: NormalizationWorkItem, url: string) {
    try {
      const bytes = await this.images.downloadImage(url);
      const file = await this.files.storePrivateImageBuffer(
        bytes,
        work.ownerId,
      );
      await this.tasks.completeCandidate(work, file.id);
    } catch (error) {
      await this.tasks.markUncertain(
        work,
        error instanceof GarmentImageError ? error.code : 'RESULT_NOT_STORED',
      );
    }
  }

  async runPending(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await RequestContext.create(this.orm.em.fork(), async () => {
        // 每轮仅恢复一次已知结果的下载，失败不在本轮无限循环。
        for (const work of await this.tasks.claimResultDownloads())
          await this.downloadCandidate(work, work.resultUrl);
        // 配置门只管首次生成；已有结果下载不依赖生成开关或模型 Key。
        while (this.images.isConfigured()) {
          const work = await this.tasks.claimQueued();
          if (!work) break;
          try {
            const stream = await this.files.get(work.sourceFileName);
            if (!stream) throw new GarmentImageError('failed', 'INPUT_MISSING');
            const result = await this.images.generate(
              await buffer(stream),
              work.family,
            );
            if (!(await this.tasks.saveProviderResult(work, result))) continue;
            await this.downloadCandidate(work, result.imageUrl);
          } catch (error) {
            if (error instanceof GarmentImageError && error.kind === 'failed')
              await this.tasks.markFailed(work, error.code);
            else
              await this.tasks.markUncertain(
                work,
                error instanceof GarmentImageError
                  ? error.code
                  : 'RESULT_NOT_STORED',
              );
          }
        }
      });
    } finally {
      this.running = false;
    }
  }
}
