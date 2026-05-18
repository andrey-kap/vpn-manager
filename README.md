# VPN Manager

Система управления пользователями VPN на базе StrongSwan с современным веб-интерфейсом. Позволяет создавать, редактировать и удалять VPN-пользователей, генерировать конфигурации для мобильных устройств (iOS/macOS) и отслеживать статус подключений в реальном времени.

## 📋 О проекте

VPN Manager предоставляет удобный интерфейс для администрирования IPsec/IKEv2 VPN-сервера на основе StrongSwan. Приложение автоматизирует рутинные задачи: генерацию конфигов, управление сертификатами, синхронизацию с Docker-контейнером strongSwan и мониторинг активных сессий.

### Основные возможности

- 👥 **Управление пользователями** — создание, редактирование, удаление, блокировка
- 📱 **Генерация конфигов** — автоматическое создание `.mobileconfig` для iOS/macOS
- 🔐 **Безопасность** — JWT-аутентификация, ролевая модель (admin/user)
- 📊 **Мониторинг** — просмотр активных подключений, статус туннелей
- 🔄 **Автосинхронизация** — мгновенное обновление конфигов strongSwan при изменениях
- 🎨 **Веб-интерфейс** — адаптивный UI на React с темной темой

## 🛠 Используемые технологии

### Backend
- **Node.js 18+** — runtime окружение
- **TypeScript** — типобезопасность на всех уровнях
- **Fastify** — высокопроизводительный HTTP-сервер
- **better-sqlite3** — встраиваемая SQLite БД
- **Zod** — валидация схем данных и переменных окружения
- **pino** — структурированное логирование
- **dockerode** — управление Docker API
- **uuid** — генерация уникальных идентификаторов

### Frontend
- **React 18** — UI библиотека
- **TypeScript** — статическая типизация
- **Vite** — сборка и dev-сервер
- **TailwindCSS** — утилитарные стили
- **React Query** — кэширование и синхронизация данных
- **Zustand** — легковесный state management
- **Radix UI** — доступные компоненты

### Инфраструктура
- **Docker & Docker Compose** — контейнеризация
- **StrongSwan** — IPsec/IKEv2 VPN сервер
- **Nginx** — раздача статики (production)
- **SQLite** — хранение данных пользователей

### Shared
- **Общие типы** — единые TypeScript интерфейсы
- **API контракты** — валидация запросов/ответов
- **Zod схемы** — сквозная валидация данных

## 🚀 Инструкция по установке и запуску

### Требования

- **Node.js** 18+ и npm/pnpm
- **Docker** 20+ и **Docker Compose** 2+ (для production)
- Доступ к Docker socket (`/var/run/docker.sock`)

---

### Разработка (Development)

#### 1. Установка зависимостей

```bash
cd vpn-manager
npm install
```

#### 2. Настройка переменных окружения

```bash
cp .env.example .env
```

Заполните файл `.env`:

```bash
# Генерация секретного ключа (минимум 32 символа)
JWT_SECRET=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)

# Путь к базе данных
DB_PATH=./data/sqlite.db

# Порт сервера
PORT=3000

# URL API для фронтенда
VITE_API_URL=http://localhost:3000
```

> ⚠️ **Важно:** Никогда не коммитьте файл `.env` в git!

#### 3. Запуск в режиме разработки

```bash
npm run dev
```

Эта команда запускает одновременно:
- **Backend** на `http://localhost:3000` (с auto-reload через tsx)
- **Frontend** на `http://localhost:5173` (с hot module replacement)

#### 4. Создание администратора

Откройте новый терминал и выполните:

```bash
# Вариант 1: передача аргументов
npm run create-admin admin SecurePass123! MySharedSecret

# Вариант 2: через переменные окружения
ADMIN_USERNAME=admin ADMIN_PASSWORD=SecurePass123! ADMIN_SHARED_SECRET=MySharedSecret npm run create-admin
```

Параметры:
- `admin` — имя пользователя
- `SecurePass123!` — пароль (минимум 8 символов)
- `MySharedSecret` — общий секрет для IKEv2 аутентификации

#### 5. Проверка работы

- Откройте браузер: `http://localhost:5173`
- Войдите под созданным администратором
- Создайте тестового пользователя и скачайте конфиг

---

### Production (Docker Compose)

#### 1. Подготовка окружения

```bash
cd vpn-manager
cp .env.example .env
```

Отредактируйте `.env` для production:

```bash
# Обязательно замените на случайную строку!
JWT_SECRET=your-super-secret-key-generated-by-openssl

# Для production укажите внешний домен
VITE_API_URL=https://vpn.yourdomain.com

# Опционально: уровень логирования
LOG_LEVEL=warn
```

#### 2. Сборка и запуск контейнеров

```bash
docker-compose up --build -d
```

Команда:
- Собирает образы `api` и `web`
- Создает сеть `vpn-net`
- Монтирует volumes для персистентности данных
- Запускает health checks

#### 3. Проверка статуса

```bash
# Статус контейнеров
docker-compose ps

# Логи backend
docker-compose logs -f api

# Логи frontend
docker-compose logs -f web
```

Ожидаемый вывод `docker-compose ps`:
```
NAME                 STATUS         PORTS
vpn-manager-api      Up (healthy)   0.0.0.0:3000->3000/tcp
vpn-manager-web      Up             0.0.0.0:80->80/tcp
```

