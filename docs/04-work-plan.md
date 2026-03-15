# Wishify — План работы

> Статус: v2.0 | Дата: 2026-03-14

---

## Принципы

- Бэкенд опережает фронтенд: UI пишется только под задокументированный и проверенный контракт API
- Инварианты (INV-01..INV-10 из `03-architecture-review.md`) верифицируются сразу при появлении фичи, не в конце
- Каждый этап завершается рабочим, воспроизводимым состоянием — не «почти готово»
- Реалтайм — отдельный этап с явными критериями, не «добавим позже»

---

## Карта зависимостей

```
Э0 ──► Э1 ──► Э2 ──► Э3 ──► Э4 ──► Э5 ──► Э6
                                    │
                                    └──────────► Э7 (параллельно с Э5–Э6)
                                                  │
                                                  └──► Э8 ──► Э9 ──► Э10 ──► Э11
```

Э5 (WebSocket бэкенд) и Э7 (фронтенд ядро) можно вести параллельно после завершения Э4.
Э11 (деплой) требует завершения всех предыдущих этапов.

---

## Этап 0 — Фундамент

**Цель:** воспроизводимая локальная среда; пустые приложения запускаются и общаются друг с другом.

**Зависит от:** ничего.

### Вход
- `01-instructions.md` §2 (стек), §3.4 (структура папок)
- Доступ к Docker, Node.js, Python 3.12

### Выход — Артефакты
| Файл | Описание |
|---|---|
| `docker-compose.yml` | postgres 16 + redis 7 + backend + frontend, health checks |
| `backend/Dockerfile` | python:3.12-slim, non-root user |
| `backend/requirements.txt` | все зависимости стека |
| `backend/main.py` | FastAPI app factory, CORS, include routers |
| `backend/app/core/config.py` | pydantic-settings, все env-переменные |
| `backend/app/core/database.py` | async engine, AsyncSession, `get_db` |
| `alembic/env.py` | подключён к async engine |
| `frontend/` | Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui |
| `frontend/src/lib/api.ts` | axios instance, `baseURL = NEXT_PUBLIC_API_URL` |
| `frontend/src/types/index.ts` | файл-заглушка |
| `CLAUDE.md` | правила проекта для агента |

### Риски
| Риск | Митигация |
|---|---|
| Конфликт портов на хосте | задокументировать порты в `.env.example`, добавить в README |
| asyncpg не устанавливается на Windows-хосте | всё собирается внутри Docker, хост только docker-compose up |
| Версии Node/Python в хосте и контейнере расходятся | `.python-version` + `.nvmrc` в корне |

### Критерии готовности
- [ ] `docker-compose up --build` завершается без ошибок
- [ ] `GET /api/v1/health` → `{"status":"ok","db":"ok","redis":"ok"}` (db и redis действительно пингуются)
- [ ] Фронтенд открывается на `localhost:3000`, нет ошибок компиляции TypeScript
- [ ] `ruff check backend/` — 0 ошибок (линтер бэкенда)
- [ ] `cd frontend && npx tsc --noEmit` — 0 ошибок (линтер фронтенда)
- [ ] Нет секретов в коде: `git grep -r "SECRET\|PASSWORD\|TOKEN" -- '*.py' '*.ts'` выдаёт только env-читалки

---

## Этап 1 — Схема БД и миграции ✅ ВЫПОЛНЕН

**Цель:** полная схема PostgreSQL создана через Alembic; все индексы и ограничения на месте.

**Зависит от:** Этап 0.

### Вход
- Запущенный postgres (из Э0)
- `02-architecture.md` §2 (таблицы, индексы)
- `03-architecture-review.md` INV-02, INV-03, INV-09

### Выход — Артефакты
| Файл | Описание |
|---|---|
| `app/models/__init__.py` | `Base = declarative_base()` |
| `app/models/user.py` | модель `User` |
| `app/models/list.py` | модель `WishList` |
| `app/models/item.py` | модель `Item` с полем `deleted_at` |
| `app/models/guest_session.py` | модель `GuestSession` |
| `app/models/reservation.py` | модель `Reservation` |
| `app/models/contribution.py` | модель `Contribution` |
| `app/models/url_scrape_cache.py` | модель `UrlScrapeCache` |
| `alembic/versions/0001_initial.py` | единая миграция всех таблиц |

