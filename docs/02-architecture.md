# Wishify — Архитектура (черновик)

> Статус: черновик v0.1 | Дата: 2026-03-14

---

## 1. Общая схема

```
┌─────────────────────────────────────────────────────────┐
│                        Браузер                          │
│                                                         │
│   Next.js (Vercel CDN)    ←──────────────────────────   │
│   - SSR страницы          HTTPS / WSS                   │
│   - TanStack Query cache                                 │
└───────────────┬─────────────────────────────────────────┘
                │
                │ HTTPS / WSS
                ▼
┌───────────────────────────────────────────┐
│              Railway                      │
│                                           │
│  ┌─────────────────┐   ┌───────────────┐  │
│  │  FastAPI         │   │  PostgreSQL   │  │
│  │  (4 workers)     │──▶│  (Railway     │  │
│  │                  │   │   Plugin)     │  │
│  │  REST API        │   └───────────────┘  │
│  │  WebSocket       │                      │
│  └────────┬─────────┘   ┌───────────────┐  │
│           │              │  Redis        │  │
│           └─────────────▶│  (Railway     │  │
│                          │   Plugin)     │  │
│                          └───────────────┘  │
└───────────────────────────────────────────┘
```

**Почему так:**
- FastAPI 4 воркера — каждый держит свой пул WebSocket-соединений
- Redis pub/sub — единственный способ broadcast между воркерами (Worker 1 принял REST, опубликовал в Redis, Воркеры 2-4 получили и разослали своим WS-клиентам)
- Vercel — CDN + Edge для Next.js, автодеплой через GitHub

---

## 2. База данных

### Схема

```
users
 id            UUID PK
 email         VARCHAR(255) UNIQUE NOT NULL
 password_hash VARCHAR(255) NULL       -- null если только Google
 google_id     VARCHAR(255) UNIQUE NULL
 display_name  VARCHAR(100) NOT NULL
 avatar_url    TEXT NULL
 created_at    TIMESTAMPTZ DEFAULT NOW()
 updated_at    TIMESTAMPTZ DEFAULT NOW()

lists
 id            UUID PK
 owner_id      UUID FK → users.id CASCADE DELETE
 title         VARCHAR(200) NOT NULL
 description   TEXT NULL
 occasion      VARCHAR(50) NULL        -- 'birthday','new_year','wedding','other'
 occasion_date DATE NULL
 public_slug   VARCHAR(16) UNIQUE NOT NULL  -- base62, 8 символов
 is_active     BOOL DEFAULT true
 created_at    TIMESTAMPTZ DEFAULT NOW()
 updated_at    TIMESTAMPTZ DEFAULT NOW()

items
 id            UUID PK
 list_id       UUID FK → lists.id CASCADE DELETE
 name          VARCHAR(300) NOT NULL
 description   TEXT NULL
 url           TEXT NULL
 image_url     TEXT NULL
 price         NUMERIC(12,2) NULL
 currency      CHAR(3) DEFAULT 'RUB'
 is_group_fund BOOL DEFAULT false
 target_amount NUMERIC(12,2) NULL      -- только если is_group_fund
 position      INT DEFAULT 0
 deleted_at    TIMESTAMPTZ NULL        -- soft-delete
 created_at    TIMESTAMPTZ DEFAULT NOW()
 updated_at    TIMESTAMPTZ DEFAULT NOW()

guest_sessions
 id            UUID PK
 display_name  VARCHAR(100) NOT NULL
 token         VARCHAR(64) UNIQUE NOT NULL
 created_at    TIMESTAMPTZ DEFAULT NOW()
 last_seen_at  TIMESTAMPTZ DEFAULT NOW()

reservations
 id                  UUID PK
 item_id             UUID FK → items.id CASCADE DELETE
 reserver_user_id    UUID FK → users.id SET NULL NULL
 guest_session_id    UUID FK → guest_sessions.id SET NULL NULL
 guest_display_name  VARCHAR(100) NULL
 reserved_at         TIMESTAMPTZ DEFAULT NOW()
 released_at         TIMESTAMPTZ NULL
 -- UNIQUE INDEX (item_id) WHERE released_at IS NULL

contributions
 id                    UUID PK
 item_id               UUID FK → items.id CASCADE DELETE
 contributor_user_id   UUID FK → users.id SET NULL NULL
 guest_session_id      UUID FK → guest_sessions.id SET NULL NULL
 guest_display_name    VARCHAR(100) NULL
 amount                NUMERIC(12,2) NOT NULL CHECK (amount > 0)
 note                  TEXT NULL
 contributed_at        TIMESTAMPTZ DEFAULT NOW()

url_scrape_cache
 url        TEXT PK
 og_title   TEXT NULL
 og_image   TEXT NULL
 price      NUMERIC(12,2) NULL
 currency   CHAR(3) NULL
 scraped_at TIMESTAMPTZ DEFAULT NOW()
```

