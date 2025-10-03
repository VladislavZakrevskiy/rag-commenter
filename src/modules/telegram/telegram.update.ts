import { Injectable, Logger } from '@nestjs/common';
import { Update, Ctx, On } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { ContentService } from '../content/content.service';
import type { TelegramMessage } from '../../types';

@Update()
@Injectable()
export class TelegramUpdate {
  private readonly logger = new Logger(TelegramUpdate.name);

  constructor(private readonly contentService: ContentService) {}

  @On('text')
  async onMessage(@Ctx() ctx: Context) {
    try {
      const message = ctx.message as TelegramMessage;
      if (!message || !message.text) return;

      if (message.from?.is_bot) return;

      if (message.text.startsWith('/')) return;

      this.logger.log(
        `Received message: ${message.message_id} from ${message.from?.username || 'unknown'}`,
      );

      await this.contentService.processMessageAndReply(message);
    } catch (error) {
      this.logger.error(
        `Error processing message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @On('photo')
  async onPhoto(@Ctx() ctx: Context) {
    try {
      const message = ctx.message as TelegramMessage;
      if (!message || !message.photo) return;

      if (message.from?.is_bot) return;

      this.logger.log(
        `Received photo: ${message.message_id} from ${message.from?.username || 'unknown'}`,
      );

      await this.contentService.processMessageAndReply(message);
    } catch (error) {
      this.logger.error(
        `Error processing photo: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @On('sticker')
  async onSticker(@Ctx() ctx: Context) {
    try {
      const message = ctx.message as TelegramMessage;
      if (!message) return;

      if (message.from?.is_bot) return;

      this.logger.log(
        `Received sticker: ${message.message_id} from ${message.from?.username || 'unknown'}`,
      );

      await this.contentService.processMessageAndReply(message);
    } catch (error) {
      this.logger.error(
        `Error processing sticker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