### Риски
| Риск | Митигация |
|---|---|
| Частичный `UNIQUE INDEX WHERE released_at IS NULL` не создан → race condition не защищена | явная проверка индекса в критерии готовности через `psql \d reservations` |
| `NUMERIC(12,2)` заменён на `Float` → потеря точности денег (INV-09) | линтер-проверка: grep на `Float` в моделях |
| Alembic autogenerate не видит partial index → индекс не попадает в миграцию | написать partial index вручную через `op.create_index(..., postgresql_where=...)` |

### Критерии готовности
- [ ] `alembic upgrade head` проходит без ошибок на чистой БД
- [ ] `alembic downgrade base && alembic upgrade head` — идемпотентно
- [ ] `psql -c "\d reservations"` показывает `UNIQUE INDEX ON reservations(item_id) WHERE released_at IS NULL`
- [ ] `grep -r "Float\|float" app/models/` — не находит денежных полей (INV-09)
- [ ] Все FK с `CASCADE DELETE` / `SET NULL` соответствуют `02-architecture.md` §2

---

## Этап 2 — Аутентификация ✅ ВЫПОЛНЕН

**Цель:** регистрация, вход, JWT (access + refresh), Google OAuth, гостевая сессия — полностью рабочие.

**Зависит от:** Этап 1.

### Вход
- Таблицы `users`, `guest_sessions` (из Э1)
- `02-architecture.md` §3 Auth, §8
- `03-architecture-review.md` §1.1 (httpOnly cookie для refresh_token)
- Google OAuth credentials (CLIENT_ID + CLIENT_SECRET)

### Выход — Артефакты
| Файл | Описание |
|---|---|
| `app/core/security.py` | `hash_password`, `verify_password`, `create_access_token`, `create_refresh_token`, `verify_token` |
| `app/core/deps.py` | `get_current_user`, `get_optional_user`, `get_guest_session`, `get_caller` |
| `app/schemas/auth.py` | `RegisterRequest`, `LoginRequest`, `TokenResponse`, `UserOut`, `GuestTokenResponse` |
| `app/services/auth_service.py` | `register`, `login`, `refresh`, `logout`, `create_guest`, `get_or_create_google_user` |
| `app/api/routers/auth.py` | все 9 эндпоинтов из `02-architecture.md` §3 Auth |

**Контракт refresh_token:** хранится в httpOnly cookie `refresh_token`, не в теле ответа и не в localStorage.

### Риски
| Риск | Митигация |
|---|---|
| access_token попадает в localStorage на фронтенде → XSS-уязвимость | access_token только в памяти (React Context); фронтенд проверяется в Э7 |
| Google OAuth callback URL не совпадает с registered redirect URI | задокументировать точный URL в `.env.example`; в локальной разработке — `http://localhost:8000/api/v1/auth/google/callback` |
| Истёкший access_token на публичном эндпоинте → 401 вместо viewer | `get_optional_user` возвращает None при любой ошибке токена (INV-07) |
| guest_token попадает в application logs | явный запрет логировать заголовок `X-Guest-Token` в middleware |

### Критерии готовности
- [ ] `POST /auth/register` → 201, `Set-Cookie: refresh_token=...; HttpOnly; Path=/api/v1/auth/refresh`
- [ ] `POST /auth/login` → 200, access_token в теле, refresh_token в cookie
- [ ] `GET /auth/me` с валидным Bearer → 200; без токена → 401
- [ ] `POST /auth/refresh` с cookie → новый access_token; с невалидным cookie → 401
- [ ] `POST /auth/guest { "display_name": "Иван" }` → `{ guest_token, display_name }`
- [ ] `GET /auth/me` с истёкшим Bearer на публичном эндпоинте → не падает с 401 (проверяется через `get_optional_user`)
- [ ] `ruff check app/core/ app/services/auth_service.py app/api/routers/auth.py` — 0 ошибок
- [ ] `grep -r "X-Guest-Token\|guest_token" app/ -- '*.py' | grep "log\|print"` — пусто (INV-10)

---

## Этап 3 — Списки и товары ✅ ВЫПОЛНЕН

**Цель:** полный CRUD списков и товаров; публичный эндпоинт фильтрует поля по роли; двухфазное удаление работает.

**Зависит от:** Этап 2.

### Вход
- Таблицы `lists`, `items` (из Э1)
- `get_caller` dependency (из Э2)
- `02-architecture.md` §3 Lists, Items, таблица PublicList
- `03-architecture-review.md` §2.1 (caller_role), §2.2 (двухфазный DELETE), INV-01, INV-03, INV-05, INV-07

