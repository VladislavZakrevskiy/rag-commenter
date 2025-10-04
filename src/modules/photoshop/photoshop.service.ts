import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import {
  Canvas,
  loadImage,
  Image,
  CanvasRenderingContext2D,
} from 'skia-canvas';
import { Readable } from 'stream';
import { InputFile } from 'node_modules/telegraf/typings/core/types/typegram';

@Injectable()
export class PhotoshopService {
  private readonly logger = new Logger(PhotoshopService.name);
  private readonly FONT_SIZE_RATIO = 15; // Соотношение ширины к размеру шрифта
  private readonly MIN_FONT_SIZE = 48; // Минимальный размер шрифта

  private readonly topPhrases = [
    'КОГДА ТЕСТЫ ЗЕЛЁНЫЕ, А ДУША ЧЁРНАЯ',
    'ВКЛЮЧИЛ VPN, А ОН МЕНЯ',
    'КОШКА СИДИТ НА СЕРВЕРЕ И ПУШИТ В МАСТЕР',
    'ПОСТАВИЛ NODE 29, НАВЕРНОЕ, ЛУЧШАЯ ИДЕЯ',
    'ЗАПУСТИЛ DOCKER В MINECRAFT',
    'КОГДА СНИЛС ПРОСИТ JWT',
    'УСЛЫШАЛ ХРУСТ SSD И УСМЕХНУЛСЯ',
    'КОГДА ЛОГИ ГОВОРЯТ “ВСЁ ХОРОШО”',
    'РАССКАЗАЛ МАМЕ ПРО MONOREPO',
    'КОГДА В КОДЕ КАРМА, А НЕ ПРАГА',
    'КОГДА ESLINT ЖЕЛАЕТ ДОБРОГО УТРА',
    'КУПИЛ ПАМЯТЬ, НО НЕ ДЛЯ СЕБЯ',
    'ОТКРЫЛ PR И ЗАКРЫЛСЯ САМ',
    'КОГДА JSON СПРОСИЛ МОЕГО ОТЦА',
    'КОГДА НАКОНЕЦ ПОНЯЛ РЕГЕКСП И СРАЗУ ЗАБЫЛ',
    'КОГДА КОФЕ ПРЕВРАТИЛСЯ В API',
    'КОГДА В ТАСКТРЕКЕРЕ ТАСК “СПАТЬ”',
    'КОГДА СЪЕЛ КЭШ И НЕ СОЖАЛЕЕШЬ',
    'КОГДА ГОЛОС ПРОДАКШНА ЗОВЁТ',
    'КОГДА СКРИПТ БЕЖИТ, А ТЫ — ЗА НИМ',
  ];

  private readonly bottomPhrases = [
    'И ТОЛЬКО ГИТ ПОНИМАЕТ МЕНЯ',
    'ТЕПЕРЬ ЭТО ПРОБЛЕМА FRONTEND',
    'ВСЁ РАБОТАЕТ НА МОЁМ СОЗНАНИИ',
    'КОД НАПИСАН ПОД ВЛИЯНИЕМ ГРАВИТАЦИИ',
    'И МОНАДА ТАК ГОВОРИТ',
    'ТРИ ДЕПЛОЯ СПУСТЯ Я ПОЗНАЛ ПРАВДУ',
    'КОГДА ПРОЦЕСС — ЭТО Я',
    'ОНО КОМПИЛИРУЕТСЯ, НО НЕ ХОЧЕТ ЖИТЬ',
    'И GIT BLAME УКАЗАЛ НА МЕНЯ',
    'КОГДА ПРОД УЖЕ НЕ ПРОД, А СОН',
    'СБОРКА ГОТОВА К ДУХОВНОМУ ПУТИ',
    'ТЕРМИНАЛ ШЕПЧЕТ МОЁ ИМЯ',
    'КОНЕЦ СТРОКИ ПРОДАЛ ДУШУ CARRIAGE RETURN',
    'ФРИЛАНСЕР ВОШЁЛ В ЧАТ РЕЛИГИИ DEVOPS',
    'ВСЕЛЕННАЯ В ОЖИДАНИИ npm install',
    'КОГДА ПУЛ РЕБЁНОК, А НЕ РЕКВЕСТ',
    'СНЫ ОТМОНЖЕНИ К АКТУАЛЬНОЙ ВЕТКЕ',
    'ПРОСТО REVERT И ВСЁ ПРОЙДЁТ',
    'А ПАСТУШОК КОММИТАЕТ ОВЕЦ',
    'КОГДА CI/CD — ЭТО СУДЬБА',
  ];

  private getRandom<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private async downloadFile(url: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      https
        .get(url, (res) => {
          const chunks: Uint8Array[] = [];
          res.on('data', (c: Uint8Array) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        })
        .on('error', (err: unknown) =>
          reject(err instanceof Error ? err : new Error(String(err))),
        );
    });
  }

  async mutate(
    fileUrl: string,
    options?: { topText?: string; bottomText?: string },
  ): Promise<InputFile> {
    try {
      const imgBuf = await this.downloadFile(fileUrl);
      const image: Image = await loadImage(imgBuf);

      const iw = image.width;
      const ih = image.height;

      const padY = Math.floor(ih * 0.25);
      const padX = Math.floor(iw * 0.1);

      const cw = iw + padX * 2;
      const ch = ih + padY * 2;

      const canvas = new Canvas(cw, ch);
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, cw, ch);

      ctx.drawImage(image, padX, padY, iw, ih);

      const fontSize = Math.max(
        this.MIN_FONT_SIZE,
        Math.floor(cw / this.FONT_SIZE_RATIO),
      );
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'black';
      ctx.fillStyle = 'white';
      ctx.lineWidth = Math.max(2, Math.floor(fontSize / 20));

      const top = (
        options?.topText ?? this.getRandom(this.topPhrases)
      ).toUpperCase();
      const bottom = (
        options?.bottomText ?? this.getRandom(this.bottomPhrases)
      ).toUpperCase();

      const topY = padY / 2;
      const bottomY = ih + padY + padY / 2;

      this.renderText(ctx, top, cw / 2, topY, cw);
      this.renderText(ctx, bottom, cw / 2, bottomY, cw);

      const buffer: Buffer = await canvas.toBuffer('png');
      return {
        source: Readable.from(buffer),
        filename: 'meme.png',
      };
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.logger.error(`Error mutating image: ${err.message}`, err.stack);
      } else {
        this.logger.error('Unknown error while mutating image', String(err));
      }
      throw err;
    }
  }

  private renderText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
  ): void {
    // Устанавливаем шрифт
    const fontSize = Math.max(
      this.MIN_FONT_SIZE,
      Math.floor(maxWidth / this.FONT_SIZE_RATIO),
    );
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'white';
    ctx.lineWidth = Math.max(2, Math.floor(fontSize / 20));

    // Разбиваем текст на строки
    const words = text.split(' ');
    const lines: string[] = [];
    let current = words[0];

    for (const word of words.slice(1)) {
      const testLine = current + ' ' + word;
      const widthLine = ctx.measureText(testLine).width;
      if (widthLine < maxWidth * 0.9) current = testLine;
      else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);

    const lineHeight = fontSize * 1.2;

    // Рисуем каждую строку
    lines.forEach((line, i) => {
      const yy = y + i * lineHeight;
      // Сначала рисуем обводку (черным)
      ctx.strokeText(line, x, yy);
      // Потом основной текст (белым)
      ctx.fillText(line, x, yy);
    });
  }
}