### Индексы
```sql
idx_lists_owner_id          ON lists(owner_id)
idx_lists_public_slug       ON lists(public_slug)
idx_items_list_id           ON items(list_id)
idx_items_active            ON items(list_id) WHERE deleted_at IS NULL
idx_reservations_item       ON reservations(item_id)
idx_reservations_active     ON reservations(item_id) WHERE released_at IS NULL  -- UNIQUE
idx_contributions_item      ON contributions(item_id)
idx_guest_sessions_token    ON guest_sessions(token)
```

### Важные решения
- `public_slug` — 8 символов base62 (~218 трлн комбинаций), коллизия крайне редка; при коллизии — retry
- Soft-delete через `deleted_at` — сохраняем историю взносов при удалении товара
- `UNIQUE INDEX WHERE released_at IS NULL` — atomic race-condition protection без locks
- Оба поля (`reserver_user_id` и `guest_session_id`) NULL-able — поддержка и зарегистрированных, и гостей

---

## 3. API

### Конвенции
- Prefix: `/api/v1`
- Auth: `Authorization: Bearer <access_token>` или `X-Guest-Token: <token>`
- Коды ответов: 200 (ok), 201 (created), 204 (no content), 400 (bad request), 401 (unauth), 403 (forbidden), 404 (not found), 409 (conflict), 422 (validation), 429 (rate limit)
- Ошибки: `{ "detail": "сообщение" }` или `{ "detail": [{ "loc": [...], "msg": "..." }] }`

### Auth
```
POST   /api/v1/auth/register        { email, password, display_name }
                                    → { access_token, refresh_token, user }

POST   /api/v1/auth/login           { email, password }
                                    → { access_token, refresh_token, user }

POST   /api/v1/auth/refresh         { refresh_token }
                                    → { access_token, refresh_token }

POST   /api/v1/auth/logout          { refresh_token }
                                    → 204

GET    /api/v1/auth/google          → redirect to Google consent
GET    /api/v1/auth/google/callback → { access_token, refresh_token, user }

GET    /api/v1/auth/me              → { id, email, display_name, avatar_url }
PATCH  /api/v1/auth/me              { display_name?, avatar_url? } → user

POST   /api/v1/auth/guest           { display_name }
                                    → { guest_token, display_name }
```

### Lists
```
GET    /api/v1/lists                → [ListSummary]   (auth required)
POST   /api/v1/lists                { title, description?, occasion?, occasion_date? }
                                    → List            (201)

GET    /api/v1/lists/{id}           → ListWithItems   (owner view, auth required)
PATCH  /api/v1/lists/{id}           { title?, description?, occasion?, occasion_date?, is_active? }
                                    → List
DELETE /api/v1/lists/{id}           → 204

GET    /api/v1/lists/public/{slug}  → PublicList      (no auth required)
                                    ! поле caller_role: 'owner'|'viewer' влияет на ответ
```

**PublicList — разница в зависимости от роли:**

| Поле | owner | viewer |
|---|---|---|
| `is_reserved` | ✅ | ✅ |
| `reserved_by_me` | ❌ | ✅ |
| `reserver_name` | ❌ | ✅ |
| `total_contributed` | ✅ | ✅ |
| `contribution_count` | ✅ | ✅ |
| `my_contributions` | ❌ | ✅ (только свои) |

