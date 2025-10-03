import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { DatabaseModule } from './modules/database/database.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { ContentModule } from './modules/content/content.module';
import { PostModule } from './modules/post/post.module';
import { StorageModule } from './modules/storage/storage.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10) || 6379,
          password: process.env.REDIS_PASSWORD,
        },
      }),
    }),
    DatabaseModule,
    TelegramModule,
    ContentModule,
    PostModule,
    StorageModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
