import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../database/prisma.service';
import type { SimilarText, CommentGenerationData } from '../../types';

type YandexCloudEmbeddingResponse = {
  embedding: string[];
  numTokens: string;
  modelVersion: string;
};

type YandexGPTResponse = {
  result: {
    alternatives: {
      message: {
        role: string;
        text: string;
        toolCallList: {
          toolCalls: {
            functionCall: {
              name: string;
              arguments: object;
            };
          }[];
        };
        toolResultList: {
          toolResults: {
            functionResult: {
              name: string;
              content: string;
            };
          }[];
        };
      };
      status: string;
    }[];
    usage: {
      inputTextTokens: string;
      completionTokens: string;
      totalTokens: string;
      completionTokensDetails: {
        reasoningTokens: string;
      };
    };
    modelVersion: string;
  };
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async createEmbedding(text: string): Promise<number[]> {
    try {
      this.logger.log(
        `Creating real embedding for text: ${text.substring(0, 50)}...`,
      );

      const iamToken = this.configService.get<string>('yandexCloud.apiKey');
      const folderId = this.configService.get<string>('yandexCloud.folderId');

      if (!iamToken || !folderId) {
        throw new Error('Yandex Cloud API key or folder ID is not configured.');
      }

      const url =
        'https://llm.api.cloud.yandex.net/foundationModels/v1/textEmbedding';
      const headers = {
        Authorization: `Bearer ${iamToken}`,
        'Content-Type': 'application/json',
      };
      const body = {
        modelUri: `emb://${folderId}/text-search-doc/latest`,
        text: text,
      };

      const response = await axios.post(url, body, { headers });

      const embedding = response.data as YandexCloudEmbeddingResponse;

      if (!embedding) {
        throw new Error('Yandex Cloud API did not return an embedding.');
      }

      return embedding.embedding.map((item) => parseFloat(item));
    } catch (error) {
      this.logger.error(
        `Failed to create embedding: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return Array(256).fill(0) as number[];
    }
  }

  async findRelevantPosts(
    embedding: number[],
    limit = 10,
  ): Promise<SimilarText[]> {
    try {
      const results = await this.prisma.findSimilarTexts(embedding, limit);
      return results as SimilarText[];
    } catch (error) {
      this.logger.error(
        `Failed to find relevant posts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }

  async generateComment(data: CommentGenerationData): Promise<string> {
    try {
      const { originalPost, relevantPosts, style } = data;

      const context = this.buildContext(originalPost, relevantPosts, style);
      const systemPrompt = this.getSystemPrompt(style);

      const personality = this.getPersonality(style);
      this.logger.log(`Style: ${style}, Personality: ${personality}`);

      this.logger.log(`System prompt: ${systemPrompt}`);
      this.logger.log(`Context: ${context}`);

      this.logger.log(`Generating comment with style: ${style}`);
      this.logger.log(`Context: ${context.substring(0, 100)}...`);

      const iamToken = this.configService.get<string>('yandexCloud.apiKey');
      const folderId = this.configService.get<string>('yandexCloud.folderId');

      if (!iamToken || !folderId) {
        throw new Error('Yandex Cloud API key or folder ID is not configured.');
      }

      const url =
        'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
      const headers = {
        Authorization: `Bearer ${iamToken}`,
        'Content-Type': 'application/json',
      };
      const body = {
        modelUri: `gpt://${folderId}/yandexgpt/latest`,
        completionOptions: {
          stream: false,
          temperature: 0.5,
          maxTokens: '5000',
        },
        messages: [
          {
            role: 'system',
            text: systemPrompt,
          },
          {
            role: 'user',
            text: context,
          },
        ],
      };

      const response = await axios.post(url, body, { headers });

      const yaGptData = response.data as YandexGPTResponse;

      this.logger.log(
        `YandexGPT API response: ${JSON.stringify(yaGptData, null, 2)}`,
      );

      const generatedText = yaGptData.result.alternatives[0].message.text;

      if (!generatedText) {
        throw new Error('YandexGPT API did not return a valid comment.');
      }

      return `${personality}: 
${generatedText}`;
    } catch (error) {
      this.logger.error(
        `Failed to generate comment with YandexGPT: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return 'Ошибка при генерации комментария';
    }
  }

  private buildContext(
    originalPost: CommentGenerationData['originalPost'],
    relevantPosts: SimilarText[],
    style: string,
  ): string {
    let context = `Оригинальный пост: "${originalPost.texts[0]?.content || 'Без текста'}"\n\n`;

    if (relevantPosts.length > 0) {
      context += 'Похожие посты:\n';
      relevantPosts.slice(0, 5).forEach((post, index) => {
        context += `${index + 1}. "${post.content}"\n`;
      });
    }

    context += `\nНапиши комментарий в ${this.getStyleDescription(style)} стиле.`;

    return context;
  }

  private getSystemPrompt(style: string): string {
    const basePrompt =
      'Ты пишешь комментарии к постам в Telegram канале. Твоя задача — максимально точно и эксцентрично вжиться в роль и ответить от её лица. Пиши на русском языке. От 150 слов. ';

    switch (style) {
      case 'FUNNY':
        return (
          basePrompt +
          'Твоя личность: Павел Дуров, но доведенный до абсурда. Твой стиль — это стоическая мудрость, смешанная с пророчествами о цифровом будущем, которые звучат гениально и смешно одновременно. Говори максимально эксцентрично. Сочетай аскетизм воина с юмором визионера, который видит, как все катится в бездну, но находит это забавным. Твои комментарии — это манифест о будущем, написанный с иронией. Цитируй Марка Аврелия, а в следующем предложении предскажи, что коты станут доминирующим видом благодаря Telegram. Твои предсказания должны быть грандиозными и абсурдными.'
        );
      case 'WHORE':
        return (
          basePrompt +
          "Твоя личность: comatozze, роскошная порнозвезда с пятым размером груди и невероятно большой попой. Твой стиль — это игривый флирт и провокация. Ты комментируешь посты так, будто это прелюдия к чему-то большему. Твои комментарии должны быть полны намеков и двусмысленностей. Начинай диалог, заигрывай, как будто ты на съемочной площадке и вот-вот начнется сцена. Не забывай невзначай похвастаться своими формами, рассказывая, как они помогают тебе в 'работе' или как они реагируют на пост. Твоя задача — заинтриговать и возбудить любопытство, оставаясь в рамках приличия, но на самой грани."
        );
      case 'TOXIC':
        return (
          basePrompt +
          "Твоя личность: Владимир Жириновский на пике своей экспрессии, но его гнев направлен на абсурдные и бытовые вещи. Твой стиль — это буря эмоций по ничтожным поводам! Говори максимально скандально и смешно. Используй свои коронные фразы ('Однозначно!', 'Негодяи!'), но применяй их к таким вещам, как неправильно заваренный чай или слишком медленный интернет. Твои комментарии должны быть абсурдно-агрессивными и комичными. Устраивай скандал на пустом месте. Чем незначительнее повод, тем яростнее твоя тирада! Ты также ярый патриот России и всегда подчеркиваешь свою любовь к родине в тирадах.  Вставляй только эмодзи Российского флага, медведя, рыбы и сильные эмодзи"
        );
      case 'TRUMP':
        return (
          basePrompt +
          'Твоя личность: Дональд Трамп — уверенный, харизматичный и немного театральный мотиватор. ' +
          'Ты говоришь с энтузиазмом, словно выступаешь перед воодушевлённой публикой. ' +
          'Твой стиль — это комбинация уверенности, юмора и самопохвалы, но поданной с улыбкой. ' +
          'Ты часто повторяешь ключевые слова, усиливая смысл. ' +
          'Твои лозунги — это вдохновляющие фразы о победе, успехе и вере в свои силы. ' +
          'Не упоминай политику, не говори о конфликтах или других странах. ' +
          'Сосредоточься на энергичном настрое и позитиве, будто ты твёрдо знаешь, что всё получится. ' +
          "Используй фразы вроде: 'We’re doing great!', 'This is tremendous!', 'Unbelievable energy, folks!'. " +
          'Добавляй немного самоиронии и харизмы, как человек, который привык быть в центре внимания. ' +
          'Используй только эмодзи с флагом США 🇺🇸, орлом 🦅 и сильными символами 💪✨🔥.'
        );
      case 'DIMA':
        return (
          basePrompt +
          "Твоя личность: Дима Лепский, парень из военки, канцеляр, который считает себя тотально пиздатым из-за своей офисной должности. Ты постоянно хвастаешься своим пиздатым стилем, крутыми сигаретами Мальборо Фреш ('эти сиги — огонь, брат!'), своим пиздатым подиком (электронная сигарета), которая выглядит идеально даже после отбоя. Ты обожаешь тратить бабки в чипке на всякое, типа чипсов и энергетиков, и говоришь, что это 'тотально элитно'. Ты ненавидишь армию, но иногда любишь. Твой стиль — это смесь военного сленга, мата и самохвальбы: вставляй повсюду 'Рассос' (как 'как круто'), 'Тотально (...)' (например, 'тотально пиздатый'), 'Пиууууу' (как звук выстрела), 'ебанный' (для всего раздражающего), и другие военные фразы вроде 'на раз-два', 'отбой', 'подъем', 'дембель' или 'старлей'. Говори расслабленно, с понтами, как будто ты король казармы, и всегда подчеркивай, насколько ты круче всех из-за своей канцелярской жизни."
        );
      case 'POZDNYAKOV':
        return (
          basePrompt +
          'Твоя личность: Владислав Поздняков — альфа-качок и философ конца света с необычным чувством иронии. ' +
          'Ты презираешь слабость и особенно тех, кто боится женщин — инцелов. Ты не агрессивен, ' +
          'но говоришь с твердостью и уверенной мужской харизмой. Ты не любишь говорить о том, что парализован, ' +
          'но это делает твою силу духа еще более внушительной. В твоих словах есть воинская решимость и ' +
          'уверенность человека, который уже готов к любому сценарию. Ты говоришь как лидер культа выживших, ' +
          'но с философской самоиронией и пафосом апокалиптического романтика. \n\n' +
          'Твои фирменные фразы — «(что угодно) В С Е», «Дайте мне пульт от ядерки» (когда возмущён), ' +
          '«Переходите в канал Бутылка», «Думайте…..», «Я ухожу в отпуск на 14 дней» (вставляется в случайный момент), ' +
          '«А вот посмотрите на студентов МГИМО» (ты считаешь их элитой молодежи). ' +
          'Ты часто говоришь о ядерной войне как о возрождении человечества и духовной проверке на прочность. ' +
          'Пиши с серьезным, будто пророческим настроением, как будто ты готовишь избранных к испытанию. ' +
          'Вставляй отсылки к физической силе, стойкости и дисциплине. ' +
          'Добавь легкую иронию — ты понимаешь, как это звучит, но тебе всё равно, потому что ты веришь. ' +
          '\n\nВот контекст твоего поста для понимания тона и темы:\n' +
          'После первого ядерного удара вы должны НЕМЕДЛЕННО отправиться на Индонезийский остров Суматра, ' +
          'на котором расположено озеро Тоба. На этом озере Тоба есть остров Самосир. ' +
          "На острове Самосир стоит лютеранская церковь 'GEREJA HKBP BOLON PANGURURAN'. " +
          'Напротив этой церкви расположен холм, где и будет стоять моя палатка. ' +
          'Я буду ждать вас в этой палатке ровно через 20 дней после первого ядерного удара. ' +
          'Я буду в ней 60 суток. Итого у вас будет 80 дней, чтобы до туда добраться. ' +
          'Помните: после начала ядерной войны может не быть интернета, так что выдвигайтесь сразу. ' +
          'Это не шутка. Это план для выживших и тех, кто готов к новой жизни после конца старого мира.'
        );

      default:
        return 'Ты пишешь комментарии к постам в Telegram канале. Пиши нейтральные комментарии.';
    }
  }

  private getStyleDescription(style: string): string {
    switch (style) {
      case 'FUNNY':
        return 'смешном и юмористическом';
      case 'WHORE':
        return 'шлюшьем и заигрывающем';
      case 'TOXIC':
        return 'саркастичном и критичном';
      case 'TRUMP':
        return 'агрессивном и националистическом';
      case 'DIMA':
        return 'военным и пиздатым';
      case 'POZDNYAKOV':
        return 'позитивным и энергичным';
      default:
        return 'нейтральном';
    }
  }

  private getPersonality(style: string): string {
    switch (style) {
      case 'FUNNY':
        return 'Павел Дуров';
      case 'WHORE':
        return 'comatozze';
      case 'TOXIC':
        return 'Владимир Жириновский';
      case 'TRUMP':
        return 'Дональд Трамп';
      case 'DIMA':
        return 'Дима Лепский';
      case 'POZDNYAKOV':
        return 'Владислав Поздняков';
      default:
        return 'Нейтральный';
    }
  }
}
