import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  CreatePostData,
  CreateTextData,
  CreateImageData,
} from '../../types';
import { PostWithTexts } from '../../types';
import { Prisma } from '@prisma/client';

@Injectable()
export class PostService {
  private readonly logger = new Logger(PostService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createPost(data: CreatePostData) {
    return this.prisma.post.create({
      data: {
        telegramMessageId: data.telegramMessageId,
        channelId: data.channelId,
        authorUsername: data.authorUsername,
      },
    });
  }

  async createText(data: CreateTextData) {
    return this.prisma.createTextWithEmbedding(data);
  }

  async createImage(data: CreateImageData) {
    return this.prisma.image.create({
      data,
    });
  }

  async createComment(data: Prisma.CommentCreateInput) {
    return this.prisma.comment.create({
      data,
    });
  }

  async getPostWithTexts(postId: string): Promise<PostWithTexts | null> {
    return this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        texts: true,
        images: true,
      },
    });
  }

  async getPostsWithImages(postIds: string[]): Promise<PostWithTexts[]> {
    return this.prisma.post.findMany({
      where: {
        id: {
          in: postIds,
        },
      },
      include: {
        images: true,
        texts: true,
      },
    });
  }

  async getAllPosts(limit = 100, offset = 0) {
    return this.prisma.post.findMany({
      take: limit,
      skip: offset,
      include: {
        texts: true,
        images: true,
        comments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
