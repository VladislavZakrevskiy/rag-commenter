import { Module } from '@nestjs/common';
import { PhotoshopService } from './photoshop.service';

@Module({
  providers: [PhotoshopService],
  exports: [PhotoshopService],
})
export class PhotoshopModule {}