### Items
```
POST   /api/v1/lists/{list_id}/items
       { name, description?, url?, image_url?, price?, currency?,
         is_group_fund?, target_amount?, position? }
                                    → Item (201)

PATCH  /api/v1/lists/{list_id}/items/{item_id}
                                    → Item

DELETE /api/v1/lists/{list_id}/items/{item_id}
       ?confirm=true                → { deleted: true, soft: bool, warning?: string }
       Логика: если есть взносы → 200 + { warning: "has_contributions" } (без confirm)
               с confirm=true → soft-delete

PATCH  /api/v1/lists/{list_id}/items/reorder
       { order: [{ id, position }] } → 204
```

### Reservations
```
POST   /api/v1/items/{item_id}/reserve
       { guest_display_name? }      → { reservation_id, reserved_at }
       409 если уже зарезервировано

DELETE /api/v1/items/{item_id}/reserve  → 204
       403 если не ты резервировал
```

### Contributions
```
POST   /api/v1/items/{item_id}/contributions
       { amount, note?, guest_display_name? }
                                    → { contribution_id, amount,
                                        total_contributed, progress_pct }

GET    /api/v1/items/{item_id}/contributions/summary
                                    → {
                                        total_contributed, target_amount,
                                        progress_pct, contribution_count,
                                        my_contributions: [...]  -- только свои
                                      }
                                      ! owner видит всё кроме my_contributions

DELETE /api/v1/items/{item_id}/contributions/{contribution_id}
                                    → 204
```

### Utils
```
POST   /api/v1/util/scrape          { url }
                                    → { title?, image_url?, price?, currency? }
                                    Rate limit: 10 req/min per user

GET    /api/v1/health               → { status: "ok", db: "ok", redis: "ok" }
```

### WebSocket
```
WS     /ws/lists/{slug}?token={jwt_or_guest_token}
```

---

## 4. WebSocket

### Жизненный цикл соединения
```
Client                              Server
  |                                    |
  |── WS CONNECT /ws/lists/xK9mP2 ──▶ |
  |                                    | ← определяет роль (owner/viewer/anon)
  |◀── { event: "connected",          |
  |       payload: { list_id,          |
  |         viewer_role: "viewer" } }  |
  |                                    |
  |  [REST POST /items/.../reserve]    |
  |                                    |── DB commit
  |                                    |── Redis PUBLISH list:xK9mP2
  |◀── reservation.changed ─────────── | (broadcast, payload по роли)
  |                                    |
  |── { event: "ping" } ────────────▶ |
  |◀── { event: "pong" } ─────────── |
```

### Формат события
```json
{
  "event": "string",
  "payload": {},
  "ts": "2026-03-14T10:00:00Z"
}
```

### Все события (server → client)

| Событие | Триггер |
|---|---|
| `connected` | При подключении |
| `item.created` | Добавлен товар |
| `item.updated` | Изменён товар |
| `item.deleted` | Удалён товар |
| `item.reordered` | Изменён порядок |
| `list.updated` | Изменены метаданные списка |
| `reservation.changed` | Зарезервировано / снято |
| `contribution.added` | Внесён взнос |
| `contribution.removed` | Взнос отозван |
| `error` | Ошибка (например, race condition) |

### Фильтрация по роли

```python
# Псевдокод фильтра в ws_manager.py
def build_reservation_payload(event_data, connection):
    base = {
        "item_id": event_data["item_id"],
        "is_reserved": event_data["is_reserved"],
    }
    if connection.viewer_role != "owner":
        base["reserved_by_me"] = (event_data["actor_id"] == connection.identity_id)
        base["reserver_name"] = event_data["display_name"]
    return base
```

### Redis pub/sub
```
Channel name: list:{slug}
Message: JSON строка с { event, payload_full, actor_id, actor_type }
         payload_full содержит ВСЕ данные — воркер фильтрует при отправке каждому клиенту
```

### Реконнект (клиент)
```typescript
// Exponential backoff
const delays = [1000, 2000, 4000, 8000, 16000, 30000]; // ms, далее 30s
// При реконнекте: refetch данных через queryClient.invalidateQueries
```

---

## 5. Структура бэкенда

