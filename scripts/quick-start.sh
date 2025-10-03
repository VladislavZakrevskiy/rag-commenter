#!/bin/bash

# Быстрый старт проекта

set -e

echo "⚡ Быстрый старт RAG Telegram Bot"
echo "================================="

# Проверяем наличие Make
if command -v make &> /dev/null; then
    echo "🔧 Используем Makefile для запуска..."
    make setup
    echo ""
    echo "🚀 Запуск проекта..."
    make dev
else
    echo "🔧 Make не найден, используем прямые команды..."
    
    # Проверяем podman-compose
    if ! command -v podman-compose &> /dev/null; then
        echo "❌ podman-compose не найден"
        echo "🔧 Запустите: ./scripts/setup-podman.sh"
        exit 1
    fi
    
    # Настройка
    if [ ! -f .env ]; then
        cp env.example .env
        echo "📝 Создан .env файл. Отредактируйте его с вашими настройками"
        echo "🔧 Затем запустите снова: ./scripts/quick-start.sh"
        exit 1
    fi
    
    # Запуск
    echo "🚀 Запуск проекта..."
    ./scripts/dev-start.sh
fi