### Выход — Артефакты
| Файл | Описание |
|---|---|
| `app/schemas/list.py` | `ListCreate`, `ListUpdate`, `ListOut`, `ListSummary`, `PublicListOut` |
| `app/schemas/item.py` | `ItemCreate`, `ItemUpdate`, `ItemOut`, `DeleteCheckResponse` |
| `app/services/list_service.py` | `get_user_lists`, `create_list` (slug: base62 + retry), `get_list_owner_view`, `update_list`, `delete_list`, `get_public_list` |
| `app/services/item_service.py` | `create_item`, `update_item`, `delete_item_check` (фаза 1), `delete_item_confirm` (фаза 2, soft-delete), `reorder_items` |
| `app/api/routers/lists.py` | 6 эндпоинтов |
| `app/api/routers/items.py` | 4 эндпоинта |

**Контракт caller_role** (из `03-architecture-review.md` §2.1):
```
нет токена              → viewer
X-Guest-Token           → viewer
Bearer + owner          → owner
Bearer + не owner       → viewer
Bearer истёк            → viewer (не 401)
```

**Контракт публичного ответа:**

| Поле | owner | viewer |
|---|---|---|
| `is_reserved` | ✅ | ✅ |
| `reserved_by_me` | ❌ | ✅ |
| `reserver_name` | ❌ | ✅ |
| `total_contributed` | ✅ | ✅ |
| `my_contributions` | ❌ | ✅ |

### Риски
| Риск | Митигация |
|---|---|
| Коллизия `public_slug` → ошибка при создании списка | retry-логика в `create_list`: до 5 попыток, каждый раз новый slug |
| Owner открывает `/l/{slug}` и видит имена резервирующих | тест INV-01 обязателен в критериях; фильтр только на бэкенде (INV-05) |
| Между фазой 1 и 2 DELETE появился новый взнос → hard-delete уничтожит его | фаза 2 всегда soft-delete независимо от предыстории (§2.2 review) |
| `items.deleted_at IS NOT NULL` но строка всё ещё возвращается в запросах | все запросы к items явно добавляют `WHERE deleted_at IS NULL` |

### Критерии готовности
- [ ] `GET /lists/public/{slug}` без токена → 200, поля `reserved_by_me` и `reserver_name` **присутствуют**
- [ ] `GET /lists/public/{slug}` с Bearer владельца → 200, поля `reserved_by_me` и `reserver_name` **отсутствуют** (INV-01)
- [ ] `GET /lists/public/{slug}` с истёкшим Bearer → 200 (не 401) (INV-07)
- [ ] `DELETE /lists/{list_id}/items/{item_id}` (без взносов/резерва) → 204
- [ ] `DELETE /lists/{list_id}/items/{item_id}` (с взносом) → 200 `{ warning: "has_contributions" }`
- [ ] То же с `?confirm=true` → 200 `{ deleted: true, soft: true }`; строка в БД имеет `deleted_at IS NOT NULL`
- [ ] Soft-deleted товар не возвращается ни в owner view, ни в public view
- [ ] `ruff check` + `npx tsc --noEmit` — 0 ошибок

---

## Этап 4 — Резервации и взносы ✅ ВЫПОЛНЕН

**Цель:** резервирование защищено от race condition; групповые взносы с корректной фильтрацией по роли.

**Зависит от:** Этап 3.

### Вход
- Таблицы `reservations`, `contributions` (из Э1)
- Partial UNIQUE INDEX на `reservations` (из Э1)
- `get_caller` dependency (из Э2)
- `02-architecture.md` §3 Reservations, Contributions
- `03-architecture-review.md` §1.2, §1.3, §1.6, INV-02, INV-03, INV-09

### Выход — Артефакты
| Файл | Описание |
|---|---|
| `app/schemas/reservation.py` | `ReservationOut`, `ReserveRequest` |
| `app/schemas/contribution.py` | `ContributionCreate`, `ContributionOut`, `ContributionSummary` |
| `app/services/reservation_service.py` | `reserve`, `release`, `release_by_owner` |
| `app/services/contribution_service.py` | `add_contribution`, `get_summary`, `delete_contribution` |
| `app/api/routers/reservations.py` | `POST /items/{id}/reserve`, `DELETE /items/{id}/reserve`, `DELETE /lists/{list_id}/items/{item_id}/reserve/force` |
| `app/api/routers/contributions.py` | `POST /items/{id}/contributions`, `GET /items/{id}/contributions/summary`, `DELETE /items/{id}/contributions/{contribution_id}` |

