export interface TelegramMessage {
  message_id: number;
  chat: {
    id: number;
    type: string;
  };
  from?: {
    username?: string;
    first_name?: string;
    last_name?: string;
    is_bot?: boolean;
  };
  text?: string;
  photo?: TelegramPhoto[];
  caption?: string;
  date: number;
}

export interface TelegramPhoto {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  width: number;
  height: number;
}

// Типы для AI сервиса
export interface SimilarText {
  id: string;
  content: string;
  postId: string;
  post_id: string;
  telegramMessageId: number;
  channelId: string;
  authorUsername?: string;
  distance: number;
  images: { id: string; s3Url: string }[];
}

export interface PostWithTexts {
  id: string;
  telegramMessageId: number;
  channelId: string;
  createdAt: Date;
  authorUsername?: string | null;
  texts: Array<{
    id: string;
    content: string;
    embedding?: number[] | null;
    createdAt: Date;
    postId: string;
  }>;
  images: PostImage[];
}

export interface CommentGenerationData {
  originalPost: PostWithTexts;
  relevantPosts: SimilarText[];
  selectedImages: PostImage[];
  style: string;
}

export interface PostImage {
  id: string;
  filename: string;
  s3Key: string;
  s3Url: string;
  altText: string | null;
  mimeType: string;
  fileSize: number;
  createdAt: Date;
  postId: string;
}

// Типы для создания сущностей
export interface CreatePostData {
  telegramMessageId: number;
  channelId: string;
  authorUsername?: string;
}

export interface CreateTextData {
  content: string;
  embedding: number[];
  postId: string;
}

export interface CreateImageData {
  filename: string;
  s3Key: string;
  s3Url: string;
  altText?: string;
  mimeType: string;
  fileSize: number;
  postId: string;
}

export interface CreateCommentData {
  content: string;
  style: 'FUNNY' | 'WHORE' | 'TOXIC' | 'TRUMP' | 'DIMA' | 'POZDNYAKOV';
  telegramMessageId: number;
  postId: string;
  relevantPostIds: string[];
}

// Типы для очередей
export interface CommentGenerationJob {
  postId: string;
}

export interface ContentProcessingJob {
  messageId: number;
  channelId: string;
}
