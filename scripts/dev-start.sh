#!/bin/bash

# Скрипт для запуска разработки с Podman

set -e  # Выход при ошибке

echo "🚀 Запуск RAG Telegram Bot в режиме разработки..."

# Проверяем наличие podman-compose
if ! command -v podman-compose &> /dev/null; then
    echo "❌ podman-compose не найден. Установите его:"
    echo "   pip install podman-compose"
    echo "   или используйте: make dev (если у вас установлен make)"
    exit 1
fi

# Проверяем наличие .env файла
if [ ! -f .env ]; then
    echo "⚠️  Файл .env не найден. Копируем из env.example..."
    cp env.example .env
    echo "📝 Отредактируйте .env файл с вашими настройками"
    echo "🔧 Затем запустите снова: ./scripts/dev-start.sh"
    exit 1
fi

# Создаем необходимые директории
mkdir -p logs backups

# Останавливаем существующие контейнеры
echo "🛑 Останавливаем существующие контейнеры..."
podman-compose -f docker-compose.dev.yml down 2>/dev/null || true

# Собираем и запускаем контейнеры
echo "🔨 Собираем и запускаем контейнеры..."
podman-compose -f docker-compose.dev.yml up --build

echo "✅ Готово! Приложение доступно на http://localhost:3000"
echo "🔍 Prisma Studio доступен на http://localhost:5555"
