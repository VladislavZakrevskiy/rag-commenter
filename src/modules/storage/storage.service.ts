import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('s3.bucketName') || '';

    this.s3Client = new S3Client({
      region: this.configService.get<string>('s3.region') || 'ru-central1',
      endpoint:
        this.configService.get<string>('s3.endpoint') ||
        'https://storage.yandexcloud.net',
      credentials: {
        accessKeyId: this.configService.get<string>('s3.accessKeyId') || '',
        secretAccessKey:
          this.configService.get<string>('s3.secretAccessKey') || '',
      },
      forcePathStyle: true,
    });
  }

  async uploadImage(buffer: Buffer, originalName: string): Promise<string> {
    try {
      const key = `images/${randomUUID()}-${originalName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: this.getContentType(originalName),
        ACL: 'public-read',
      });

      await this.s3Client.send(command);

      this.logger.log(`Image uploaded successfully: ${key}`);
      return key;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to download image: ${error.message}`);
      } else {
        this.logger.error(`Failed to download image: ${error}`);
      }

      throw error;
    }
  }

  async downloadImage(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const chunks: Uint8Array[] = [];

      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to download image: ${error.message}`);
      } else {
        this.logger.error(`Failed to download image: ${error}`);
      }

      throw error;
    }
  }

  getPublicUrl(key: string): string {
    const endpoint = this.configService.get<string>('s3.endpoint');
    return `${endpoint}/${this.bucketName}/${key}`;
  }

  private getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'application/octet-stream';
    }
  }
}
