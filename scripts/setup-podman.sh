#!/bin/bash

# Скрипт для настройки Podman и podman-compose

set -e

echo "🔧 Настройка Podman для RAG Telegram Bot..."

# Проверяем операционную систему
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "🍎 Обнаружена macOS"
    
    if ! command -v podman &> /dev/null; then
        echo "📦 Установка Podman через Homebrew..."
        if ! command -v brew &> /dev/null; then
            echo "❌ Homebrew не найден. Установите его сначала: https://brew.sh"
            exit 1
        fi
        brew install podman
    fi
    
    # Инициализация Podman машины
    echo "🚀 Инициализация Podman машины..."
    podman machine init --cpus 2 --memory 4096 || true
    podman machine start || true
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    echo "🐧 Обнаружен Linux"
    
    if ! command -v podman &> /dev/null; then
        echo "📦 Установка Podman..."
        
        # Ubuntu/Debian
        if command -v apt &> /dev/null; then
            sudo apt update
            sudo apt install -y podman
        # Fedora/CentOS/RHEL
        elif command -v dnf &> /dev/null; then
            sudo dnf install -y podman
        # Arch Linux
        elif command -v pacman &> /dev/null; then
            sudo pacman -S podman
        else
            echo "❌ Неподдерживаемый дистрибутив Linux"
            exit 1
        fi
    fi
else
    echo "❌ Неподдерживаемая операционная система: $OSTYPE"
    exit 1
fi

# Установка podman-compose
echo "📦 Установка podman-compose..."
if command -v pip3 &> /dev/null; then
    pip3 install --user podman-compose
elif command -v pip &> /dev/null; then
    pip install --user podman-compose
else
    echo "❌ Python pip не найден. Установите Python и pip"
    exit 1
fi

# Проверка установки
echo "✅ Проверка установки..."
podman --version
podman-compose --version

echo "🎉 Podman успешно настроен!"
echo "📝 Теперь вы можете использовать:"
echo "   make dev          - запуск в режиме разработки"
echo "   make help         - список всех команд"
echo "   ./scripts/dev-start.sh - альтернативный запуск"