```
backend/
├── main.py                   # FastAPI app factory, CORS, router include
├── requirements.txt
├── Dockerfile
│
├── app/
│   ├── core/
│   │   ├── config.py         # pydantic-settings: DATABASE_URL, REDIS_URL, JWT_SECRET, ...
│   │   ├── database.py       # async engine, AsyncSession, get_db dependency
│   │   ├── security.py       # create_access_token, verify_token, hash_password
│   │   └── deps.py           # get_current_user, get_guest_or_user, require_list_owner
│   │
│   ├── models/
│   │   ├── __init__.py       # Base = declarative_base()
│   │   ├── user.py
│   │   ├── list.py
│   │   ├── item.py
│   │   ├── reservation.py
│   │   ├── contribution.py
│   │   └── guest_session.py
│   │
│   ├── schemas/
│   │   ├── auth.py           # RegisterRequest, LoginResponse, UserOut, ...
│   │   ├── list.py           # ListCreate, ListOut, PublicListOut, ...
│   │   ├── item.py           # ItemCreate, ItemOut, ...
│   │   ├── reservation.py
│   │   └── contribution.py
│   │
│   ├── services/
│   │   ├── auth_service.py   # register, login, google_oauth, create_guest
│   │   ├── list_service.py   # CRUD + public view с фильтрацией по роли
│   │   ├── item_service.py   # CRUD + soft-delete логика
│   │   ├── reservation_service.py
│   │   ├── contribution_service.py
│   │   ├── scraper_service.py  # httpx + BS4, SSRF защита, кэш
│   │   └── ws_manager.py     # ConnectionManager + Redis pub/sub
│   │
│   └── api/
│       └── routers/
│           ├── auth.py
│           ├── lists.py
│           ├── items.py
│           ├── reservations.py
│           ├── contributions.py
│           ├── websocket.py
│           └── util.py
│
└── alembic/
    ├── env.py
    └── versions/
        └── 0001_initial.py
```

---

## 6. Структура фронтенда

```
frontend/src/
├── app/
│   ├── layout.tsx            # Root layout + Providers
│   ├── page.tsx              # / → redirect to /dashboard или /login
│   │
│   ├── (auth)/               # Без navbar
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx        # Центрированная карточка
│   │
│   ├── (app)/                # С navbar, auth guard
│   │   ├── dashboard/page.tsx
│   │   ├── lists/
│   │   │   ├── new/page.tsx
│   │   │   └── [listId]/
│   │   │       ├── page.tsx          # Owner view
│   │   │       └── settings/page.tsx
│   │   └── layout.tsx
│   │
│   └── l/
│       └── [slug]/page.tsx   # Публичный вишлист (no auth required)
│
├── components/
│   ├── ui/                   # shadcn/ui переопределения
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── AuthGuard.tsx
│   ├── list/
│   │   ├── ListCard.tsx
│   │   ├── ListHeader.tsx
│   │   ├── CreateListModal.tsx
│   │   └── ShareButton.tsx
│   ├── item/
│   │   ├── WishItem.tsx          # Публичный вид
│   │   ├── OwnerWishItem.tsx     # Owner вид с drag handle
│   │   ├── AddItemForm.tsx       # С autofill
│   │   ├── EditItemModal.tsx
│   │   └── DeleteConfirmModal.tsx
│   ├── reservation/
│   │   ├── ReserveButton.tsx
│   │   └── ReservationBadge.tsx
│   ├── contribution/
│   │   ├── ContributeButton.tsx
│   │   ├── ContributeModal.tsx
│   │   └── ProgressBar.tsx       # Анимированный (Framer Motion)
│   ├── guest/
│   │   ├── GuestBanner.tsx       # "Вы просматриваете как [имя]"
│   │   └── GuestNameModal.tsx
│   └── empty-states/
│       ├── EmptyDashboard.tsx
│       ├── EmptyOwnerList.tsx
│       └── EmptyPublicList.tsx
│
├── hooks/
│   ├── useAuth.ts                # Текущий пользователь, login, logout
│   ├── useGuestSession.ts        # Гостевой токен из localStorage
│   ├── useListWebSocket.ts       # WS подключение + патчинг Query cache
│   └── useScrapeUrl.ts           # Debounced autofill при вводе URL
│
├── lib/
│   ├── api.ts                    # axios instance, interceptors, refresh логика
│   ├── formatters.ts             # formatPrice(15000, 'RUB') → '15 000 ₽'
│   └── utils.ts                  # cn(), slugify(), ...
│
├── contexts/
│   ├── AuthContext.tsx            # user, login(), logout(), isLoading
│   └── GuestContext.tsx           # guestToken, guestName, setGuest()
│
└── types/
    └── index.ts                   # Все TypeScript типы (User, List, Item, ...)
```