**Контракт `/contributions/summary`:**
- owner → `{ total_contributed, target_amount, progress_pct, contribution_count }` — без `my_contributions`
- viewer → те же поля + `my_contributions: [{ id, amount, note, contributed_at }]`

**Контракт `/reserve/force`:**
- Только владелец списка (проверка `list.owner_id == current_user.id`)
- Устанавливает `reservation.released_at = NOW()` без проверки «ты ли резервировал»

### Риски
| Риск | Митигация |
|---|---|
| Два одновременных POST /reserve → оба проходят | UNIQUE INDEX на уровне БД перехватывает `UniqueViolationError` → 409; тест обязателен |
| Hard-delete item пока поступает новый взнос → взнос теряется без предупреждения (§1.6 review) | проверка и DELETE в одной транзакции через `SELECT ... FOR UPDATE` |
| Owner видит `my_contributions` через `/summary` | явный тест контракта в критериях готовности |
| `amount` хранится как float → потеря точности (INV-09) | `Decimal` в Python, `NUMERIC(12,2)` в БД; тест: `Decimal('0.1') + Decimal('0.2') == Decimal('0.3')` |
| Гостевая резервация блокирует товар навсегда при потере localStorage | `/reserve/force` для владельца решает проблему; TTL-задача в Э6 |

### Критерии готовности
- [ ] `POST /items/{id}/reserve` (первый) → 201
- [ ] `POST /items/{id}/reserve` (второй, параллельно) → 409 `{ "detail": "..." }`
- [ ] `GET /items/{id}/contributions/summary` с токеном владельца → ответ **не содержит** поле `my_contributions` (INV-01)
- [ ] То же с токеном viewer → ответ **содержит** `my_contributions` только со своими взносами
- [ ] `DELETE /lists/{list_id}/items/{item_id}/reserve/force` от не-владельца → 403
- [ ] `amount` сохраняется как `Decimal`, не `float`: `SELECT pg_typeof(amount) FROM contributions LIMIT 1` → `numeric`
- [ ] `ruff check` — 0 ошибок

---

## Этап 5 — Реалтайм: WebSocket + Redis ✅ ВЫПОЛНЕН

**Цель:** любое изменение состояния мгновенно транслируется всем подключённым клиентам; payload фильтруется по роли per-connection.

**Зависит от:** Этап 4.

### Вход
- Запущенный Redis (из Э0)
- Все сервисы с `session.commit()` (из Э2–Э4)
- `02-architecture.md` §4 WebSocket, §3 WS endpoint
- `03-architecture-review.md` §2.3, §2.5, INV-04, INV-06

### Выход — Артефакты
| Файл | Описание |
|---|---|
| `app/services/ws_manager.py` | `ConnectionManager`, `connect`, `disconnect`, `broadcast_to_list`, `build_payload` |
| `app/api/routers/websocket.py` | `WS /ws/lists/{slug}?token=...`, ping/pong keepalive |
| Изменены: `list_service.py`, `item_service.py`, `reservation_service.py`, `contribution_service.py` | `redis.publish(f"list:{slug}", ...)` после каждого `session.commit()` |

**Порядок операций (INV-04) — неизменен:**
```
1. Pydantic validation
2. Auth/permissions check
3. Business logic
4. session.commit()        ← сначала
5. redis.publish(...)      ← потом
6. return HTTP response
```

**Фильтр WS payload по роли:**

| Поле | owner | viewer |
|---|---|---|
| `item_id`, `is_reserved`, `total_contributed`, `contribution_count` | ✅ | ✅ |
| `reserved_by_me`, `reserver_name` | ❌ | ✅ |
| `contributor_name` | ❌ | ❌ |
| `my_contributions` | ❌ | ✅ (только свои) |

### Риски
| Риск | Митигация |
|---|---|
| Redis publish до commit → клиенты получают событие о несохранённых данных (INV-04) | code review: `redis.publish` **всегда** после `await session.commit()`; линтер-правило или grep-тест |
| Worker 1 принял REST, Workers 2-4 не рассылают WS → клиенты не получают события | Redis pub/sub подписка стартует для каждого воркера при startup event |
| Owner получает `reserver_name` через WS (INV-06) | `build_payload` вызывается для каждого соединения индивидуально; тест с двумя WS-клиентами разной роли |
| Redis недоступен → весь сервис падает | `try/except` вокруг publish; REST продолжает работать, WS деградирует без ошибки |
| WS соединение с невалидным токеном остаётся открытым | при подключении: validate token → если невалиден, close(4001) |

