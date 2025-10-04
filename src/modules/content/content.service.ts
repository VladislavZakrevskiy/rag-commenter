import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PostService } from '../post/post.service';
import { AiService } from '../ai/ai.service';
import { TelegramService } from '../telegram/telegram.service';
import type { SimilarText, TelegramMessage, TelegramPhoto } from '../../types';
import { Post } from '@prisma/client';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PhotoshopService } from '../photoshop/photoshop.service';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    @InjectQueue('comment-generation') private commentQueue: Queue,
    private readonly postService: PostService,
    private readonly aiService: AiService,
    private readonly telegramService: TelegramService,
    private readonly photoshopService: PhotoshopService,
    @InjectBot() private readonly bot: Telegraf,
    private readonly configService: ConfigService,
  ) {}

  async processMessageAndReply(message: TelegramMessage) {
    try {
      this.logger.log(
        `Processing message ${message.message_id} for immediate reply`,
      );

      const post = await this.postService.createPost({
        telegramMessageId: message.message_id,
        channelId: message.chat.id.toString(),
        authorUsername: message.from?.username,
      });

      const text = message.text || message.caption;

      this.logger.log(`message111: ${JSON.stringify(message, null, 2)}`);

      if (text) {
        await this.processText(post.id, text);
      }

      if (message.photo && message.photo.length > 0) {
        await this.processImages(
          post.id,
          Object.values(
            message.photo.reduce(
              (acc, curr) => {
                if (acc[curr.file_id]) {
                  return acc;
                }

                acc[curr.file_id] = curr;
                return acc;
              },
              {} as Record<string, TelegramPhoto>,
            ),
          ),
        );
      }

      await this.generateAndSendReply(post, message);

      this.logger.log(`Message ${message.message_id} processed and reply sent`);
    } catch (error) {
      this.logger.error(
        `Error processing message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      try {
        await this.telegramService.sendMessage(
          message.chat.id,
          '🤔 Что-то пошло не так, но я все равно отвечу!',
          { reply_to_message_id: message.message_id },
        );
      } catch {
        this.logger.error('Failed to send error reply');
      }
    }
  }

  private async generateAndSendReply(
    post: Post,
    originalMessage: TelegramMessage,
  ) {
    try {
      const postWithTexts = await this.postService.getPostWithTexts(post.id);

      if (!postWithTexts) {
        this.logger.error(
          `Could not retrieve post ${post.id} with texts after creation.`,
        );
        return;
      }

      let relevantPosts: SimilarText[] = [];
      if (postWithTexts.texts && postWithTexts.texts.length > 0) {
        const embedding = await this.aiService.createEmbedding(
          postWithTexts.texts[0].content,
        );
        relevantPosts = await this.aiService.findRelevantPosts(embedding, 10);
      }

      const styles = [
        'FUNNY',
        'WHORE',
        'TOXIC',
        'TRUMP',
        'DIMA',
        'POZDNYAKOV',
      ] as const;
      const selectedStyle = styles[Math.floor(Math.random() * styles.length)];

      const relevantPostsWithImages = await this.postService.getPostsWithImages(
        relevantPosts.map((p) => p.post_id),
      );

      const allImages = relevantPostsWithImages.flatMap((p) => p.images);

      const shuffledImages = allImages.sort(() => 0.5 - Math.random());
      const imageCount =
        allImages.length > 0
          ? Math.floor(Math.random() * Math.min(3, allImages.length)) + 1
          : 0;
      const selectedImages = shuffledImages.slice(0, imageCount);

      const replyText = await this.aiService.generateComment({
        originalPost: postWithTexts,
        relevantPosts: relevantPosts,
        selectedImages: selectedImages,
        style: selectedStyle,
      });

      let sentMessageId: number;

      if (selectedImages.length > 0) {
        const photoshoppedImages = (
          await Promise.all(
            selectedImages.map(async (img, i) => {
              if (Math.random() < 0.5) {
                return img.filename;
              }

              const topText =
                this.getEllipsis(relevantPosts[i]?.content, 20) || '';
              const bottomText =
                this.getEllipsis(relevantPosts[i + 1]?.content, 20) || '';

              const photoshoppedImage = await this.photoshopService.mutate(
                img.s3Url,
                {
                  topText,
                  bottomText,
                },
              );
              return photoshoppedImage;
            }),
          )
        ).filter((item) => item !== null);

        if (photoshoppedImages.length > 0) {
          const message = await this.telegramService.sendMediaGroup(
            originalMessage.chat.id,
            photoshoppedImages.map((img, i) => ({
              type: 'photo',
              media: img,
              caption: i === 0 ? replyText : undefined,
            })),
            {
              // АПИ не соответствует типу - рофл. игнор тотал
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              reply_to_message_id: originalMessage.message_id,
            },
          );

          sentMessageId = message[0].message_id;
        } else {
          // Одинаковый код впадлу писать метод
          const message = await this.telegramService.sendMessage(
            originalMessage.chat.id,
            replyText,
            {
              reply_to_message_id: originalMessage.message_id,
            },
          );

          sentMessageId = message.message_id;
        }
      } else {
        // Одинаковый код впадлу писать метод
        const message = await this.telegramService.sendMessage(
          originalMessage.chat.id,
          replyText,
          {
            reply_to_message_id: originalMessage.message_id,
          },
        );

        sentMessageId = message.message_id;
      }

      await this.postService.createComment({
        content: replyText,
        style: selectedStyle,
        telegramMessageId: sentMessageId,
        post: {
          connect: {
            id: post.id,
          },
        },
        relevantPostIds: relevantPosts.map((p) => p.id),
      });

      this.logger.log(`Reply sent with message ID: ${sentMessageId}`);
    } catch (error) {
      this.logger.error(
        `Error generating reply: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      throw error;
    }
  }

  async processChannelMessage(message: TelegramMessage) {
    try {
      this.logger.log(`Processing message ${message.message_id}`);

      const post = await this.postService.createPost({
        telegramMessageId: message.message_id,
        channelId: message.chat.id.toString(),
        authorUsername: message.from?.username,
      });

      const text = message.text || message.caption;

      if (text) {
        await this.processText(post.id, text);
      }

      if (message.photo && message.photo.length > 0) {
        await this.processImages(post.id, message.photo);
      }

      await this.commentQueue.add(
        'generate-comment',
        { postId: post.id },
        { delay: 5000 },
      );

      this.logger.log(`Message ${message.message_id} processed successfully`);
    } catch (error) {
      this.logger.error(
        `Error processing message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  private async processText(postId: string, text: string) {
    try {
      const embedding = await this.aiService.createEmbedding(text);

      await this.postService.createText({
        content: text,
        embedding: embedding,
        postId: postId,
      });

      this.logger.log(`Text processed for post ${postId}`);
    } catch (error) {
      this.logger.error(
        `Error processing text: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  private async processImages(postId: string, photos: TelegramPhoto[]) {
    try {
      const bestPhoto = photos[photos.length - 1];
      const botToken = this.configService.get<string>('telegram.botToken');
      const { file_path } = await this.bot.telegram.getFile(bestPhoto.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${file_path}`;

      this.logger.log(`fileUrl111: ${fileUrl}`);

      await this.postService.createImage({
        filename: bestPhoto.file_id,
        s3Key: randomUUID(),
        s3Url: fileUrl,
        mimeType: 'image/jpeg',
        fileSize: bestPhoto.file_size || 0,
        postId: postId,
      });

      this.logger.log(`Image processed for post ${postId}`);
    } catch (error) {
      this.logger.error(
        `Error processing images: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  private getEllipsis(text: string, maxLength: number) {
    if (text.length <= maxLength) {
      return text;
    }

    return text.substring(0, maxLength) + '...';
  }
}
