import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PostService } from '../post/post.service';
import { AiService } from '../ai/ai.service';
import { TelegramService } from '../telegram/telegram.service';
import type { CommentGenerationJob, PostImage, SimilarText } from '../../types';

@Processor('comment-generation')
export class ContentProcessor {
  private readonly logger = new Logger(ContentProcessor.name);

  constructor(
    private readonly postService: PostService,
    private readonly aiService: AiService,
    private readonly telegramService: TelegramService,
  ) {}

  @Process('generate-comment')
  async generateComment(job: Job<CommentGenerationJob>) {
    const { postId } = job.data;

    try {
      this.logger.log(`Generating comment for post ${postId}`);

      const post = await this.postService.getPostWithTexts(postId);
      if (!post || !post.texts.length) {
        this.logger.warn(`No texts found for post ${postId}`);
        return;
      }

      const firstText = post.texts[0];
      if (!firstText) {
        this.logger.warn(`No texts found for post ${postId}`);
        return;
      }

      const embedding = await this.aiService.createEmbedding(firstText.content);
      const relevantPosts = await this.aiService.findRelevantPosts(
        embedding,
        10,
      );

      const selectedImages = this.selectRandomImages(relevantPosts, 1, 3);

      const styles = [
        'FUNNY',
        'WHORE',
        'TOXIC',
        'TRUMP',
        'DIMA',
        'POZDNYAKOV',
      ] as const;
      const selectedStyle = styles[Math.floor(Math.random() * styles.length)];

      const comment = await this.aiService.generateComment({
        originalPost: post,
        relevantPosts: relevantPosts,
        selectedImages: selectedImages,
        style: selectedStyle,
      });

      this.logger.log(
        `Comment: ${comment} ${selectedImages.map((img) => img.s3Url).join(', ')}`,
      );

      let sentMessageId: number;

      if (selectedImages.length > 0) {
        const message = await this.telegramService.sendMediaGroup(
          post.channelId,
          selectedImages.map((img, i) => ({
            type: 'photo',
            media: img.filename,
            caption: i === 0 ? comment : undefined,
          })),
          {
            reply_parameters: {
              message_id: post.telegramMessageId,
            },
          },
        );
        sentMessageId = message[0].message_id;
      } else {
        const sentMessage = await this.telegramService.sendMessage(
          post.channelId,
          comment,
          { reply_to_message_id: post.telegramMessageId },
        );

        sentMessageId = sentMessage.message_id;
      }

      await this.postService.createComment({
        content: comment,
        // похуй мне
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        style: selectedStyle,
        telegramMessageId: sentMessageId,
        post: {
          connect: {
            id: post.id,
          },
        },
        relevantPostIds: relevantPosts.map((p) => p.id),
      });

      this.logger.log(`Comment generated and posted for post ${postId}`);
    } catch (error) {
      this.logger.error(
        `Error generating comment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  private selectRandomImages(
    posts: SimilarText[],
    min: number,
    max: number,
  ): PostImage[] {
    const allImages: PostImage[] = [];
    if (allImages.length === 0) return [];

    const count = Math.floor(Math.random() * (max - min + 1)) + min;
    const shuffled = allImages.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, allImages.length));
  }
}