#### 4. Создание администратора в production

```bash
docker-compose exec api npm run create-admin admin SecurePass123! MySharedSecret
```

#### 5. Настройка reverse proxy (рекомендуется)

Для production используйте HTTPS. Пример конфигурации nginx:

```nginx
server {
    listen 443 ssl;
    server_name vpn.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

### Обновление приложения

```bash
# Получение последних образов
docker-compose pull

# Пересоздание контейнеров с обновленными volumes
docker-compose up -d --renew-anon-volumes

# Очистка старых образов
docker image prune -f
```

---

### Остановка

```bash
# Остановка без удаления данных
docker-compose down

# Полная очистка (данные будут удалены!)
docker-compose down -v
```

---

## 💾 Миграции базы данных

Миграции выполняются **автоматически** при каждом старте сервера. При первом запуске создаются все необходимые таблицы:

- `users` — пользователи VPN
- `sessions` — активные сессии
- `audit_log` — журнал аудита

Ручной запуск миграций не требуется.

---

## 📁 Структура проекта

```
vpn-manager/
├── server/              # Backend (Fastify + SQLite)
│   ├── src/
│   │   ├── index.ts     # Точка входа, настройка сервера
│   │   ├── db.ts        # Подключение к БД, миграции
│   │   ├── auth.routes.ts   # Маршруты аутентификации
│   │   ├── user.routes.ts   # CRUD пользователей
│   │   └── docker.service.ts # Управление strongSwan
│   ├── scripts/
│   │   └── create-admin.ts # Скрипт создания админа
│   ├── Dockerfile
│   └── package.json
├── web/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── App.tsx      # Корневой компонент
│   │   ├── pages/       # Страницы приложения
│   │   ├── components/  # Переиспользуемые компоненты
│   │   └── lib/         # Утилиты, API клиент
│   ├── dist/            # Production сборка
│   ├── Dockerfile
│   ├── nginx.conf       # Конфигурация nginx
│   └── package.json
├── shared/              # Общие модули
│   ├── types.ts         # TypeScript типы
│   ├── api-contracts.ts # DTO и контракты API
│   └── env.schema.ts    # Zod схемы для env
├── data/                # SQLite база (игнорируется git)
├── docker-compose.yml   # Оркестрация контейнеров
├── .env.example         # Шаблон переменных окружения
└── package.json         # Workspace root
```

---

## 🔐 Безопасность

1. **Хранение секретов** — используйте `.env` файлы, никогда не коммитьте их в git
2. **JWT Secret** — генерируйте криптографически стойкие ключи:
   ```bash
   openssl rand -base64 32 | tr -d '/+=' | head -c 32
   ```
3. **Docker Socket** — ограничьте права доступа к `/var/run/docker.sock`
4. **HTTPS** — обязательно используйте SSL/TLS в production
5. **CORS** — настроен строго на разрешенные домены, wildcard отключен
6. **Валидация** — все входные данные проверяются через Zod схемы

---

## 🏥 Health Checks

| Сервис | Endpoint | URL | Описание |
|--------|----------|-----|----------|
| API | `/health` | `http://localhost:3000/health` | Статус БД и Docker |
| Web | `/` | `http://localhost:80/` | Доступность фронтенда |

Проверка из терминала:
```bash
curl -s http://localhost:3000/health | jq
# {"status":"ok","timestamp":"2024-...","database":"connected","docker":"available"}
```

---

## 💾 Backup и восстановление

### Резервное копирование

**База данных SQLite:**
```bash
# Копирование файла БД
cp ./data/sqlite.db ./backup/sqlite-backup-$(date +%Y%m%d).db

# Из Docker контейнера
docker cp vpn-manager-api-1:/app/data/sqlite.db ./backup/
```

**Конфигурация StrongSwan:**
```bash
docker run --rm \
  -v vpn-manager-strongswan-config:/source \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/strongswan-config-$(date +%Y%m%d).tar.gz -C /source .
```

**Полный backup одной командой:**
```bash
mkdir -p backup
docker cp vpn-manager-api-1:/app/data/sqlite.db ./backup/
docker run --rm \
  -v vpn-manager-strongswan-config:/source \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/strongswan-config.tar.gz -C /source .
```

### Восстановление

**База данных:**
```bash
docker cp ./backup/sqlite.db vpn-manager-api-1:/app/data/sqlite.db
docker-compose restart api
```

**StrongSwan конфиги:**
```bash
docker run --rm \
  -v vpn-manager-strongswan-config:/target \
  -v $(pwd)/backup:/backup \
  alpine tar xzf /backup/strongswan-config.tar.gz -C /target
docker-compose restart api
```

---

## 🛠 Troubleshooting

### Ошибка "Cannot find module"
```bash
npm run build
docker-compose up --build -d
```

### Проблемы с правами доступа к БД
```bash
ls -la ./data
chmod 755 ./data
```

### Контейнер не запускается
```bash
# Просмотр логов
docker-compose logs api
docker-compose logs web

# Проверка конфигурации
docker-compose config
```

### Ошибки подключения к Docker
Убедитесь, что пользователь имеет доступ к docker socket:
```bash
sudo usermod -aG docker $USER
```

---

## 📄 Лицензия

MIT