### Критерии готовности
- [ ] WS `/ws/lists/{slug}` без токена → `{ event: "connected", payload: { viewer_role: "viewer" } }`
- [ ] WS с Bearer владельца → `viewer_role: "owner"`
- [ ] `POST /items/{id}/reserve` → WS-событие `reservation.changed` приходит на оба подключённых клиента **без перезагрузки**
- [ ] WS-событие у owner-клиента **не содержит** `reserver_name` (INV-01 + INV-06)
- [ ] WS-событие у viewer-клиента **содержит** `reserver_name`
- [ ] `redis-cli SHUTDOWN` → `POST /items/{id}/reserve` → 201 (REST работает); WS событие не приходит (деградация без падения)
- [ ] `grep -n "redis.publish" app/services/*.py` — все вхождения **после** строки с `session.commit()` (INV-04)
- [ ] `ruff check` — 0 ошибок

---

## Этап 6 — Бэкенд: утилиты и завершение ✅ ВЫПОЛНЕН

**Цель:** URL-скрейпер с SSRF-защитой и кэшем; TTL на гостевые резервации; все открытые вопросы закрыты.

**Зависит от:** Этап 5.

### Вход
- Таблица `url_scrape_cache` (из Э1)
- `02-architecture.md` §3 Utils
- `03-architecture-review.md` §2.6 (scraper security), §1.3 (гостевые резервации)

### Выход — Артефакты
| Файл | Описание |
|---|---|
| `app/services/scraper_service.py` | SSRF-защита, httpx 10с timeout, og: парсинг, кэш 24ч |
| `app/api/routers/util.py` | `POST /util/scrape`, rate limit 10/мин per user |
| Изменён: `main.py` | фоновая задача (APScheduler / asyncio) раз в сутки: освобождает гостевые резервации без активности >30 дней |

**Контракт scraper:** при любой ошибке (403, timeout, SSRF block) → `{ title: null, image_url: null, price: null }` + HTTP 200. Скрейпер не возвращает ошибок.

**SSRF-блок-лист:**
- `127.x.x.x`, `localhost`, `::1`
- `10.x.x.x`, `172.16-31.x.x`, `192.168.x.x` (RFC 1918)
- `*.internal`, `*.local`
- IP резолвится в любой из выше — блок

### Риски
| Риск | Митигация |
|---|---|
| DNS rebinding обходит SSRF-проверку | проверять IP после резолвинга, не только hostname |
| Скрейпер возвращает HTML размером 50 МБ → OOM | `httpx` с `max_response_size` или stream с лимитом |
| Rate limit обходится через разные аккаунты | в рамках проекта достаточно per-user; можно добавить per-IP позже |
| Фоновая задача падает и не перезапускается | логировать ошибки, не останавливать основной процесс |

### Критерии готовности
- [ ] `POST /util/scrape { "url": "http://192.168.1.1/admin" }` → 200 `{ title: null, ... }` (SSRF blocked)
- [ ] `POST /util/scrape { "url": "http://example.com" }` → 200, `title` заполнен (или null при недоступности)
- [ ] Повторный запрос одного URL → берётся из кэша: `scraped_at` не обновляется, `httpx` не вызывается
- [ ] 11-й запрос за минуту → 429
- [ ] Гостевая резервация с `last_seen_at` = 31 день назад → после запуска задачи `released_at IS NOT NULL`
- [ ] `ruff check` — 0 ошибок на весь `backend/`
- [ ] Все INV-01..INV-10 проверены вручную по чеклисту в конце этого документа

---

## Этап 7 — Фронтенд: ядро

**Цель:** маршрутизация, auth-guard, API-клиент с auto-refresh, контексты пользователя и гостя — всё работает.

**Зависит от:** Этап 2 (auth API), Этап 3 (знаем контракты для типов).

### Вход
- Рабочие эндпоинты `/auth/*` (из Э2)
- `02-architecture.md` §6 структура фронтенда, §7 state management, §8 auth flow
- `03-architecture-review.md` §1.1 (access_token в памяти)

