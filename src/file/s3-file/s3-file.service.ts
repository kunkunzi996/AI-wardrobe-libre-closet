import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MultipartFile } from '@fastify/multipart';
import { randomUUID } from 'crypto';
import { Upload } from '@aws-sdk/lib-storage';
import { InjectS3, type S3 } from 'nestjs-s3';
import { Readable } from 'stream';
import { buffer } from 'node:stream/consumers';
import { File } from '../../dal/entity/file.entity';
import { FileService } from '../file-service.abstract';

@Injectable()
export class S3FileService extends FileService {
  private bucketName: string;

  constructor(
    @InjectS3() private readonly s3: S3,
    readonly configService: ConfigService,
    @InjectRepository(File)
    private readonly fileRepository: EntityRepository<File>,
    private readonly em: EntityManager,
  ) {
    super(configService);
    this.bucketName = configService.get('OBJECT_STORAGE_BUCKET_NAME') as string;
  }

  public async storeImageFromFileUpload(
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

  public async storeOriginalImageFromFileUpload(
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

    const s3Upload = new Upload({
      client: this.s3,
      params: {
        Bucket: this.bucketName,
        Key: storedFileName,
        Body: outputBuffer,
        ContentType: 'image/webp',
      },
    });

    await s3Upload.done();

    const file = this.fileRepository.create({
      fileName: storedFileName,
      createdOn: new Date().toISOString(),
      createdBy: userId,
    });
    await this.em.persistAndFlush(file);
    return file;
  }

  public async delete(url: string): Promise<void> {
    this.logger.debug(this.delete.name);
    const splitUrl = url.split('/');
    const objectName = splitUrl[splitUrl.length - 1];
    await this.s3.deleteObject({
      Bucket: this.bucketName,
      Key: objectName,
    });
    this.logger.debug(`Deleted image by url ${url}`);
  }

  public async deleteById(fileId: any, userId: any): Promise<any> {
    const file = await this.fileRepository.findOneOrFail({
      id: fileId,
      createdBy: userId,
    });
    await this.s3.deleteObject({
      Bucket: this.bucketName,
      Key: file.fileName,
    });
    return this.fileRepository.getEntityManager().removeAndFlush(file);
  }

  async get(fileName: string): Promise<Readable | undefined> {
    const result = await this.s3.getObject({
      Bucket: this.bucketName,
      Key: fileName,
    });
    return result.Body as Readable;
  }

  async getByShareableId(shareableId: string): Promise<Readable | undefined> {
    const file = await this.fileRepository.findOneOrFail({ shareableId });
    const result = await this.s3.getObject({
      Bucket: this.bucketName,
      Key: file.fileName,
    });
    return result.Body as Readable;
  }

  protected async store(fileName: string, stream: Readable): Promise<void> {
    const upload = new Upload({
      client: this.s3,
      params: {
        Bucket: this.bucketName,
        Key: fileName,
        Body: stream,
        ContentType: 'image/webp',
      },
    });
    await upload.done();
  }
}