---

## 7. State management

| Тип данных | Инструмент | Где хранится |
|---|---|---|
| Данные с сервера (списки, товары) | TanStack Query | in-memory cache |
| Auth (user, tokens) | React Context + localStorage | localStorage + memory |
| Гостевая сессия | React Context + localStorage | localStorage |
| UI state (модалы, формы) | local useState | component |
| Drag-and-drop | @dnd-kit internal state | component |

### Ключи TanStack Query
```typescript
queryKey: ["lists"]                          // список своих вишлистов
queryKey: ["list", listId]                   // owner view
queryKey: ["list-public", slug]              // публичный просмотр
queryKey: ["contributions-summary", itemId] // сводка взносов
```

### Как WebSocket патчит кэш
```typescript
// При получении события reservation.changed
queryClient.setQueryData(["list-public", slug], (old) => ({
  ...old,
  items: old.items.map(item =>
    item.id === payload.item_id
      ? { ...item, is_reserved: payload.is_reserved, reserved_by_me: payload.reserved_by_me }
      : item
  )
}))
```

---

## 8. Auth flow

### Email + Password
```
1. POST /auth/register → access_token (15m) + refresh_token (7d)
2. Токены в localStorage (access) + httpOnly cookie (refresh) [или оба в localStorage]
3. axios interceptor добавляет Authorization: Bearer <access_token>
4. При 401 → POST /auth/refresh → новый access_token
5. При неудаче refresh → logout, redirect to /login
```

### Google OAuth
```
1. Клик "Войти через Google"
2. GET /api/v1/auth/google → redirect to Google
3. Google → GET /api/v1/auth/google/callback?code=...
4. Backend обменивает code на tokens, создаёт/находит user
5. Redirect to frontend /auth/callback?access_token=...&refresh_token=...
6. Frontend сохраняет токены, redirect to /dashboard
```

### Гостевая сессия
```
1. Гость открывает /l/{slug}
2. При попытке резерва/взноса → GuestNameModal
3. POST /auth/guest { display_name } → { guest_token }
4. guest_token в localStorage
5. Все запросы с X-Guest-Token: {guest_token}
```

---

## 9. Деплой

| Сервис | Платформа | URL |
|---|---|---|
| Frontend | Vercel | https://wishify.vercel.app |
| Backend | Railway | https://wishify-backend.up.railway.app |
| PostgreSQL | Railway Plugin | (внутренний URL) |
| Redis | Railway Plugin | (внутренний URL) |

### Переменные окружения

**Railway (backend):**
```
DATABASE_URL=postgresql+asyncpg://...  # auto Railway
REDIS_URL=redis://...                  # auto Railway
JWT_SECRET=<64 символа random>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FRONTEND_URL=https://wishify.vercel.app
ALLOWED_ORIGINS=https://wishify.vercel.app,http://localhost:3000
```

**Vercel (frontend):**
```
NEXT_PUBLIC_API_URL=https://wishify-backend.up.railway.app/api/v1
NEXT_PUBLIC_WS_URL=wss://wishify-backend.up.railway.app/ws
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
```

---

## 10. Открытые вопросы (для уточнения)

- [ ] Нужна ли верификация email при регистрации или достаточно сразу входить?
- [ ] Хранить refresh_token в httpOnly cookie или localStorage? (cookie безопаснее, но сложнее с CORS)
- [ ] Показывать ли contributor'у прогресс других вкладчиков (суммарно) или только свой вклад?
- [ ] Есть ли ограничение на количество списков/товаров на пользователя?
- [ ] Нужен ли поиск по своим спискам на dashboard при большом количестве?
