# Wishify — Архитектурное ревью (глубокое)

> Роль: архитектор | Статус: v1.0 | Дата: 2026-03-14
> Базис: `02-architecture.md`, `03-architecture-review.md`, `04-work-plan.md`

---

## TL;DR

| Категория | Оценка | Главный риск |
|---|---|---|
| Масштабирование | ⚠️ Условно | N+1 запросы, отсутствие пагинации |
| Консистентность | ⚠️ Условно | Fire-and-forget Redis pub/sub, optimistic update без rollback |
| Отказоустойчивость | ✅ Приемлемо | Redis деградирует без падения REST |
| Наблюдаемость | ❌ Слабо | Нет correlation ID, нет метрик |

---

## 1. Слабые места

### 1.1 Масштабирование

#### N+1 запросы в PublicList endpoint

`GET /lists/public/{slug}` возвращает список со всеми товарами, резервациями и взносами. Наивная реализация:

```python
# Псевдокод — антипаттерн
items = await db.query(Item).filter(Item.list_id == list.id).all()
for item in items:                          # N итераций
    item.reservation = await db.query(...)  # +N запросов
    item.contributions = await db.query(...) # +N запросов
# Итого: 1 + N + N = 2N+1 запросов
```

Для списка из 20 товаров — 41 запрос к БД на каждый `GET`.

**Решение:** явный `selectinload` / `joinedload` в SQLAlchemy:
```python
await db.execute(
    select(Item)
    .options(
        selectinload(Item.reservation),
        selectinload(Item.contributions)
    )
    .where(Item.list_id == list_id, Item.deleted_at.is_(None))
)
```

#### Отсутствие пагинации

`GET /lists` возвращает все списки пользователя. Контракт не описывает лимит. Пользователь с 200+ списками получит один огромный payload. Для MVP приемлемо — нужно зафиксировать явное решение «не пагинируем до X записей», а не молча оставить.

#### url_scrape_cache в основной БД

Кэш скрейпера хранится в PostgreSQL рядом с бизнес-данными. При частом использовании (rate limit 10/мин * N пользователей) это лишняя write pressure на основной инстанс. Для тестового задания OK, но архитектурно неправильно — кэш логично держать в Redis с TTL.

---

### 1.2 Консистентность

#### Fire-and-forget Redis pub/sub

Текущая схема: `session.commit() → redis.publish()`. Redis pub/sub — fire-and-forget: если подписчик (воркер) не активен в момент publish, сообщение **теряется навсегда**. Нет буферизации, нет acknowledgement.

**Сценарий потери события:**
```
Worker 1: commit() → publish("list:xK9mP2", ...)
Worker 2: перезапускается в этот момент
          → не получает сообщение
          → его WS-клиенты не получают событие
          → видят устаревший UI до reconnect
```

Это приемлемо для realtime UX (eventual consistency через reconnect), но нужно задокументировать как явный trade-off.

**Альтернатива:** Redis Streams — персистентная очередь с consumer groups, replay при reconnect. Сложнее, но даёт at-least-once delivery. Для тестового задания pub/sub оправдан.

#### Optimistic updates без стратегии rollback

Drag-and-drop (`PATCH /items/reorder`) делает optimistic update в TanStack Query cache. При ошибке сети — `invalidateQueries`. Но:
- Contributions/reservations тоже могут делать optimistic update в будущем
- При rollback пользователь видит «прыжок» UI
- Нет документированной стратегии: «всегда optimistic» или «только для reorder»

**Решение:** явно зафиксировать: optimistic update **только** для reorder (низкий риск конфликта). Reservation и contribution — pessimistic (ждём ответа сервера).

#### Race condition при hard-delete и взносах (уже в review §1.6)

Проверка и DELETE должны быть в одной транзакции. Важно: это не исправлено в `04-work-plan.md` на уровне кода — только упомянуто как риск. Нужен явный паттерн:

```python
async with session.begin():
    # Блокируем строку
    item = await session.execute(
        select(Item).where(Item.id == item_id).with_for_update()
    )
    count = await session.scalar(
        select(func.count()).where(Contribution.item_id == item_id)
    )
    if count > 0:
        raise HTTPException(400, "has_contributions")
    await session.delete(item)
    # Commit в конце блока
```

---

### 1.3 Отказоустойчивость

#### Redis недоступен в момент publish

Обрабатывается через `try/except` — REST продолжает работать. Но: если Redis упал после `commit()`, событие теряется. Клиенты узнают об изменении только при следующем reconnect (который делает `invalidateQueries`). Это корректная деградация — **нужно задокументировать явно**.

