import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async findSimilarTexts(embedding: number[], limit = 10) {
    return await this.$queryRaw`
      SELECT 
        t.id,
        t.content,
        t."postId",
        p.id as post_id,
        p."telegramMessageId",
        p."channelId",
        p."authorUsername",
        (t.embedding <-> ${embedding}::vector) as distance
      FROM texts t
      JOIN posts p ON p.id = t."postId"
      WHERE t.embedding IS NOT NULL
      ORDER BY t.embedding <-> ${embedding}::vector
      LIMIT ${limit}
    `;
  }

  async createTextWithEmbedding(data: {
    content: string;
    embedding: number[];
    postId: string;
  }) {
    const id = this.generateCuid();
    return await this.$executeRaw`
      INSERT INTO texts (id, content, embedding, "postId")
      VALUES (${id}, ${data.content}, ${data.embedding}::vector, ${data.postId})
    `;
  }

  private generateCuid(): string {
    // Простая реализация cuid для примера
    return 'c' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