### Выход — Артефакты
| Файл | Описание |
|---|---|
| `src/types/index.ts` | `User`, `WishList`, `Item`, `Reservation`, `Contribution`, `PublicList`, `WsEvent` и все производные |
| `src/lib/api.ts` | axios instance, interceptors: Bearer header, auto-refresh при 401, X-Guest-Token fallback |
| `src/lib/formatters.ts` | `formatPrice(15000, 'RUB')` → `'15 000 ₽'` |
| `src/contexts/AuthContext.tsx` | `user`, `login()`, `logout()`, `isLoading`; access_token только в памяти |
| `src/contexts/GuestContext.tsx` | `guestToken`, `guestName`, `setGuest()`; guest_token в localStorage |
| `src/hooks/useAuth.ts`, `useGuestSession.ts` | обёртки над контекстами |
| `src/app/layout.tsx` | QueryClientProvider + AuthContext + GuestContext |
| `src/components/layout/AuthGuard.tsx` | redirect → `/login` если нет user |
| `src/app/(auth)/login/page.tsx` | форма входа |
| `src/app/(auth)/register/page.tsx` | форма регистрации |
| `src/app/(app)/layout.tsx` | обёрнуто в AuthGuard |

### Риски
| Риск | Митигация |
|---|---|
| access_token сохраняется в localStorage → XSS-уязвимость | access_token только в React state; при перезагрузке страницы — refresh через cookie |
| Гонка при параллельных 401 → несколько одновременных refresh-запросов | один pending refresh-промис на всё приложение; повторные запросы ждут его |
| `any` в TypeScript → runtime-ошибки скрыты | `"strict": true` в tsconfig; CI проверяет `tsc --noEmit` |
| Infinite redirect loop если `/login` тоже защищён AuthGuard | AuthGuard не оборачивает `(auth)/` маршруты |

### Критерии готовности
- [ ] Переход на `/dashboard` без токена → redirect на `/login`
- [ ] Вход → redirect на `/dashboard`; перезагрузка страницы → остаёмся на `/dashboard` (refresh через cookie)
- [ ] Истёкший access_token → следующий запрос прозрачно обновляется, пользователь ничего не замечает
- [ ] `console.log(localStorage)` после логина — нет access_token (только guest_token если есть гостевая сессия)
- [ ] `npx tsc --noEmit` — 0 ошибок
- [ ] `npx eslint src/` — 0 ошибок (если ESLint настроен)

---

## Этап 8 — Фронтенд: дашборд и управление списком ✅ ВЫПОЛНЕН

**Цель:** owner может создавать списки, добавлять/редактировать/удалять/переупорядочивать товары.

**Зависит от:** Этап 7 (фронтенд ядро), Этап 3 (API списков и товаров), Этап 6 (scraper).

### Вход
- `GET /lists`, `POST /lists`, `PATCH /lists/{id}`, `DELETE /lists/{id}` (из Э3)
- `POST/PATCH/DELETE /lists/{list_id}/items/*` (из Э3)
- `POST /util/scrape` (из Э6)

### Выход — Артефакты
| Файл | Описание |
|---|---|
| `(app)/dashboard/page.tsx` | список своих вишлистов, `queryKey: ["lists"]` |
| `components/list/ListCard.tsx`, `CreateListModal.tsx`, `ShareButton.tsx`, `ListHeader.tsx` | — |
| `(app)/lists/[listId]/page.tsx` | owner view, `queryKey: ["list", listId]` |
| `(app)/lists/[listId]/settings/page.tsx` | редактирование метаданных |
| `components/item/OwnerWishItem.tsx` | drag handle, edit/delete кнопки |
| `components/item/AddItemForm.tsx` | autofill по URL |
| `components/item/EditItemModal.tsx`, `DeleteConfirmModal.tsx` | — |
| `hooks/useScrapeUrl.ts` | debounced `POST /util/scrape`, автозаполнение формы |
| `components/empty-states/EmptyDashboard.tsx`, `EmptyOwnerList.tsx` | — |

**drag-to-reorder:** `@dnd-kit/core` → `PATCH /lists/{list_id}/items/reorder` → optimistic update в TanStack Query.

### Риски
| Риск | Митигация |
|---|---|
| Двухфазное удаление: UI не показывает warning из фазы 1 | `DeleteConfirmModal` различает `warning: "has_contributions"`, `"has_reservation"`, `"has_both"` |
| Optimistic update drag-and-drop рассинхронизируется с сервером | `onError` callback → `queryClient.invalidateQueries(["list", listId])` |
| autofill перезаписывает данные, введённые вручную | `useScrapeUrl` заполняет только пустые поля |