```
Нормальный режим:  REST → DB commit → Redis publish → WS broadcast
Деградация Redis:  REST → DB commit → (publish failed, logged) → WS клиенты отстают
Восстановление:    WS reconnect → invalidateQueries → актуальные данные
```

#### Uvicorn --workers 4 vs Gunicorn

В Dockerfile задано `uvicorn main:app --workers 4`. Uvicorn с `--workers` использует `multiprocessing.Process` напрямую. Проблемы:
- Graceful shutdown ненадёжен: при сигнале SIGTERM дочерние процессы могут не успеть завершить in-flight WebSocket соединения
- Правильный способ для production: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker`

**Важно:** Railway запускает один контейнер. 4 воркера — это 4 процесса в одном контейнере. При ограничении Railway по памяти (512 МБ на starter план) — 4 воркера могут вызвать OOM.

**Рекомендация:** начать с 1–2 воркерами, переключиться на gunicorn.

#### Миграция при деплое без rollback-стратегии

```
Railway start: alembic upgrade head && uvicorn ...
```

Если миграция падает — сервис не стартует, новый инстанс не поднимается. Старый инстанс продолжает работать со старой схемой. Если миграция деструктивная (DROP COLUMN) — данные потеряны до обнаружения.

**Решение:** expand/contract миграции (backward-compatible):
- Шаг 1: ADD COLUMN (безопасно)
- Шаг 2: деплой нового кода, который пишет в оба столбца
- Шаг 3: DROP старого столбца

#### Google OAuth single point of failure

Пользователи, зарегистрированные только через Google (нет пароля), не могут войти если Google недоступен. Нет UX-сообщения об этом. Нет fallback.

---

### 1.4 Наблюдаемость

Это самое слабое место архитектуры.

#### Нет correlation ID

Запрос `POST /items/{id}/reserve` проходит путь:
```
HTTP → router → deps → service → DB → Redis → WS
```

Без correlation ID невозможно связать лог из router с логом из ws_manager при отладке проблемы. При 4 воркерах логи перемешиваются.

**Минимальное решение:**
```python
# middleware
import uuid
@app.middleware("http")
async def add_correlation_id(request: Request, call_next):
    request.state.correlation_id = str(uuid.uuid4())[:8]
    response = await call_next(request)
    response.headers["X-Correlation-ID"] = request.state.correlation_id
    return response
