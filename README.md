# Wishify — Wishlist App

Приложение для создания и совместного использования вишлистов.

## Стек

**Backend:** Python 3.12, FastAPI, SQLAlchemy (async), PostgreSQL, Alembic, Redis (опционально), WebSocket
**Frontend:** Next.js 14, TypeScript, React Query, Tailwind CSS, shadcn/ui, dnd-kit

## Функционал

- Регистрация и авторизация (email/password + Google OAuth)
- Создание, редактирование и удаление вишлистов
- Добавление подарков с названием, описанием, ценой, изображением и ссылкой
- Drag-and-drop сортировка подарков
- Публичная ссылка на список для друзей
- Резервирование подарков (авторизованные пользователи и гости)
- Групповые сборы на подарок с отображением прогресса
- Real-time обновления через WebSocket
- Гостевые сессии без регистрации

## Деплой

- **Frontend:** Vercel — `https://test-task-git-main-maneru31s-projects.vercel.app`
- **Backend:** Railway — `https://test-task-production-4fd4.up.railway.app`

## Запуск локально

### Backend
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Переменные окружения

**Backend** (`.env`):
```
DATABASE_URL=postgresql+asyncpg://...
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FRONTEND_URL=http://localhost:3000
```

**Frontend** (`.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/api/v1
```

## Архитектура

```
browser ──HTTP──► Vercel (Next.js) ──rewrite──► Railway (FastAPI)
browser ──WSS───────────────────────────────►  Railway (FastAPI)
```

HTTP-запросы проксируются через Next.js rewrites для обхода CORS.
WebSocket подключается напрямую к Railway.
