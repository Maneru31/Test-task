# ADR — Архитектурные решения Wishify Mobile

> Architecture Decision Record · Этап 1
> Назначение: справочник для всех этапов разработки

---

## 1. Спорные решения (trade-offs)

### 1.1. Refresh token — in-memory cookie, не Keychain

**Решение:** `tough-cookie` CookieJar держит refresh token только в памяти процесса.

**Проблема:** при холодном старте jar пуст → если access token просрочен → принудительный logout.

**Альтернатива (не выбрана):** хранить refresh token строкой в Keychain так же, как access token, и вручную добавлять `Cookie: refresh_token=...` к запросу `/auth/refresh`.

**Почему не выбрана:** бэкенд читает refresh token только из `httpOnly` cookie; изменять бэкенд запрещено. Добавление токена в header потребовало бы изменения бэкенда.

**Последствие:** UX-деградация раз в ~15 минут (lifetime access token) после перезапуска приложения. Осознанный trade-off безопасность > UX.

---

### 1.2. wsManager — синглтон, не хук

**Решение:** `wsManager` — модульный синглтон (`export const wsManager = new WsManager()`), хук `useListWebSocket` только подписывается на него.

**Проблема:** при одновременном монтировании двух компонентов с разными slug — второй вызов `connect()` убивает первое соединение (внутри вызывается `disconnect()` перед новым подключением).

**Ограничение:** в один момент времени — одно WS-соединение. Это соответствует навигационной модели (один активный экран).

**Что нельзя делать:** не вызывать `wsManager.connect()` для двух разных slug одновременно.

---

### 1.3. TanStack Query — инвалидация вместо merge при WS-событиях

**Решение:** любое WS-событие → `queryClient.invalidateQueries(...)` → сеть делает refetch.

**Альтернатива (не выбрана):** точечный merge события в кэш (`queryClient.setQueryData`).

**Почему не выбрана:** merge требует воспроизводить всю бизнес-логику бэкенда на клиенте (особенно для `reservation.changed`, `contribution.added`). Риск расхождения состояний высок.

**Последствие:** при каждом WS-событии — HTTP-запрос. На slow connection видна задержка. Приемлемо для MVP.

---

### 1.4. Zustand без persist middleware

**Решение:** `authStore` и `uiStore` — чистый in-memory Zustand без `persist`.

**Причина:** access token хранится в Keychain (не в store); `initialize()` восстанавливает состояние при старте. Persist store дублировал бы токен в AsyncStorage (небезопасно).

**Что нельзя делать:** не добавлять `persist` к `authStore` без явного согласования — это создаст дублирование токена в незашифрованном хранилище.

---

### 1.5. Абсолютные импорты через `@/`

**Решение:** alias `@/*` → `src/*` через `tsconfig.json` + babel plugin `module-resolver`.

**Риск:** metro bundler и Jest требуют отдельной конфигурации (`moduleNameMapper` в jest.config.js). При обновлении RN нужно проверять совместимость.

**Правило:** все импорты внутри `src/` используют `@/...`, никаких `../../`.

---

## 2. Контракты и границы

### 2.1. Граница: мобильный клиент ↔ бэкенд

| Endpoint | Метод | Кто вызывает | Контракт |
|----------|-------|-------------|---------|
| `/auth/login` | POST | `authApi.login()` | Возвращает `{ access_token, user }` в теле |
| `/auth/register` | POST | `authApi.register()` | Аналогично login |
| `/auth/refresh` | POST | interceptor в `client.ts` | Cookie `refresh_token` обязателен; возвращает `{ access_token }` |
| `/auth/me` | GET | `authStore.initialize()` | Bearer token обязателен; возвращает `User` |
| `/auth/logout` | POST | `authStore.logout()` | Инвалидирует cookie на сервере |
| `/auth/guest` | POST | `authApi.createGuestSession()` | Возвращает `{ guest_token, display_name }` |
| `/lists` | GET/POST | `listsApi` | Bearer token обязателен |
| `/lists/public/{slug}` | GET | `listsApi.getPublicList()` | Публичный; опционально `X-Guest-Token` |
| `/lists/{id}/items/reorder` | PATCH | `itemsApi.reorderItems()` | Body: `{ item_ids: string[] }` |
| `/items/{id}/reserve` | POST/DELETE | `reservationsApi` | Guest token или Bearer |
| `/items/{id}/contributions` | POST | `contributionsApi` | Guest token или Bearer |
| `/items/scrape` | POST | `scrapeApi` | Body: `{ url: string }`; Bearer опционален |
| `wss://.../ws/lists/{slug}` | WS | `wsManager` | Query param `?token=` опционален |