```

#### Нет структурированного логирования

`logging.info("reserved item %s", item_id)` — неструктурированный лог, сложно парсить в Railway Logs.

**Рекомендация:** `structlog` или хотя бы `extra={"item_id": str(item_id), "user_id": str(user_id)}`.

#### `/health` не показывает реальное состояние

Текущий health endpoint пингует DB и Redis. Не показывает:
- Количество активных WS-соединений
- Количество pending фоновых задач
- Время последнего scrape cache hit

**Минимальное расширение:**
```json
{
  "status": "ok",
  "db": "ok",
  "redis": "ok",
  "ws_connections": 42,
  "uptime_seconds": 3600
}
```

#### Нет error codes — только строки

```python
raise HTTPException(409, detail="Item already reserved")
```

Строки меняются, их сложно мониторить. Рекомендация — машиночитаемые коды:
```python
raise HTTPException(409, detail={"code": "RESERVATION_CONFLICT", "message": "..."})
```

---

## 2. Спорные решения

### Решение A: WebSocket token в query string

**Текущее:** `WS /ws/lists/{slug}?token={jwt_or_guest_token}`

**Проблема:** query string попадает в:
- Access logs Railway (по умолчанию)
- Browser history
- Referer header при навигации

JWT/guest_token в логах = потенциальная утечка.

**Альтернативы:**

| Подход | Плюсы | Минусы |
|---|---|---|
| Query string (текущий) | Просто, работает везде | Токен в логах |
| Cookie (httpOnly) | Безопасно, автоматически | Требует sameSite=None + HTTPS, CORS сложнее |
| First-message auth | Токен не в URL | Нужна дополнительная логика handshake |

**Рекомендация:** first-message auth — клиент устанавливает WS, первым сообщением отправляет `{ "event": "auth", "token": "..." }`, сервер отвечает `connected` или закрывает с кодом 4001. Логи чисты.

---

### Решение B: Redis pub/sub vs Streams

**Текущее:** pub/sub (fire-and-forget)

| Критерий | pub/sub | Streams |
|---|---|---|
| Доставка | At-most-once | At-least-once |
| Replay при reconnect | Нет | Да (с consumer group offset) |
| Сложность | Низкая | Средняя |
| Подходит для MVP | ✅ | Избыточно |

**Рекомендация:** оставить pub/sub, но явно задокументировать в ADR: «мы выбрали at-most-once delivery, компенсируем через reconnect+refetch».

---

### Решение C: Uvicorn workers vs горизонтальное масштабирование

**Текущее:** 1 Railway service + `--workers 4`

**Альтернатива:** 1 Railway service + `--workers 1` + Railway Replicas (горизонтальное)

| | 4 workers в 1 контейнере | 4 replica × 1 worker |
|---|---|---|
| Memory | 4 × heap в одном контейнере | 4 × контейнер (Railway billing) |
| WS broadcast | Redis pub/sub нужен | Redis pub/sub нужен |
| Deploy | 1 restart = все клиенты теряют WS | Rolling deploy — часть клиентов теряет |
| Graceful shutdown | Сложнее | Проще |
| Стоимость | Дешевле | Дороже |

**Рекомендация:** для тестового задания — `--workers 2` (не 4). Меньше шансов OOM на Railway free tier.

---

### Решение D: CASCADE DELETE на contributions

**Текущее:** `contributions.item_id FK → items.id CASCADE DELETE`

**Проблема:** жёсткое удаление item (когда нет взносов — по бизнес-правилу) физически удаляет строки. Но бизнес-правило «нет взносов → разрешён hard-delete» имеет race condition: взнос может появиться между проверкой и DELETE.

**Альтернатива:** убрать `ON DELETE CASCADE` из contributions, сделать проверку + DELETE в транзакции явно в коде. Тогда при появлении взноса в последний момент — FK constraint NOT NULL защитит от orphan записи.

**Рекомендация:** убрать CASCADE с contributions, оставить только на reservations (резервации при hard-delete логично удалять каскадно — они не несут финансовой истории).

---

### Решение E: Хранение refresh_token (уже в review §1.1, дополнение)

**Проблема с httpOnly cookie** — не только CORS. При SSR (Next.js server component делает fetch к Railway) cookie браузера **не передаётся** автоматически в server-side fetch. Нужно явно прокидывать cookie через `headers()` Next.js.

**Полная матрица:**

| Хранилище | XSS | CSRF | SSR | Сложность |
|---|---|---|---|---|
| localStorage (оба токена) | ❌ Уязвим | ✅ Защищён | ✅ Просто | Низкая |
| httpOnly cookie (refresh) + память (access) | ✅ Защищён | ⚠️ Нужен SameSite | ⚠️ Нужна передача | Средняя |
| httpOnly cookie (оба) | ✅ Защищён | ⚠️ Нужен CSRF token | ⚠️ Нужна передача | Высокая |

**Рекомендация для тестового задания:** access_token в памяти (React state), refresh_token в httpOnly + SameSite=Strict cookie. SSR-страницы используют только публичные данные (не требуют авторизации при первом рендере).

---

## 3. Архитектурные инварианты

> Дополнение к INV-01..INV-10 из `03-architecture-review.md`

### INV-11 — WebSocket token не попадает в логи

Независимо от способа передачи токена (query string, first-message) — он не логируется в structured logs, не попадает в access logs в читаемом виде.

```python
# Запрещено
logger.info(f"WS connect: token={token}")

# Допустимо
logger.info("WS connect", extra={"user_id": str(user_id), "list_slug": slug})
```

### INV-12 — Scraper не резолвит RFC 1918 адреса

DNS-резолвинг происходит **до** запроса, IP проверяется **после** резолвинга. Только hostname-проверки недостаточно (DNS rebinding).

```python
import socket, ipaddress

async def is_ssrf_safe(url: str) -> bool:
    hostname = urlparse(url).hostname
    try:
        ip = socket.gethostbyname(hostname)
    except socket.gaierror:
        return False
    addr = ipaddress.ip_address(ip)
    return not (addr.is_private or addr.is_loopback or addr.is_link_local)
```

### INV-13 — Проверка + мутация в одной транзакции

Любая операция вида «проверить условие → изменить данные» выполняется в одной транзакции с пессимистическим локом. Проверка вне транзакции + изменение в другой — race condition.

```python
# Запрещено
count = await check_contributions(item_id)   # транзакция 1
if count == 0:
    await delete_item(item_id)               # транзакция 2 — race!

# Правильно
async with session.begin():
    item = await session.get(Item, item_id, with_for_update=True)
    count = await count_contributions(session, item_id)
    if count == 0:
        await session.delete(item)
```

### INV-14 — Публичные данные не содержат внутренних идентификаторов резервирующих

Ответ `GET /lists/public/{slug}` для viewer-роли может содержать `reserver_name` (отображаемое имя), но **не** `reserver_user_id`, `guest_session_id` или любой другой идентификатор, по которому можно отследить личность.

### INV-15 — Деградация Redis не приводит к ошибке REST

Redis publish — best-effort. REST всегда возвращает корректный ответ независимо от доступности Redis.

```python
try:
    await redis.publish(channel, message)
