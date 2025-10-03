export default () => ({
  port: parseInt(process.env.PORT || '3000', 10) || 3000,
  database: {
    url: process.env.DATABASE_URL,
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    channelId: process.env.TELEGRAM_CHANNEL_ID,
  },
  yandexCloud: {
    apiKey: process.env.YANDEX_CLOUD_API_KEY,
    folderId: process.env.YANDEX_CLOUD_FOLDER_ID,
  },
  s3: {
    accessKeyId: process.env.YANDEX_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.YANDEX_S3_SECRET_ACCESS_KEY,
    bucketName: process.env.YANDEX_S3_BUCKET_NAME,
    region: process.env.YANDEX_S3_REGION || 'ru-central1',
    endpoint: process.env.YANDEX_S3_ENDPOINT || 'https://storage.yandexcloud.net',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10) || 6379,
    password: process.env.REDIS_PASSWORD,
  },
});