**Заголовки:**
- `Authorization: Bearer <access_token>` — для авторизованных запросов
- `X-Guest-Token: <guest_token>` — прикрепляется interceptor'ом автоматически рядом с Bearer

### 2.2. Граница: API-слой ↔ Zustand store

- `authStore` **не знает** о `listsApi`, `itemsApi` и т.д.
- `authStore` **знает** о `apiClient` только через динамический import (`await import('@/api/client')`) — чтобы избежать circular dependency.
- `apiClient` **знает** о `authStore` через `useAuthStore.getState()` — только для вызова `logout()` и `setAccessToken()`.

### 2.3. Граница: навигация ↔ store

- Навигация читает только `authStore.status` для выбора Auth/App-ветки.
- Навигация **не делает** API-запросов напрямую.
- Экраны получают данные через TanStack Query хуки, не через навигационные параметры (кроме `listId`, `slug` как ключей для query).

### 2.4. Граница: wsManager ↔ TanStack Query

- `wsManager` не знает о TanStack Query.
- Только хук `useListWebSocket` связывает WS-события с `queryClient.invalidateQueries`.
- `wsManager` получает только `slug` и опционально `token`. Никаких ссылок на store или query client внутри `WsManager`.

---

## 3. Архитектурные инварианты

> Это то, что **нельзя нарушать** ни в одном следующем этапе.

### INV-01: Токены только через tokenService / guestService

Access token **никогда** не хранится в:
- `AsyncStorage`
- `MMKV` (кроме guest token через `guestService`)
- Zustand persist
- SecureStorage без `tokenService`

Любое чтение/запись access token — только через `tokenService`.

---

### INV-02: apiClient — единственная точка HTTP

Все HTTP-запросы к бэкенду **только** через `apiClient` из `src/api/client.ts`.

Нельзя создавать второй `axios.create()` в экранах или хуках — это обходит interceptors (401 refresh, guest token header).

---

### INV-03: Interceptor refresh не вызывается рекурсивно

Запрос `/auth/refresh` помечен флагом `_retry = true`. Если `/auth/refresh` сам вернёт 401 — немедленный logout, без повторного refresh. Нельзя убирать проверку `!originalRequest._retry`.

---

### INV-04: WsManager — одно соединение в момент времени

`wsManager.connect(slug)` всегда вызывает `disconnect()` перед установкой нового соединения. Нельзя удалять этот вызов — иначе будут утечки сокетов.

---

### INV-05: Zustand authStore — единственный источник auth-состояния

Компоненты и хуки читают статус авторизации только через `useAuthStore()`. Нельзя хранить `isLoggedIn` в локальном state или в `uiStore`.

---

### INV-06: PublicListScreen доступен без авторизации

`PublicList` — всегда в `RootNavigator` вне Auth/App ветки. Нельзя переносить его внутрь `AppNavigator` — это сломает deep link для неавторизованных пользователей.

---

### INV-07: Path alias @/ — только для src/

`@/` резолвится в `src/`. Нельзя добавлять второй alias или менять `baseUrl` без синхронного обновления `tsconfig.json`, `babel.config.js` и `jest.config.js` одновременно.

---

### INV-08: Реакция на WS-события — только invalidate, не merge

Хук `useListWebSocket` при любом событии вызывает `invalidateQueries`, не `setQueryData` для merge. Нельзя делать частичный merge без покрытия тестами всех типов событий — риск расхождения с сервером.

---

### INV-09: Экраны обёрнуты в SafeAreaView

Каждый экран-компонент использует `<SafeAreaView>` из `react-native-safe-area-context`. Нельзя использовать `SafeAreaView` из `react-native` (не поддерживает bottom inset на iPhone с notch).

---

### INV-10: reanimated/plugin — последний в babel plugins

В `babel.config.js` плагин `react-native-reanimated/plugin` **всегда последний** в массиве `plugins`. Нарушение вызывает silent runtime crash анимаций.