### Критерии готовности
- [ ] Создать список → появляется на дашборде без перезагрузки
- [ ] Вставить URL в форму → поля автозаполняются через 500мс (debounce)
- [ ] Удалить товар с взносом → модал с предупреждением → confirm → товар исчезает
- [ ] Перетащить товар → порядок сохраняется после перезагрузки страницы
- [ ] ShareButton копирует `https://.../l/{slug}` → toast «Ссылка скопирована»
- [ ] `npx tsc --noEmit` — 0 ошибок

---

## Этап 9 — Фронтенд: публичный вишлист ✅ ВЫПОЛНЕН

**Цель:** гости без регистрации могут просматривать список, резервировать подарки и вносить взносы.

**Зависит от:** Этап 7 (контексты), Этап 8 (базовые компоненты), Этап 4 (API резерваций и взносов).

### Вход
- `GET /lists/public/{slug}` (из Э3)
- `POST/DELETE /items/{id}/reserve` (из Э4)
- `POST /items/{id}/contributions`, `GET /items/{id}/contributions/summary` (из Э4)
- `POST /auth/guest` (из Э2)

### Выход — Артефакты
| Файл | Описание |
|---|---|
| `app/l/[slug]/page.tsx` | SSR, `queryKey: ["list-public", slug]` |
| `components/item/WishItem.tsx` | публичный вид: цена `15 000 ₽`, reserve button, progress bar |
| `components/reservation/ReserveButton.tsx`, `ReservationBadge.tsx` | — |
| `components/contribution/ContributeButton.tsx`, `ContributeModal.tsx`, `ProgressBar.tsx` | Framer Motion анимация |
| `components/guest/GuestNameModal.tsx`, `GuestBanner.tsx` | — |
| `components/empty-states/EmptyPublicList.tsx` | — |

**Контракт гостевого флоу:**
1. Гость открывает `/l/{slug}` — список виден без действий
2. Клик «Зарезервировать» → нет guest_token → GuestNameModal
3. `POST /auth/guest` → guest_token в localStorage → повторить действие
4. GuestBanner показывает: «Вы просматриваете как [имя]. Не очищайте данные браузера.»

### Риски
| Риск | Митигация |
|---|---|
| Владелец видит чужие имена если открывает `/l/{slug}` своего списка | бэкенд фильтрует (INV-01); фронтенд просто рендерит то что пришло — если поля нет, его нет в UI |
| Взнос сверх цели — пользователь не предупреждён | в `ContributeModal` проверять: если `total + amount > target`, показать предупреждение до submit |
| Потеря guest_token → товар заблокирован | GuestBanner явно предупреждает; `/reserve/force` у владельца решает проблему |

### Критерии готовности
- [ ] Открыть `/l/{slug}` в инкогнито без регистрации → список виден
- [ ] Резерв без guest_token → GuestNameModal → ввести имя → резерв проходит → GuestBanner появляется
- [ ] Повторный резерв уже зарезервированного → toast «Подарок уже зарезервирован»
- [ ] Снятие резерва → кнопка возвращается в исходное состояние
- [ ] Внести взнос → прогресс-бар обновляется
- [ ] Взнос сверх цели → предупреждение в модале, но не блокирует submit
- [ ] `npx tsc --noEmit` — 0 ошибок

---

## Этап 10 — Фронтенд: реалтайм ✅ ВЫПОЛНЕН

**Цель:** все изменения состояния отражаются мгновенно у всех открытых клиентов через WS без перезагрузки.

**Зависит от:** Этап 9 (все компоненты UI готовы), Этап 5 (WS бэкенд работает).

### Вход
- `WS /ws/lists/{slug}?token=...` (из Э5)
- Все WS события из `02-architecture.md` §4
- TanStack Query кэш в Э8, Э9

### Выход — Артефакты
| Файл | Описание |
|---|---|
| `hooks/useListWebSocket.ts` | WS соединение, exponential backoff, обработчики событий |
| Изменены: `app/l/[slug]/page.tsx`, `(app)/lists/[listId]/page.tsx` | подключают `useListWebSocket` |

**Патчинг кэша (без перезапроса):**

| Событие | Действие |
|---|---|
| `reservation.changed` | `setQueryData` → обновить `is_reserved`, `reserved_by_me` для item |
| `contribution.added` | `setQueryData` → обновить `total_contributed`, `progress_pct` |
| `contribution.removed` | `setQueryData` → обновить summary |
| `item.created` | `setQueryData` → добавить item |
| `item.updated` | `setQueryData` → обновить item |
| `item.deleted` | `setQueryData` → убрать item |
| `item.reordered` | `setQueryData` → пересортировать |
| `list.updated` | `setQueryData` → обновить метаданные |
| `error` | toast через sonner |

