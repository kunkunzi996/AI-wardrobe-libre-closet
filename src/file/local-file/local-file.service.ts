import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MultipartFile } from '@fastify/multipart';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { Readable } from 'node:stream';
import { buffer } from 'node:stream/consumers';
import { pipeline } from 'node:stream/promises';
import * as path from 'path';
import { File } from '../../dal/entity/file.entity';
import { FileService } from '../file-service.abstract';

@Injectable()
export class LocalFileService extends FileService {
  private directory: string;

  constructor(
    readonly configService: ConfigService,
    @InjectRepository(File)
    private readonly fileRepository: EntityRepository<File>,
    private readonly em: EntityManager,
  ) {
    super(configService);
    this.logger.debug('constructor');
    this.directory = configService.getOrThrow('DATA_PATH');
    this.setupDir();
  }

  async storeImageFromFileUpload(
    upload: MultipartFile | undefined,
    userId: any,
    fileName?: string,
  ): Promise<File> {
    return this.storeProcessedImageFromFileUpload(
      upload,
      userId,
      (input) => this.prepareGarmentPhotoForStorage(input),
      fileName,
    );
  }

  async storeOriginalImageFromFileUpload(
    upload: MultipartFile | undefined,
    userId: any,
    fileName?: string,
  ): Promise<File> {
    return this.storeProcessedImageFromFileUpload(
      upload,
      userId,
      (input) => this.normalizeOriginalPhoto(input),
      fileName,
    );
  }

  private async storeProcessedImageFromFileUpload(
    upload: MultipartFile | undefined,
    userId: any,
    processImage: (input: Buffer) => Promise<Buffer>,
    fileName?: string,
  ): Promise<File> {
    if (!upload) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }
    // https://github.com/fastify/fastify-multipart/issues/497
    // Unconsumed multipart streams can hang the request; drain before throwing
    if (!upload.mimetype?.startsWith('image/')) {
      upload.file.resume();
      throw new HttpException('Wrong filetype', HttpStatus.BAD_REQUEST);
    }

    const storedFileName = fileName ?? randomUUID() + '.webp';
    const inputBuffer = await buffer(upload.file);
    const outputBuffer = await processImage(inputBuffer);
    await fs.promises.writeFile(
      path.join(this.directory, storedFileName),
      outputBuffer,
    );

    // repository.create => save pattern used to so that the @BeforeInsert decorated method
    // will fire generating a uuid for the shareableId
    const file = this.fileRepository.create({
      fileName: storedFileName,
      createdOn: new Date().toISOString(),
      createdBy: userId,
    });
    await this.em.persistAndFlush(file);
    return file;
  }

  async get(fileName: string): Promise<Readable | undefined> {
    if (fs.existsSync(path.join(this.directory, fileName))) {
      return new Promise((resolve) =>
        resolve(fs.createReadStream(path.join(this.directory, fileName))),
      );
    } else {
      throw new NotFoundException(fileName);
    }
  }

  async getByShareableId(shareableId: string): Promise<Readable> {
    const file = await this.fileRepository.findOneOrFail({ shareableId });
    if (fs.existsSync(path.join(this.directory, file.fileName))) {
      return fs.createReadStream(path.join(this.directory, file.fileName));
    } else {
      throw new NotFoundException(file.fileName);
    }
  }

  async delete(fileName: string): Promise<void> {
    return fs.promises
      .unlink(path.join(this.directory, fileName))
      .catch((err) => this.logger.warn(err));
  }

  public async deleteById(fileId: any, userId: any): Promise<any> {
    const file = await this.fileRepository.findOneOrFail({
      id: fileId,
      createdBy: userId,
    });
    await fs.promises
      .unlink(path.join(this.directory, file.fileName))
      .catch((err) => this.logger.warn(err));
    return this.fileRepository.getEntityManager().removeAndFlush(file);
  }

  protected async store(fileName: string, stream: Readable): Promise<void> {
    await pipeline(
      stream,
      fs.createWriteStream(path.join(this.directory, fileName)),
    );
  }

  setupDir() {
    if (!fs.existsSync(this.directory)) {
      this.logger.debug('creating uploads directory');
      fs.mkdirSync(this.directory, { recursive: true });
    }
    this.logger.debug('uploads directory exists');
  }

  private deleteFile(fileName: string): Promise<void> {
    return fs.promises.unlink(path.join(this.directory, fileName));
  }
}
