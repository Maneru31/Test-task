# AI_NOTES.md — Этап 11: Деплой

## Что сделано

- **`backend/Dockerfile`** — python:3.12-slim, non-root user `app`, `CMD uvicorn --workers 4`
- **`backend/railway.toml`** — start command с `alembic upgrade head` перед запуском; healthcheck на `/api/v1/health`
- **`docker-compose.yml`** — postgres 16 + redis 7 (с health checks) + backend + frontend для локальной разработки
- **`.env.example`** — все env-переменные с описанием; покрывает Railway (backend) и Vercel (frontend)
- **`backend/main.py`** — health endpoint теперь реально пингует БД (`SELECT 1`) и Redis (`PING`); возвращает `{"status":"ok","db":"ok","redis":"ok"}`

## Почему именно так

- **`alembic upgrade head` в start command**, а не в Dockerfile `CMD`: Railway пересобирает образ при каждом деплое, но миграции должны запускаться *при старте контейнера*, когда БД уже доступна (не в build-time)
- **`--workers 4`**: соответствует архитектурному решению из `02-architecture.md` §1; Redis pub/sub обеспечивает broadcast между воркерами (INV-04)
- **Non-root user в Dockerfile**: минимизация attack surface в production
- **Health check пингует реальные зависимости**: Railway использует `healthcheckPath` для определения готовности контейнера; статичный `{"status":"ok"}` мог бы скрыть проблемы с БД/Redis при старте
- **`ALLOWED_ORIGINS` через env**: секреты/конфиги не в коде; при деплое нужно явно указать Vercel URL

## Риски и ограничения

- **WebSocket через Railway**: Railway поддерживает WS нативно через HTTP upgrade — дополнительной конфигурации не требуется, но нужно проверить smoke-тестом (WSS)
- **`--workers 4` и WS**: каждый воркер держит свой пул WS-соединений; Redis pub/sub обязателен для корректной работы — если Redis упал, WS-события не доходят до клиентов на других воркерах (деградация без падения REST, как и задумано)
- **`alembic upgrade head` при rolling deploy**: если Railway запускает несколько инстансов, миграция может выполниться несколько раз параллельно — Alembic использует advisory lock, безопасно
- **Google OAuth redirect URI**: нужно добавить production URL в Google Cloud Console до первого деплоя

## Как проверить

```bash
# Локальная среда
cp .env.example .env
# Отредактировать .env (JWT_SECRET, Google credentials)
docker-compose up --build

# Проверка health
curl http://localhost:8000/api/v1/health
# Ожидаемый ответ: {"status":"ok","db":"ok","redis":"ok"}

# После деплоя на Railway
curl https://<your-railway-url>/api/v1/health

# Проверка CORS (с Vercel URL)
curl -H "Origin: https://<your-vercel-url>" \
     -I https://<your-railway-url>/api/v1/health

# Проверка секретов в git
git log --all --oneline -- '**/.env'  # должно быть пусто
git grep -r "SECRET\|PASSWORD\|TOKEN" -- '*.py' '*.ts' | grep -v "env\|settings\|process.env"

# Smoke test WebSocket (wscat или браузер DevTools)
wscat -c "wss://<your-railway-url>/api/v1/ws/lists/<slug>"
```

## Ручные шаги (вне кода)

1. **Railway**: создать проект → добавить PostgreSQL 16 + Redis 7 плагины → задать env-переменные из `.env.example` → подключить GitHub repo (папка `backend/`)
2. **Vercel**: импортировать репо (папка `frontend/`) → задать `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
3. **`ALLOWED_ORIGINS`** на Railway: добавить точный Vercel URL (без `/*`, без trailing slash)
4. **Google Cloud Console**: добавить production redirect URI `https://<railway-url>/api/v1/auth/google/callback`