except Exception:
    logger.warning("Redis publish failed", extra={"channel": channel})
    # Не re-raise — не ломаем REST
```

---

## 4. Минимальный набор диаграмм и ADR

### 4.1 ADR (Architecture Decision Records)

Для каждого — формат: контекст → варианты → решение → последствия.

| # | Заголовок | Почему критично |
|---|---|---|
| ADR-001 | Хранение JWT: memory + httpOnly cookie | Влияет на безопасность и SSR-архитектуру |
| ADR-002 | Redis pub/sub vs Streams для WS broadcast | Явно фиксирует at-most-once как осознанный выбор |
| ADR-003 | WebSocket auth: query string vs first-message | Безопасность токенов в логах |
| ADR-004 | Soft-delete vs hard-delete: условия | Защита финансовой истории |
| ADR-005 | Uvicorn workers: 2 внутри контейнера | Компромисс между production-ready и Railway free tier |

### 4.2 Диаграммы

#### Приоритет 1 — обязательные

**D1. Sequence diagram: резервирование с race condition**
```
Показывает: Client A → POST /reserve → DB → UniqueViolation → 409
            Client B (параллельно) → POST /reserve → DB → 201
            → Redis publish → WS broadcast (оба клиента)
Зачем: единственная диаграмма, объясняющая ключевой инвариант INV-02
```

**D2. Data flow: изменение состояния**
```
REST request
    → FastAPI router (auth check)
    → Service (business logic)
    → PostgreSQL commit
    → Redis PUBLISH
    → [Worker 1] WS broadcast (owner filter)
    → [Worker 2] WS broadcast (viewer filter)
    → TanStack Query cache patch (без refetch)
Зачем: показывает INV-04 (порядок), INV-06 (per-connection filter)
```

**D3. ER-диаграмма (упрощённая)**
```
Только ключевые связи:
users ←── lists ←── items ←──── reservations
                        └────── contributions
                guest_sessions ─┘
Зачем: FK, CASCADE DELETE, partial UNIQUE INDEX — всё в одном месте
```

#### Приоритет 2 — желательные

**D4. Deployment diagram**
```
Vercel (Next.js) ──HTTPS──▶ Railway FastAPI (2 workers)
                  ──WSS───▶
                            ├──▶ PostgreSQL (Railway Plugin)
                            └──▶ Redis (Railway Plugin)
Зачем: видно, где CORS, где WSS, Railway topology
```

**D5. Auth flow: три пути**
```
Email/password → JWT
Google OAuth → redirect chain → JWT
Guest → display_name → guest_token
Зачем: три пути в одной диаграмме, видно где localStorage, где cookie
```

**D6. Фронтенд: state ownership**
```
Server state (TanStack Query)
    ├── ["lists"] → Dashboard
    ├── ["list", id] → Owner view
    └── ["list-public", slug] → Public view ←── WS патчит

Client state (React Context)
    ├── AuthContext → user, accessToken (memory only)
    └── GuestContext → guestToken (localStorage)

Local state (useState)
    └── Модалы, формы, drag state
Зачем: разграничивает ответственность, предотвращает дублирование
```

### 4.3 Что НЕ нужно диаграммировать

- Структура файлов — достаточно `04-work-plan.md`
- Полная ER с всеми полями — достаточно `02-architecture.md §2`
- CI/CD pipeline — его нет в проекте
- Компонентное дерево React — генерируется из кода

---

## 5. Итоговые рекомендации

### Нужно исправить до реализации

| # | Проблема | Изменение |
|---|---|---|
| R1 | N+1 запросы в PublicList | `selectinload` в `list_service.py` |
| R2 | CASCADE DELETE на contributions | Убрать, заменить транзакционной проверкой (INV-13) |
| R3 | `--workers 4` → `--workers 2` | Dockerfile, риск OOM на Railway free tier |
| R4 | WS token в query string | Рассмотреть first-message auth (ADR-003) |
| R5 | Correlation ID в логах | Middleware — 10 строк кода, даёт возможность отлаживать |

### Приемлемо для тестового задания, документировать как trade-off

| # | Решение | Trade-off |
|---|---|---|
| T1 | Redis pub/sub (at-most-once) | Простота vs гарантия доставки |
| T2 | url_scrape_cache в PostgreSQL | Не нужен отдельный Redis TTL |
| T3 | Нет пагинации | Ок до ~100 записей на пользователя |
| T4 | Нет Prometheus/метрик | Railway Logs достаточно для MVP |

### Можно добавить после MVP

- Structured logging с `structlog`
- `/health` с WS connection count
- Error codes вместо строк в `detail`
- Expand/contract migration strategy
- Redis Streams при росте нагрузки
