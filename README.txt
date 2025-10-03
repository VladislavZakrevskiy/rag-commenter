RAG Telegram Bot

Интеллектуальный Telegram бот с функциями RAG (Retrieval-Augmented Generation), который мониторит канал, сохраняет контент и генерирует комментарии с помощью ИИ.

ВОЗМОЖНОСТИ

- Мониторинг Telegram канала как администратор
- Сохранение текстов с векторными представлениями
- Загрузка изображений в Yandex Object Storage
- Векторный поиск релевантного контента
- Генерация комментариев в разных стилях (смешной, депрессивный, токсичный)
- Асинхронная обработка через очереди

ТЕХНОЛОГИЧЕСКИЙ СТЕК

- Backend: NestJS + TypeScript
- База данных: PostgreSQL + pgvector
- ORM: Prisma
- Telegram: Telegraf + nestjs-telegraf
- Хранилище: Yandex Object Storage (S3)
- ИИ: Yandex Cloud AI (YandexGPT + Embeddings)
- Очереди: Bull + Redis
- Логирование: Winston

УСТАНОВКА

1. Клонирование и установка зависимостей

git clone <repository-url>
cd rag-tg-bot
npm install

2. Настройка окружения

Скопируйте env.example в .env и заполните переменные:

cp env.example .env

3. Настройка PostgreSQL

Установите PostgreSQL и создайте базу данных:

CREATE DATABASE rag_tg_bot;
CREATE EXTENSION vector;

4. Настройка Telegram бота

1. Создайте бота через @BotFather (https://t.me/BotFather)
2. Получите токен бота
3. Добавьте бота как администратора в ваш канал
4. Получите ID канала

5. Настройка Yandex Cloud

1. Создайте аккаунт в Yandex Cloud (https://cloud.yandex.ru/)
2. Создайте API ключ для AI сервисов
3. Создайте Object Storage bucket
4. Получите ключи доступа S3

6. Настройка Redis

Установите и запустите Redis:

# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis-server

# macOS
brew install redis
brew services start redis

ЗАПУСК

Быстрый старт с Podman (рекомендуется)

# 1. Настройка Podman (если не установлен)
./scripts/setup-podman.sh

# 2. Быстрый старт
./scripts/quick-start.sh

# Или используя Makefile
make help          # Показать все доступные команды
make setup         # Первоначальная настройка
make dev           # Запуск в режиме разработки

Основные команды Makefile

make dev           # Запуск в режиме разработки с hot reload
make dev-detached  # Запуск в фоне
make stop          # Остановить контейнеры
make restart       # Перезапустить
make logs          # Показать логи
make shell         # Войти в контейнер приложения
make clean         # Полная очистка

Работа с базой данных

make migrate       # Применить миграции
make migrate-dev   # Создать новую миграцию
make studio        # Открыть Prisma Studio
make reset-db      # Сбросить базу данных
make backup-db     # Создать бэкап

Разработка без контейнеров

# Генерация Prisma клиента
npm run prisma:generate

# Применение миграций
npm run prisma:migrate

# Запуск в режиме разработки
npm run start:dev

Продакшн

# Сборка
npm run build

# Запуск
npm run start:prod

СТРУКТУРА ПРОЕКТА

src/
├── config/                 # Конфигурация
├── modules/
│   ├── ai/                 # ИИ сервисы (Yandex Cloud)
│   ├── content/            # Обработка контента
│   ├── database/           # Prisma сервис
│   ├── post/               # Управление постами
│   ├── storage/            # S3 хранилище
│   └── telegram/           # Telegram бот
├── app.module.ts           # Главный модуль
└── main.ts                 # Точка входа

БАЗА ДАННЫХ

Entities

- Post: Основная сущность поста
- Text: Текстовый контент с векторными представлениями
- Image: Метаданные изображений
- Comment: Сгенерированные комментарии

Векторный поиск

Используется расширение pgvector для эффективного поиска похожих текстов по косинусному расстоянию.

API ENDPOINTS

- GET / - Статус приложения
- Telegram webhook автоматически обрабатывается

МОНИТОРИНГ

Логи доступны через Winston. В продакшне рекомендуется настроить централизованное логирование.

РАЗРАБОТКА

Добавление новых стилей комментариев

1. Обновите enum CommentStyle в prisma/schema.prisma
2. Добавьте логику в AiService.getSystemPrompt()
3. Создайте миграцию: npm run prisma:migrate

Добавление новых типов контента

1. Создайте новую entity в Prisma схеме
2. Обновите ContentService для обработки нового типа
3. Добавьте соответствующие методы в PostService

БЕЗОПАСНОСТЬ

- Все секретные ключи хранятся в переменных окружения
- Валидация входящих данных через class-validator
- Ограничения на размер загружаемых файлов
- Проверка прав доступа к каналу

ПРОИЗВОДИТЕЛЬНОСТЬ

- Асинхронная обработка через Bull очереди
- Векторные индексы для быстрого поиска
- Кеширование в Redis
- Оптимизированные SQL запросы

ЛИЦЕНЗИЯ

MIT
