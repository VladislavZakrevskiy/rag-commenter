import { Injectable, Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf, Context } from 'telegraf';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(@InjectBot() private readonly bot: Telegraf<Context>) {}

  async sendMessage(
    chatId: string | number,
    text: string,
    options?: Record<string, unknown>,
  ) {
    try {
      return await this.bot.telegram.sendMessage(chatId, text, options);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      } else {
        this.logger.error(`Failed to send message: ${error}`);
      }

      throw error;
    }
  }

  sendMediaGroup: typeof this.bot.telegram.sendMediaGroup = async (
    chatId,
    media,
    options,
  ) => {
    try {
      return await this.bot.telegram.sendMediaGroup(chatId, media, options);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to send media group: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      } else {
        this.logger.error(`Failed to send media group: ${error}`);
      }
      throw error;
    }
  };

  async downloadFile(fileId: string): Promise<Buffer> {
    try {
      const fileUrl = await this.bot.telegram.getFileLink(fileId);
      const response = await fetch(fileUrl.href);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      } else {
        this.logger.error(`Failed to download file: ${error}`);
      }
      throw error;
    }
  }

  async replyToMessage(
    chatId: string | number,
    messageId: number,
    text: string,
  ) {
    return this.sendMessage(chatId, text, {
      reply_to_message_id: messageId,
    });
  }
}
