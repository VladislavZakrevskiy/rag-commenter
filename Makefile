.PHONY: help dev build start stop restart logs clean setup migrate studio test lint format

COMPOSE_FILE = docker-compose.dev.yml
PROJECT_NAME = rag-tg-bot

GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m

help: 
	@echo "$(GREEN)RAG Telegram Bot - Команды разработки$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'

setup: 
	@echo "$(GREEN)🔧 Настройка проекта...$(NC)"
	@if [ ! -f .env ]; then \
		cp env.example .env; \
		echo "$(YELLOW)📝 Создан .env файл. Отредактируйте его с вашими настройками$(NC)"; \
	fi
	@mkdir -p scripts logs
	@chmod +x scripts/dev-start.sh
	@echo "$(GREEN)✅ Настройка завершена$(NC)"

dev: setup 
	@echo "$(GREEN)🚀 Запуск в режиме разработки...$(NC)"
	podman-compose -f $(COMPOSE_FILE) up --build

dev-detached: setup 
	@echo "$(GREEN)🚀 Запуск в режиме разработки (фоновый режим)...$(NC)"
	podman-compose -f $(COMPOSE_FILE) up --build -d
	@echo "$(GREEN)✅ Сервисы запущены в фоне$(NC)"
	@echo "$(YELLOW)📱 Приложение: http://localhost:3000$(NC)"
	@echo "$(YELLOW)🔍 Prisma Studio: http://localhost:5555$(NC)"

build: 
	@echo "$(GREEN)🔨 Сборка образов...$(NC)"
	podman-compose -f $(COMPOSE_FILE) build

start: 
	@echo "$(GREEN)▶️  Запуск контейнеров...$(NC)"
	podman-compose -f $(COMPOSE_FILE) start

stop: 
	@echo "$(YELLOW)⏹️  Остановка контейнеров...$(NC)"
	podman-compose -f $(COMPOSE_FILE) stop

restart: 
	@echo "$(YELLOW)🔄 Перезапуск контейнеров...$(NC)"
	podman-compose -f $(COMPOSE_FILE) restart

down: 
	@echo "$(RED)🛑 Остановка и удаление контейнеров...$(NC)"
	podman-compose -f $(COMPOSE_FILE) down

clean: 
	@echo "$(RED)🧹 Полная очистка...$(NC)"
	podman-compose -f $(COMPOSE_FILE) down -v --rmi all
	podman system prune -f

logs: 
	@echo "$(GREEN)📋 Логи сервисов:$(NC)"
	podman-compose -f $(COMPOSE_FILE) logs -f

logs-app: 
	@echo "$(GREEN)📋 Логи приложения:$(NC)"
	podman-compose -f $(COMPOSE_FILE) logs -f app

logs-db: 
	@echo "$(GREEN)📋 Логи PostgreSQL:$(NC)"
	podman-compose -f $(COMPOSE_FILE) logs -f postgres

logs-redis: 
	@echo "$(GREEN)📋 Логи Redis:$(NC)"
	podman-compose -f $(COMPOSE_FILE) logs -f redis

shell: 
	@echo "$(GREEN)🐚 Вход в контейнер приложения...$(NC)"
	podman-compose -f $(COMPOSE_FILE) exec app sh

shell-db: 
	@echo "$(GREEN)🐚 Вход в PostgreSQL...$(NC)"
	podman-compose -f $(COMPOSE_FILE) exec postgres psql -U postgres -d rag_tg_bot

migrate: 
	@echo "$(GREEN)🗄️  Применение миграций...$(NC)"
	podman-compose -f $(COMPOSE_FILE) exec app npx prisma migrate deploy

migrate-dev: 
	@echo "$(GREEN)🗄️  Создание dev миграции...$(NC)"
	podman-compose -f $(COMPOSE_FILE) exec app npx prisma migrate dev

generate: 
	@echo "$(GREEN)⚙️  Генерация Prisma клиента...$(NC)"
	podman-compose -f $(COMPOSE_FILE) exec app npx prisma generate

studio: 
	@echo "$(GREEN)🔍 Prisma Studio доступен на http://localhost:5555$(NC)"
	@echo "$(YELLOW)Если не запущен, используйте: make dev-detached$(NC)"

reset-db: 
	@echo "$(RED)⚠️  Сброс базы данных...$(NC)"
	podman-compose -f $(COMPOSE_FILE) exec app npx prisma migrate reset --force

seed: 
	@echo "$(GREEN)🌱 Заполнение базы тестовыми данными...$(NC)"
	podman-compose -f $(COMPOSE_FILE) exec app npm run seed

test: 
	@echo "$(GREEN)🧪 Запуск тестов...$(NC)"
	podman-compose -f $(COMPOSE_FILE) exec app npm test

test-watch: 
	@echo "$(GREEN)🧪 Запуск тестов (watch режим)...$(NC)"
	podman-compose -f $(COMPOSE_FILE) exec app npm run test:watch

test-e2e: 
	@echo "$(GREEN)🧪 Запуск e2e тестов...$(NC)"
	podman-compose -f $(COMPOSE_FILE) exec app npm run test:e2e

lint: 
	@echo "$(GREEN)🔍 Проверка кода линтером...$(NC)"
	podman-compose -f $(COMPOSE_FILE) exec app npm run lint

format: 
	@echo "$(GREEN)✨ Форматирование кода...$(NC)"
	podman-compose -f $(COMPOSE_FILE) exec app npm run format

install: 
	@echo "$(GREEN)📦 Установка зависимостей...$(NC)"
	podman-compose -f $(COMPOSE_FILE) exec app npm install

backup-db: 
	@echo "$(GREEN)💾 Создание бэкапа базы данных...$(NC)"
	@mkdir -p backups
	podman-compose -f $(COMPOSE_FILE) exec postgres pg_dump -U postgres rag_tg_bot > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✅ Бэкап создан в папке backups/$(NC)"

restore-db: 
	@echo "$(YELLOW)🔄 Восстановление базы данных из $(BACKUP)...$(NC)"
	@if [ -z "$(BACKUP)" ]; then \
		echo "$(RED)❌ Укажите файл бэкапа: make restore-db BACKUP=backup_file.sql$(NC)"; \
		exit 1; \
	fi
	podman-compose -f $(COMPOSE_FILE) exec -T postgres psql -U postgres rag_tg_bot < backups/$(BACKUP)
	@echo "$(GREEN)✅ База данных восстановлена$(NC)"

status: 
	@echo "$(GREEN)📊 Статус сервисов:$(NC)"
	podman-compose -f $(COMPOSE_FILE) ps

health: 
	@echo "$(GREEN)🏥 Проверка здоровья сервисов:$(NC)"
	@echo "$(YELLOW)Приложение:$(NC)"
	@curl -s http://localhost:3000 > /dev/null && echo "$(GREEN)✅ OK$(NC)" || echo "$(RED)❌ Недоступно$(NC)"
	@echo "$(YELLOW)Prisma Studio:$(NC)"
	@curl -s http://localhost:5555 > /dev/null && echo "$(GREEN)✅ OK$(NC)" || echo "$(RED)❌ Недоступно$(NC)"


up: dev 
d: dev-detached 
s: stop 
r: restart 
l: logs 
c: clean 