**Реконнект:** exponential backoff `[1000, 2000, 4000, 8000, 16000, 30000]` мс; при реконнекте `queryClient.invalidateQueries(["list-public", slug])`.

### Риски
| Риск | Митигация |
|---|---|
| Пропущены события при реконнекте → UI рассинхронизирован | `invalidateQueries` при каждом реконнекте гарантирует свежие данные |
| Несколько экземпляров хука создают несколько WS-соединений | хук гарантирует один WS на slug через ref |
| Owner-клиент получает `reserver_name` из WS → утечка данных | тест: подключить WS с owner-токеном, проверить payload события |

### Критерии готовности
- [ ] Два браузера → резерв в первом → кнопка в втором меняется **без перезагрузки** (<500мс)
- [ ] Owner в третьем браузере → `reserver_name` **отсутствует** в WS-событии (INV-01 + INV-06)
- [ ] Разорвать WS (DevTools → Network → отключить) → reconnect через backoff → список актуален
- [ ] Три одновременных клиента, быстрые взносы → прогресс-бар обновляется у всех без дублирования
- [ ] `npx tsc --noEmit` — 0 ошибок

---

## Этап 11 — Деплой ✅ ВЫПОЛНЕН

**Цель:** приложение задеплоено на Railway + Vercel, доступно по публичным URL, все функции работают.

**Зависит от:** Этапы 0–10.

### Вход
- Рабочее приложение (все предыдущие этапы)
- `02-architecture.md` §9 (переменные окружения)
- Аккаунты Railway и Vercel, подключённый GitHub

### Выход — Артефакты
| Артефакт | Описание |
|---|---|
| Railway project | FastAPI + PostgreSQL + Redis, публичный URL |
| Vercel project | Next.js, публичный URL |
| `.env.example` | все env-переменные с описанием, без значений |

### Задачи
- [ ] Railway: создать проект, добавить PostgreSQL 16 и Redis 7 плагины
- [ ] Настроить env-переменные на Railway (`02-architecture.md` §9)
- [ ] `backend/Dockerfile` — `CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]`
- [ ] Railway start command: `alembic upgrade head && uvicorn main:app ...`
- [ ] Vercel: импортировать фронтенд, настроить `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`
- [ ] CORS: `ALLOWED_ORIGINS` на бэкенде включает Vercel URL

### Риски
| Риск | Митигация |
|---|---|
| `alembic upgrade head` падает при деплое → сервис не стартует | проверить migration idempotency локально перед пушем |
| WSS не работает через Railway прокси | Railway поддерживает WebSocket нативно; проверить в smoke test |
| CORS блокирует запросы Vercel → Railway | точный URL Vercel в `ALLOWED_ORIGINS`; не `*` |
| Секреты попали в git | `git log --all -- '*.env'` + `.gitignore` проверка |

### Критерии готовности
- [ ] `GET https://wishify-backend.up.railway.app/api/v1/health` → `{"status":"ok","db":"ok","redis":"ok"}`
- [ ] E2E smoke test:
  - [ ] Регистрация на Vercel → логин → создание списка → добавление товара → копирование ссылки
  - [ ] Открыть ссылку в инкогнито → ввести имя → зарезервировать → прогресс-бар виден
  - [ ] Оригинальный браузер (owner) → резерв отображается мгновенно, но без имени резервирующего
- [ ] WSS соединение устанавливается через production URL
- [ ] `git log --all --oneline -- '**/.env'` — пусто

---

## Сводный чеклист инвариантов

| # | Инвариант | Этапы проверки |
|---|---|---|
| INV-01 | Owner не получает имена резервирующих и вкладчиков | Э3, Э4, Э5, Э9, Э10 |
| INV-02 | Двойное резервирование → 409 через UNIQUE INDEX | Э1, Э4 |
| INV-03 | Soft-delete при наличии взносов **или** резерва | Э1, Э3 |
| INV-04 | Redis PUBLISH строго после DB commit | Э5 |
| INV-05 | caller_role определяется только на бэкенде | Э3, Э5, Э9 |
| INV-06 | WS payload фильтруется per-connection, не broadcast | Э5, Э10 |
| INV-07 | Публичный эндпоинт не возвращает 401 | Э2, Э3 |
| INV-08 | Секреты только в env-переменных | Э0, Э11 |
| INV-09 | Деньги — NUMERIC/Decimal, не float | Э1, Э4 |
| INV-10 | guest_token не логируется | Э2, Э5 |
