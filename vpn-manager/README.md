# VPN Manager

Менеджер пользователей VPN на базе StrongSwan с веб-интерфейсом.

## 📋 Требования

- **Node.js** 18+ 
- **npm** или **pnpm**
- **Docker** и **Docker Compose** (для production)

## 🚀 Быстрый старт

### Разработка (Development)

1. **Установите зависимости:**
   ```bash
   npm install
   ```

2. **Создайте файл `.env`:**
   ```bash
   cp .env.example .env
   ```
   
   Заполните значения:
   - `JWT_SECRET` — минимум 32 символа (сгенерируйте: `openssl rand -base64 32 | tr -d '/+=' | head -c 32`)
   - `DB_PATH=./data/sqlite.db`
   - `VITE_API_URL=http://localhost:3000`

3. **Запустите приложение:**
   ```bash
   npm run dev
   ```
   
   Это запустит одновременно:
   - Сервер на `http://localhost:3000`
   - Фронтенд на `http://localhost:5173` (с hot-reload)

4. **Создайте администратора:**
   ```bash
   npm run create-admin admin SecurePass123! MySharedSecret
   ```
   
   Или через переменные окружения:
   ```bash
   ADMIN_USERNAME=admin ADMIN_PASSWORD=SecurePass123! ADMIN_SHARED_SECRET=MySharedSecret npm run create-admin
   ```

---

## 🐳 Production (Docker Compose)

### Запуск

1. **Настройте `.env`:**
   ```bash
   cp .env.example .env
   ```
   
   Обязательно измените:
   - `JWT_SECRET` — на случайную строку (минимум 32 символа)
   - `VITE_API_URL` — на адрес вашего сервера (например, `https://api.yourdomain.com`)

2. **Запустите контейнеры:**
   ```bash
   docker-compose up --build -d
   ```

3. **Проверьте статус:**
   ```bash
   docker-compose ps
   docker-compose logs -f api
   ```

4. **Создайте администратора:**
   ```bash
   docker-compose exec api npm run create-admin admin SecurePass123! MySharedSecret
   ```

### Остановка
```bash
docker-compose down
```

### Обновление
```bash
docker-compose pull
docker-compose up -d --renew-anon-volumes
```

---

## 📁 Структура проекта

```
vpn-manager/
├── server/              # Бэкенд (Fastify + SQLite)
│   ├── src/
│   │   ├── index.ts     # Точка входа
│   │   ├── db.ts        # База данных
│   │   ├── auth.routes.ts
│   │   └── user.routes.ts
│   ├── scripts/
│   │   └── create-admin.ts
│   ├── Dockerfile
│   └── package.json
├── web/                 # Фронтенд (React + Vite)
│   ├── src/
│   ├── dist/            # Сборка (production)
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── shared/              # Общие типы и валидация
│   ├── types.ts
│   ├── api-contracts.ts
│   └── env.schema.ts    # Zod-схемы для env
├── data/                # SQLite база (игнорируется git)
├── docker-compose.yml
├── .env.example
└── package.json         # Workspace root
```

---

## 🔧 Конфигурация

### Переменные окружения

#### Бэкенд (`server/.env` или корневой `.env`)

| Переменная | Описание | Пример |
|------------|----------|--------|
| `JWT_SECRET` | Секрет для JWT токенов (мин. 32 симв.) | `your-secret-key-here` |
| `DB_PATH` | Путь к SQLite БД | `/app/data/sqlite.db` |
| `PORT` | Порт сервера | `3000` |
| `DOCKER_SOCKET_PATH` | Путь к Docker сокету | `/var/run/docker.sock` |
| `NODE_ENV` | Окружение | `production` |
| `LOG_LEVEL` | Уровень логов | `info` |

#### Фронтенд (`web/.env` или через build args)

| Переменная | Описание | Пример |
|------------|----------|--------|
| `VITE_API_URL` | URL API бэкенда | `http://localhost:3000` |
| `VITE_APP_NAME` | Название приложения | `VPN Manager` |
| `VITE_REFRESH_INTERVAL` | Интервал обновления (мс) | `30000` |

---

## 💾 Backup и восстановление

### Резервное копирование

**База данных SQLite:**
```bash
# Копирование файла БД
cp ./data/sqlite.db ./backup/sqlite-backup-$(date +%Y%m%d).db

# Из Docker контейнера
docker-compose exec api cp /app/data/sqlite.db /tmp/backup.db
docker cp vpn-manager-api-1:/tmp/backup.db ./backup/
```

**Конфигурация StrongSwan:**
```bash
# Копирование volume
docker run --rm \
  -v vpn-manager-strongswan-config:/source \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/strongswan-config-$(date +%Y%m%d).tar.gz -C /source .
```

**Полный backup одной командой:**
```bash
mkdir -p backup
docker-compose exec api cp /app/data/sqlite.db /tmp/
docker cp vpn-manager-api-1:/tmp/sqlite.db ./backup/
docker run --rm \
  -v vpn-manager-strongswan-config:/source \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/strongswan-config.tar.gz -C /source .
```

### Восстановление

**База данных:**
```bash
# В Docker
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

## 🏥 Health Checks

| Сервис | Endpoint | URL |
|--------|----------|-----|
| API | `/health` | `http://localhost:3000/health` |
| Web | `/` | `http://localhost:80/` |

Проверка из терминала:
```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"2024-..."}
```

---

## 🔐 Безопасность

1. **Никогда не коммитьте `.env`** — используйте `.env.example` как шаблон
2. **Генерируйте сильный `JWT_SECRET`**:
   ```bash
   openssl rand -base64 32 | tr -d '/+=' | head -c 32
   ```
3. **Ограничьте доступ к Docker socket** — в production используйте отдельного пользователя
4. **Используйте HTTPS** — настройте reverse proxy (nginx/traefik) перед приложением

---

## 🛠 Troubleshooting

### Ошибка "Cannot find module"
```bash
# Пересоберите проект
npm run build
docker-compose up --build -d
```

### Проблемы с правами доступа к БД
```bash
# Проверьте права на папку data
ls -la ./data
chmod 755 ./data
```

### Контейнер не запускается
```bash
# Посмотрите логи
docker-compose logs api
docker-compose logs web

# Проверьте конфигурацию
docker-compose config
```

### Миграции БД
Миграции выполняются **автоматически** при старте сервера. Таблицы создаются если не существуют.

---

## 📄 Лицензия

MIT
