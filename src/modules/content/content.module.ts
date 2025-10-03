import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ContentService } from './content.service';
import { ContentProcessor } from './content.processor';
import { PostModule } from '../post/post.module';
import { StorageModule } from '../storage/storage.module';
import { AiModule } from '../ai/ai.module';
import { TelegramModule } from '../telegram/telegram.module';
import { TelegramUpdate } from '../telegram/telegram.update';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'content-processing',
    }),
    BullModule.registerQueue({
      name: 'comment-generation',
    }),
    PostModule,
    StorageModule,
    AiModule,
    TelegramModule,
  ],
  providers: [ContentService, ContentProcessor, TelegramUpdate],
  exports: [ContentService],
})
export class ContentModule {}
