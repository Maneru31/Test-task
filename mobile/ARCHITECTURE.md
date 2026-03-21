# Этап 1: Архитектура — Wishify Mobile (iOS)

> **Платформа:** iOS · React Native CLI 0.74.x · TypeScript 5.4.x
> **Бэкенд:** FastAPI (Railway) — без изменений
> **Статус:** Этап 1 завершён

---

## Слои приложения

```
┌─────────────────────────────────────────┐
│           Wishify iOS App               │
│                                         │
│  ┌─────────────┐   ┌─────────────────┐  │
│  │  Navigation │   │  Zustand Store  │  │
│  │  (Stack +   │   │  (auth, ui)     │  │
│  │   Tabs)     │   │                 │  │
│  └─────────────┘   └─────────────────┘  │
│                                         │
│  ┌─────────────────────────────────────┐ │
│  │  TanStack Query (server state)      │ │
│  │  Optimistic updates, cache          │ │
│  └─────────────────────────────────────┘ │
│                                         │
│  ┌─────────────┐   ┌─────────────────┐  │
│  │  Axios +    │   │  WebSocket      │  │
│  │  Interceptors│  │  (wsManager)    │  │
│  └─────────────┘   └─────────────────┘  │
│                                         │
│  ┌─────────────────────────────────────┐ │
│  │  Keychain (tokens) + MMKV (prefs)  │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
              ↕ HTTPS / WSS
┌─────────────────────────────────────────┐
│  FastAPI (Railway) · PostgreSQL · Redis │
└─────────────────────────────────────────┘
```

---

## Структура папок

```
mobile/
├── src/
│   ├── api/
│   │   ├── client.ts           ✅ Axios + interceptors (auth + refresh)
│   │   ├── auth.ts             ✅ Login, Register, OAuth, Me
│   │   ├── lists.ts            ✅ CRUD списков + публичный доступ
│   │   ├── items.ts            ✅ CRUD элементов + reorder
│   │   ├── reservations.ts     ✅ Reserve / Release
│   │   ├── contributions.ts    ✅ Вклады в групповой фонд
│   │   └── scrape.ts           ✅ Скрапинг URL
│   │
│   ├── navigation/
│   │   ├── RootNavigator.tsx   ✅ Auth/App switch + PublicList modal
│   │   ├── AuthNavigator.tsx   ✅ Stack: Login, Register, OAuthCallback
│   │   ├── AppNavigator.tsx    ✅ Bottom Tabs: Lists, Profile
│   │   ├── ListsStackNavigator.tsx ✅ Stack: Dashboard → Detail → etc
│   │   └── linking.ts          ✅ Deep links (wishify://, wishify.app)
│   │
│   ├── store/
│   │   ├── authStore.ts        ✅ Zustand: status, user, token, init/logout
│   │   └── uiStore.ts          ✅ Zustand: toasts, modals
│   │
│   ├── services/
│   │   ├── tokenService.ts     ✅ Keychain: save/get/clear access token
│   │   ├── guestService.ts     ✅ MMKV: guest token + display name
│   │   └── wsManager.ts        ✅ WebSocket singleton + exponential backoff
│   │
│   ├── types/
│   │   ├── api.ts              ✅ Все DTO из бэкенда + WsEvent union
│   │   └── navigation.ts       ✅ ParamList-типы всех навигаторов
│   │
│   ├── constants/
│   │   ├── colors.ts           ✅ Цветовая палитра бренда
│   │   ├── layout.ts           ✅ Spacing + borderRadius
│   │   ├── api.ts              ✅ BASE_URL, WS_URL, timeout
│   │   └── index.ts            ✅ Barrel export
│   │
│   └── App.tsx                 ✅ Root: Providers (GestureHandler, SafeArea, QueryClient)
│
├── package.json                ✅ Все зависимости с версиями
├── tsconfig.json               ✅ strict + path alias @/*
├── babel.config.js             ✅ reanimated/plugin последним
├── jest.config.js              ✅ transformIgnorePatterns для RN-либ
└── .env.example                ✅ API_BASE_URL + WS_BASE_URL
```

---

## Ключевые архитектурные решения

| Решение | Обоснование |
|---------|-------------|
| React Native CLI (не Expo) | Нативный Keychain, draggable-flatlist, полный Info.plist |
| Keychain для access token | AsyncStorage не зашифрован; Keychain защищён Secure Enclave |
| tough-cookie + CookieJar | Бэкенд отдаёт refresh в httpOnly cookie; jar держит его в памяти |
| TanStack Query v5 | Server state: кэш, stale-while-revalidate, optimistic updates |
| Zustand (не Redux) | Минимальный boilerplate для auth + ui state |
| wsManager singleton | Единая точка подключения WS; exponential backoff до 30s |
| @/... path alias | Абсолютные импорты без `../../..` |

---

## Flow аутентификации

```
Cold start
  → initialize() читает token из Keychain
  → GET /auth/me (Bearer token)
    ✓ 200 → status = 'authenticated'
    ✗ 401 → clearTokens() → status = 'unauthenticated'

Login / Register
  → POST /auth/login|register
  → access_token в body → saveAccessToken(Keychain)
  → refresh_token в Set-Cookie → jar (in-memory)

401 на любом запросе
  → interceptor → POST /auth/refresh (jar отправит cookie)
    ✓ новый token → Keychain + retry
    ✗ 401 → logout() (jar пуст после restart)

Google OAuth
  → InAppBrowser.openAuth() (SFSafariViewController)
  → redirect wishify://oauth/callback?access_token=...
  → парсим токен → saveAccessToken()
```

---

## WebSocket архитектура

```
PublicListScreen монтируется
  → useListWebSocket(slug)
    → wsManager.connect(slug, token?)
    → ws.onmessage → dispatch WsEvent
      → queryClient.invalidateQueries(['publicList', slug])
    → AppState 'active' → wsManager.connect() (переподключение из фона)
  → unmount → wsManager.disconnect()

Reconnect strategy: 1s → 2s → 4s → ... → 30s (exponential backoff)
```

---

## Deep Links

| URL | Экран |
|-----|-------|
| `wishify://l/{slug}` | PublicListScreen |
| `https://wishify.app/l/{slug}` | PublicListScreen |
| `wishify://oauth/callback?access_token=...` | OAuthCallbackScreen |
| `wishify://lists` | DashboardScreen |

---

## Следующие этапы

- **Этап 2:** Bootstrapping — `npx react-native init`, pod install, нативные настройки (Info.plist, Podfile)
- **Этап 3:** Auth screens — LoginScreen, RegisterScreen, OAuthCallbackScreen
- **Этап 4:** Dashboard + ListDetail — DashboardScreen, ListDetailScreen, drag-and-drop
- **Этап 5:** PublicListScreen — резервирование, вклады, WebSocket real-time
- **Этап 6:** UI-компоненты — Button, Input, Card, Badge, ProgressBar, Skeleton
- **Этап 7:** Тестирование — Unit (MSW), E2E (Detox)
- **Этап 8:** CI/CD + App Store
