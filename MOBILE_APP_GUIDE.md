# Wishify iOS — React Native CLI: Полная инструкция

> **Аудитория:** Full-stack mobile developer
> **Платформа:** iOS (React Native CLI, без Expo)
> **Бэкенд:** FastAPI (Railway) — существующий, без изменений
> **Дата:** 2026-03-18

---

## 0. Оглавление

1. [Общая архитектура](#1-общая-архитектура)
2. [Стек технологий](#2-стек-технологий)
3. [Структура папок](#3-структура-папок)
4. [Bootstrapping: инициализация проекта](#4-bootstrapping-инициализация-проекта)
5. [Навигация](#5-навигация)
6. [Аутентификация и сессии](#6-аутентификация-и-сессии)
7. [API-слой](#7-api-слой)
8. [WebSocket (real-time)](#8-websocket-real-time)
9. [Экраны и фичи](#9-экраны-и-фичи)
10. [UI / компоненты](#10-ui--компоненты)
11. [State Management](#11-state-management)
12. [Deep Linking](#12-deep-linking)
13. [Push-уведомления (MVP+)](#13-push-уведомления-mvp)
14. [Тестирование](#14-тестирование)
15. [CI/CD и деплой в App Store](#15-cicd-и-деплой-в-app-store)
16. [Чеклист перед релизом](#16-чеклист-перед-релизом)
17. [Риски и ограничения](#17-риски-и-ограничения)

---

## 1. Общая архитектура

```
┌─────────────────────────────────────────┐
│           Wishify iOS App               │
│                                         │
│  ┌─────────────┐   ┌─────────────────┐  │
│  │  Navigation │   │  Zustand Store  │  │
│  │  (Stack +   │   │  (auth, guest,  │  │
│  │   Tabs)     │   │   ui state)     │  │
│  └─────────────┘   └─────────────────┘  │
│                                         │
│  ┌─────────────────────────────────────┐ │
│  │  TanStack Query (server state)      │ │
│  │  Optimistic updates, cache          │ │
│  └─────────────────────────────────────┘ │
│                                         │
│  ┌─────────────┐   ┌─────────────────┐  │
│  │  Axios +    │   │  WebSocket      │  │
│  │  Interceptors│  │  (native WS)    │  │
│  └─────────────┘   └─────────────────┘  │
│                                         │
│  ┌─────────────────────────────────────┐ │
│  │  Keychain (tokens) + MMKV (prefs)  │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
              ↕ HTTPS / WSS
┌─────────────────────────────────────────┐
│  FastAPI Backend (Railway) — без изм.   │
│  PostgreSQL 16 + Redis 7                │
└─────────────────────────────────────────┘
```

### Ключевые принципы

| Принцип | Решение |
|---------|---------|
| Безопасное хранение токенов | `react-native-keychain` (iOS Keychain / Secure Enclave) |
| Server state | TanStack Query — кэш, rефетч, optimistic |
| Client state | Zustand — auth, guest, ui-флаги |
| Cookie недоступны в mobile | Refresh token хранится в Keychain, не cookie |
| Real-time | Нативный `WebSocket` API + переподключение |
| Offline UX | Stale-while-revalidate от Query + offline banner |

---

## 2. Стек технологий

### Ядро

| Библиотека | Версия | Назначение |
|-----------|--------|-----------|
| react-native | 0.74.x | Core framework |
| typescript | 5.4.x | Язык |
| react | 18.2.x | UI runtime |
| @react-navigation/native | 6.x | Навигация |
| @react-navigation/native-stack | 6.x | Stack navigator |
| @react-navigation/bottom-tabs | 6.x | Tab navigator |

### Data & State

| Библиотека | Версия | Назначение |
|-----------|--------|-----------|
| @tanstack/react-query | 5.x | Server state, кэш |
| zustand | 4.x | Client state |
| axios | 1.x | HTTP клиент |
| axios-cookiejar-support | 4.x | Cookie jar для refresh |
| tough-cookie | 4.x | Cookie store |

### Хранилище

| Библиотека | Версия | Назначение |
|-----------|--------|-----------|
| react-native-keychain | 8.x | Токены (Keychain / Secure Enclave) |
| react-native-mmkv | 2.x | Прочие настройки, guest token |

### UI

| Библиотека | Версия | Назначение |
|-----------|--------|-----------|
| react-native-reanimated | 3.x | Анимации (60fps) |
| react-native-gesture-handler | 2.x | Жесты |
| react-native-fast-image | 8.x | Кэшированные изображения |
| @shopify/flash-list | 1.x | Перформантные списки |
| react-native-draggable-flatlist | 4.x | Drag-and-drop реордер |
| react-native-vector-icons | 10.x | Иконки (Feather) |
| react-native-safe-area-context | 4.x | Safe area |
| react-native-linear-gradient | 2.x | Градиенты |
| react-native-skeleton-placeholder | 5.x | Skeleton loading |

### Формы и валидация

| Библиотека | Версия | Назначение |
|-----------|--------|-----------|
| react-hook-form | 7.x | Управление формами |
| zod | 3.x | Схемы валидации |
| @hookform/resolvers | 3.x | Связка RHF + Zod |

### OAuth / Браузер

| Библиотека | Версия | Назначение |
|-----------|--------|-----------|
| react-native-inappbrowser-reborn | 3.x | Google OAuth (SFSafariViewController) |

### Тестирование

| Библиотека | Версия | Назначение |
|-----------|--------|-----------|
| jest | 29.x | Test runner |
| @testing-library/react-native | 12.x | Component tests |
| @testing-library/jest-native | 5.x | Custom matchers |
| msw | 2.x | API мокирование |
| detox | 20.x | E2E тесты |

---

## 3. Структура папок

```
WishifyMobile/
├── ios/                        # Native iOS project (Xcode)
│   ├── WishifyMobile/
│   │   ├── AppDelegate.mm
│   │   ├── Info.plist          # Deep links, permissions
│   │   └── GoogleService-Info.plist  # (если будет Firebase)
│   └── Podfile
│
├── android/                    # (Заготовка, не в скоупе MVP)
│
├── src/
│   ├── api/
│   │   ├── client.ts           # Axios instance + interceptors
│   │   ├── auth.ts             # Auth endpoints
│   │   ├── lists.ts            # Lists endpoints
│   │   ├── items.ts            # Items endpoints
│   │   ├── reservations.ts     # Reservation endpoints
│   │   ├── contributions.ts    # Contributions endpoints
│   │   └── scrape.ts           # URL scrape endpoint
│   │
│   ├── navigation/
│   │   ├── RootNavigator.tsx   # Корневой навигатор (Auth vs App)
│   │   ├── AuthNavigator.tsx   # Stack: Login, Register
│   │   ├── AppNavigator.tsx    # Tab navigator (Dashboard, Profile)
│   │   ├── ListsStackNavigator.tsx  # Stack внутри Dashboard tab
│   │   └── types.ts            # RootStackParamList и т.д.
│   │
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   └── OAuthCallbackScreen.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardScreen.tsx
│   │   ├── list/
│   │   │   ├── ListDetailScreen.tsx  # Owner view
│   │   │   ├── ListSettingsScreen.tsx
│   │   │   ├── AddItemScreen.tsx
│   │   │   └── EditItemScreen.tsx
│   │   ├── public/
│   │   │   └── PublicListScreen.tsx  # Viewer view (deep link)
│   │   └── profile/
│   │       └── ProfileScreen.tsx
│   │
│   ├── components/
│   │   ├── ui/                 # Атомы: Button, Input, Card, Badge, etc.
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── BottomSheet.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── OfflineBanner.tsx
│   │   ├── lists/
│   │   │   ├── ListCard.tsx
│   │   │   ├── ListGrid.tsx
│   │   │   └── CreateListModal.tsx
│   │   ├── items/
│   │   │   ├── ItemCard.tsx         # Карточка в owner view
│   │   │   ├── PublicItemCard.tsx   # Карточка в public view
│   │   │   ├── DraggableItemList.tsx
│   │   │   ├── ReserveButton.tsx
│   │   │   ├── ContributeModal.tsx
│   │   │   └── FundingProgress.tsx
│   │   └── shared/
│   │       ├── GuestBanner.tsx
│   │       └── AuthGuard.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts          # Auth state от Zustand + helpers
│   │   ├── useGuestSession.ts  # Guest MMKV store + API
│   │   ├── useListWebSocket.ts # WS подключение + events
│   │   ├── useUrlScrape.ts     # URL metadata scraping
│   │   ├── useNetInfo.ts       # @react-native-community/netinfo
│   │   └── useAppState.ts      # AppState для WS reconnect
│   │
│   ├── store/
│   │   ├── authStore.ts        # Zustand: accessToken, user, status
│   │   └── uiStore.ts          # Zustand: modals, toasts
│   │
│   ├── services/
│   │   ├── tokenService.ts     # Keychain read/write/delete
│   │   ├── guestService.ts     # MMKV guest token
│   │   └── wsManager.ts        # WebSocket singleton manager
│   │
│   ├── types/
│   │   ├── api.ts              # Response/Request types (из backend schemas)
│   │   └── navigation.ts       # Navigation param types
│   │
│   ├── utils/
│   │   ├── formatters.ts       # Цены, даты, строки
│   │   ├── validators.ts       # Zod схемы для форм
│   │   └── deepLink.ts         # URL парсинг для deep links
│   │
│   ├── constants/
│   │   ├── api.ts              # BASE_URL, WS_URL
│   │   ├── colors.ts           # Color palette
│   │   └── layout.ts           # Spacing, borderRadius
│   │
│   └── App.tsx                 # Root: Providers + RootNavigator
│
├── __tests__/                  # Unit / Integration тесты
├── e2e/                        # Detox E2E тесты
├── .env                        # API_URL, WS_URL (через react-native-config)
├── babel.config.js
├── tsconfig.json
├── jest.config.js
└── package.json
```

---

## 4. Bootstrapping: инициализация проекта

### 4.1. Создание проекта

```bash
# Node 20+, Ruby 3.2+, Xcode 15+, CocoaPods 1.14+
npx @react-native-community/cli@latest init WishifyMobile \
  --template react-native-template-typescript \
  --version 0.74.5
cd WishifyMobile
```

### 4.2. Установка зависимостей

```bash
# Navigation
npm install @react-navigation/native @react-navigation/native-stack \
  @react-navigation/bottom-tabs react-native-screens \
  react-native-safe-area-context

# Data
npm install @tanstack/react-query zustand axios \
  axios-cookiejar-support tough-cookie

# Storage
npm install react-native-keychain react-native-mmkv

# UI
npm install react-native-reanimated react-native-gesture-handler \
  react-native-fast-image @shopify/flash-list \
  react-native-draggable-flatlist react-native-vector-icons \
  react-native-linear-gradient react-native-skeleton-placeholder

# Forms
npm install react-hook-form zod @hookform/resolvers

# OAuth
npm install react-native-inappbrowser-reborn

# Network
npm install @react-native-community/netinfo

# Config
npm install react-native-config

# Dev / Testing
npm install -D @testing-library/react-native @testing-library/jest-native \
  msw detox jest-circus @types/react-native
```

### 4.3. Pod install

```bash
cd ios && pod install && cd ..
```

### 4.4. .env файл

```env
# .env (в корне WishifyMobile/)
API_BASE_URL=https://test-task-production-4fd4.up.railway.app/api/v1
WS_BASE_URL=wss://test-task-production-4fd4.up.railway.app/api/v1
```

> Для локальной разработки создай `.env.local` с `http://localhost:8000/api/v1`

### 4.5. babel.config.js

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    'react-native-reanimated/plugin', // ДОЛЖЕН БЫТЬ ПОСЛЕДНИМ
    ['module:react-native-config'],
  ],
};
```

### 4.6. tsconfig.json

```json
{
  "extends": "@react-native/typescript-config/tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "strict": true
  }
}
```

---

## 5. Навигация

### 5.1. Типы параметров

```ts
// src/types/navigation.ts
import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  OAuthCallback: { access_token: string };
};

export type ListsStackParamList = {
  Dashboard: undefined;
  ListDetail: { listId: string; title: string };
  ListSettings: { listId: string };
  AddItem: { listId: string };
  EditItem: { listId: string; itemId: string };
};

export type AppTabParamList = {
  ListsStack: NavigatorScreenParams<ListsStackParamList>;
  Profile: undefined;
};

export type PublicStackParamList = {
  PublicList: { slug: string };
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppTabParamList>;
  Public: NavigatorScreenParams<PublicStackParamList>;
};
```

### 5.2. Структура навигаторов

```
RootNavigator
├── (if NOT authenticated) AuthNavigator (Stack)
│   ├── LoginScreen
│   └── RegisterScreen
│
├── (if authenticated) AppNavigator (Bottom Tabs)
│   ├── Tab: ListsStack (Stack)
│   │   ├── DashboardScreen
│   │   ├── ListDetailScreen
│   │   ├── ListSettingsScreen
│   │   ├── AddItemScreen
│   │   └── EditItemScreen
│   └── Tab: ProfileScreen
│
└── PublicStack (Modal/Stack — доступен без авторизации)
    └── PublicListScreen
```

### 5.3. RootNavigator

```tsx
// src/navigation/RootNavigator.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { PublicListScreen } from '@/screens/public/PublicListScreen';
import { linking } from './linking';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { status } = useAuthStore();

  if (status === 'loading') return <SplashScreen />;

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {status === 'authenticated' ? (
          <Stack.Screen name="App" component={AppNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
        {/* Публичный экран доступен всегда */}
        <Stack.Screen
          name="PublicList"
          component={PublicListScreen}
          options={{ presentation: 'modal', headerShown: true, title: 'Список желаний' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

---

## 6. Аутентификация и сессии

### 6.1. Архитектура токенов (mobile-специфика)

**Проблема:** Бэкенд хранит refresh token в `httpOnly` cookie. На мобильных `axios` по умолчанию не персистирует cookies между сессиями.

**Решение:** Использовать `axios-cookiejar-support` + `tough-cookie` — cookies будут автоматически отправляться с запросами к `/auth/refresh`. Jar хранится в памяти (сессионный), при перезапуске приложения — refresh через `/auth/refresh` невозможен. Поэтому **access token** храним в Keychain (долгосрочно).

**Обновлённая схема для mobile:**

```
┌─────────────────────────────────────────────────────┐
│  Login/Register → получаем:                          │
│    - access_token (в теле ответа)                    │
│    - refresh_token (в Set-Cookie httpOnly)           │
│                                                      │
│  Сохраняем:                                          │
│    - access_token → Keychain (ios kSecAttrAccessible │
│       kSecAttrAccessibleAfterFirstUnlock)            │
│    - refresh_token cookie → axios tough-cookie jar   │
│      (in-memory, до перезапуска)                     │
│                                                      │
│  При 401 → POST /auth/refresh (cookie отправляется   │
│    автоматически через jar) → новый access_token     │
│    → обновляем Keychain                              │
│                                                      │
│  При холодном старте → читаем access_token из        │
│    Keychain → проверяем expiry → если истёк, то:     │
│    POST /auth/refresh (jar пуст!) → 401 → logout    │
└─────────────────────────────────────────────────────┘
```

> **Важно:** На холодном старте refresh cookie не будет (in-memory). Если access token просрочен и refresh нет — пользователь видит логин-форму. Это осознанный trade-off между безопасностью и UX. Альтернатива: просить бэкенд дополнительно возвращать `refresh_token` в теле ответа для мобильных клиентов (заголовок `X-Client: mobile`).

### 6.2. tokenService

```ts
// src/services/tokenService.ts
import * as Keychain from 'react-native-keychain';

const SERVICE = 'com.wishify.auth';

export const tokenService = {
  async saveAccessToken(token: string): Promise<void> {
    await Keychain.setGenericPassword('access_token', token, {
      service: SERVICE,
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
    });
  },

  async getAccessToken(): Promise<string | null> {
    const creds = await Keychain.getGenericPassword({ service: SERVICE });
    return creds ? creds.password : null;
  },

  async clearTokens(): Promise<void> {
    await Keychain.resetGenericPassword({ service: SERVICE });
  },
};
```

### 6.3. guestService

```ts
// src/services/guestService.ts
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'guest-store' });
const GUEST_TOKEN_KEY = 'guest_token';
const GUEST_NAME_KEY = 'guest_display_name';

export const guestService = {
  saveSession(token: string, displayName: string): void {
    storage.set(GUEST_TOKEN_KEY, token);
    storage.set(GUEST_NAME_KEY, displayName);
  },

  getToken(): string | undefined {
    return storage.getString(GUEST_TOKEN_KEY);
  },

  getDisplayName(): string | undefined {
    return storage.getString(GUEST_NAME_KEY);
  },

  clearSession(): void {
    storage.delete(GUEST_TOKEN_KEY);
    storage.delete(GUEST_NAME_KEY);
  },
};
```

### 6.4. Axios Client с interceptors

```ts
// src/api/client.ts
import axios, { AxiosError } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import Config from 'react-native-config';
import { tokenService } from '@/services/tokenService';
import { guestService } from '@/services/guestService';
import { useAuthStore } from '@/store/authStore';

const jar = new CookieJar();

export const apiClient = wrapper(
  axios.create({
    baseURL: Config.API_BASE_URL,
    timeout: 15_000,
    jar,
    withCredentials: true,
  })
);

// REQUEST: attach tokens
apiClient.interceptors.request.use(async (config) => {
  const token = await tokenService.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const guestToken = guestService.getToken();
  if (guestToken) {
    config.headers['X-Guest-Token'] = guestToken;
  }

  return config;
});

// RESPONSE: 401 → refresh → retry
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            originalRequest.headers!.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const { data } = await apiClient.post<{ access_token: string }>('/auth/refresh');
        const newToken = data.access_token;

        await tokenService.saveAccessToken(newToken);
        useAuthStore.getState().setAccessToken(newToken);

        refreshQueue.forEach((cb) => cb(newToken));
        refreshQueue = [];

        originalRequest.headers!.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

### 6.5. Zustand Auth Store

```ts
// src/store/authStore.ts
import { create } from 'zustand';
import { tokenService } from '@/services/tokenService';
import type { User } from '@/types/api';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, token: string) => Promise<void>;
  setAccessToken: (token: string) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  accessToken: null,

  initialize: async () => {
    const token = await tokenService.getAccessToken();
    if (!token) {
      set({ status: 'unauthenticated' });
      return;
    }
    // Токен есть — пробуем получить /auth/me
    // (apiClient уже вставит токен через interceptor)
    try {
      const { apiClient } = await import('@/api/client');
      const { data } = await apiClient.get<User>('/auth/me');
      set({ status: 'authenticated', user: data, accessToken: token });
    } catch {
      // Токен просрочен, refresh недоступен (in-memory cookie пуст)
      await tokenService.clearTokens();
      set({ status: 'unauthenticated' });
    }
  },

  setAuth: async (user, token) => {
    await tokenService.saveAccessToken(token);
    set({ status: 'authenticated', user, accessToken: token });
  },

  setAccessToken: (token) => {
    set({ accessToken: token });
    tokenService.saveAccessToken(token);
  },

  logout: async () => {
    await tokenService.clearTokens();
    try {
      const { apiClient } = await import('@/api/client');
      await apiClient.post('/auth/logout');
    } catch {
      // Игнорируем ошибку logout (уже разлогинены локально)
    }
    set({ status: 'unauthenticated', user: null, accessToken: null });
  },
}));
```

### 6.6. Google OAuth (SFSafariViewController)

```ts
// src/api/auth.ts (фрагмент)
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { Linking } from 'react-native';
import Config from 'react-native-config';

export async function startGoogleOAuth(): Promise<string | null> {
  const oauthUrl = `${Config.API_BASE_URL}/auth/google`;
  const redirectScheme = 'wishify://oauth/callback';

  if (await InAppBrowser.isAvailable()) {
    const result = await InAppBrowser.openAuth(oauthUrl, redirectScheme, {
      ephemeralWebSession: false,
      showTitle: false,
      enableUrlBarHiding: true,
    });

    if (result.type === 'success' && result.url) {
      const url = new URL(result.url);
      return url.searchParams.get('access_token');
    }
  }
  return null;
}
```

> **Info.plist** нужен URL scheme:
> ```xml
> <key>CFBundleURLTypes</key>
> <array>
>   <dict>
>     <key>CFBundleURLSchemes</key>
>     <array><string>wishify</string></array>
>   </dict>
> </array>
> ```

> **Backend:** В Google Cloud Console добавить `wishify://oauth/callback` как authorized redirect URI. В бэкенде — обработка этого redirect URI.

---

## 7. API-слой

### 7.1. Типы (из бэкенд схем)

```ts
// src/types/api.ts
export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
}

export interface WishList {
  id: string;
  title: string;
  description: string | null;
  occasion: 'birthday' | 'new_year' | 'wedding' | 'other' | null;
  occasion_date: string | null;
  public_slug: string;
  is_active: boolean;
  created_at: string;
  item_count: number;
}

export interface Item {
  id: string;
  list_id: string;
  name: string;
  description: string | null;
  url: string | null;
  image_url: string | null;
  price: number | null;
  currency: string;
  is_group_fund: boolean;
  target_amount: number | null;
  position: number;
  is_reserved: boolean;
  reserved_by_me: boolean;
  reserver_name: string | null;
  total_contributed: number | null;
  my_contribution_id: string | null;
}

export interface PublicItem extends Item {
  contributions_summary?: {
    total_contributed: number;
    contributors_count: number;
    target_amount: number | null;
  };
}

export interface Contribution {
  id: string;
  amount: number;
  note: string | null;
  contributor_display_name: string;
  contributed_at: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface GuestSessionResponse {
  guest_token: string;
  display_name: string;
}

export interface ScrapeResult {
  title: string | null;
  image_url: string | null;
  price: number | null;
  currency: string | null;
}

export type WsEvent =
  | { type: 'item.created'; data: Item }
  | { type: 'item.updated'; data: Item }
  | { type: 'item.deleted'; data: { item_id: string } }
  | { type: 'item.reordered'; data: { items: Item[] } }
  | { type: 'reservation.changed'; data: { item_id: string; is_reserved: boolean; reserver_name: string | null } }
  | { type: 'contribution.added'; data: { item_id: string; total_contributed: number } }
  | { type: 'contribution.removed'; data: { item_id: string; total_contributed: number } }
  | { type: 'list.updated'; data: Partial<WishList> };
```

### 7.2. API модули

```ts
// src/api/lists.ts
import { apiClient } from './client';
import type { WishList, Item, PublicItem } from '@/types/api';

export const listsApi = {
  getMyLists: () =>
    apiClient.get<WishList[]>('/lists').then((r) => r.data),

  createList: (data: { title: string; description?: string; occasion?: string; occasion_date?: string }) =>
    apiClient.post<WishList>('/lists', data).then((r) => r.data),

  getList: (listId: string) =>
    apiClient.get<WishList & { items: Item[] }>(`/lists/${listId}`).then((r) => r.data),

  updateList: (listId: string, data: Partial<WishList>) =>
    apiClient.patch<WishList>(`/lists/${listId}`, data).then((r) => r.data),

  deleteList: (listId: string) =>
    apiClient.delete(`/lists/${listId}`),

  getPublicList: (slug: string) =>
    apiClient.get<WishList & { items: PublicItem[] }>(`/lists/public/${slug}`).then((r) => r.data),
};

// src/api/items.ts
export const itemsApi = {
  createItem: (listId: string, data: Partial<Item>) =>
    apiClient.post<Item>(`/lists/${listId}/items`, data).then((r) => r.data),

  updateItem: (listId: string, itemId: string, data: Partial<Item>) =>
    apiClient.patch<Item>(`/lists/${listId}/items/${itemId}`, data).then((r) => r.data),

  deleteItem: (listId: string, itemId: string) =>
    apiClient.delete(`/lists/${listId}/items/${itemId}`),

  reorderItems: (listId: string, itemIds: string[]) =>
    apiClient.patch(`/lists/${listId}/items/reorder`, { item_ids: itemIds }),
};

// src/api/reservations.ts
export const reservationsApi = {
  reserve: (itemId: string) =>
    apiClient.post(`/items/${itemId}/reserve`),

  release: (itemId: string) =>
    apiClient.delete(`/items/${itemId}/reserve`),
};

// src/api/contributions.ts
export const contributionsApi = {
  contribute: (itemId: string, data: { amount: number; note?: string }) =>
    apiClient.post<Contribution>(`/items/${itemId}/contributions`, data).then((r) => r.data),

  getSummary: (itemId: string) =>
    apiClient.get(`/items/${itemId}/contributions/summary`).then((r) => r.data),

  deleteContribution: (itemId: string, contributionId: string) =>
    apiClient.delete(`/items/${itemId}/contributions/${contributionId}`),
};

// src/api/scrape.ts
export const scrapeApi = {
  scrapeUrl: (url: string) =>
    apiClient.post<ScrapeResult>('/items/scrape', { url }).then((r) => r.data),
};
```

---

## 8. WebSocket (real-time)

### 8.1. wsManager

```ts
// src/services/wsManager.ts
import Config from 'react-native-config';
import type { WsEvent } from '@/types/api';

type WsListener = (event: WsEvent) => void;

class WsManager {
  private ws: WebSocket | null = null;
  private currentSlug: string | null = null;
  private listeners: Set<WsListener> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30_000;

  connect(slug: string, token?: string): void {
    this.disconnect();
    this.currentSlug = slug;

    const params = token ? `?token=${token}` : '';
    const url = `${Config.WS_BASE_URL}/ws/lists/${slug}${params}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
    };

    this.ws.onmessage = (e) => {
      try {
        const event: WsEvent = JSON.parse(e.data);
        this.listeners.forEach((fn) => fn(event));
      } catch {
        // Игнорируем некорректный JSON
      }
    };

    this.ws.onclose = (e) => {
      if (!e.wasClean) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close(1000);
    this.ws = null;
    this.currentSlug = null;
  }

  addListener(fn: WsListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private scheduleReconnect(): void {
    if (!this.currentSlug) return;
    this.reconnectTimer = setTimeout(() => {
      if (this.currentSlug) {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
        this.connect(this.currentSlug);
      }
    }, this.reconnectDelay);
  }
}

export const wsManager = new WsManager();
```

### 8.2. useListWebSocket hook

```ts
// src/hooks/useListWebSocket.ts
import { useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { wsManager } from '@/services/wsManager';
import { useAuthStore } from '@/store/authStore';
import type { WsEvent } from '@/types/api';

export function useListWebSocket(slug: string) {
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();

  const handleEvent = useCallback((event: WsEvent) => {
    switch (event.type) {
      case 'item.created':
      case 'item.updated':
      case 'item.deleted':
      case 'item.reordered':
      case 'reservation.changed':
      case 'contribution.added':
      case 'contribution.removed':
      case 'list.updated':
        // Инвалидируем кэш — Query автоматически перефетчит
        queryClient.invalidateQueries({ queryKey: ['publicList', slug] });
        queryClient.invalidateQueries({ queryKey: ['list', slug] });
        break;
    }
  }, [queryClient, slug]);

  useEffect(() => {
    wsManager.connect(slug, accessToken ?? undefined);
    const unsub = wsManager.addListener(handleEvent);

    // Переподключение при возврате из фона
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        wsManager.connect(slug, accessToken ?? undefined);
      }
    });

    return () => {
      unsub();
      appStateSub.remove();
      wsManager.disconnect();
    };
  }, [slug, accessToken, handleEvent]);
}
```

---

## 9. Экраны и фичи

### 9.1. Карта экранов

```
┌─ LoginScreen ─────────────────────────────┐
│  Email + Password form (react-hook-form)  │
│  [Войти] → /auth/login                    │
│  [Google] → startGoogleOAuth()            │
│  [Регистрация] → navigate RegisterScreen  │
└───────────────────────────────────────────┘

┌─ RegisterScreen ──────────────────────────┐
│  display_name, email, password form       │
│  [Создать аккаунт] → /auth/register       │
└───────────────────────────────────────────┘

┌─ DashboardScreen ─────────────────────────┐
│  FlashList из WishList карточек           │
│  [+ Создать список] → CreateListModal     │
│  Tap на карточку → ListDetailScreen       │
│  Swipe-to-delete → DELETE /lists/{id}     │
└───────────────────────────────────────────┘

┌─ ListDetailScreen ────────────────────────┐
│  Owner view: заголовок + DraggableList    │
│  Каждый ItemCard:                         │
│    - Название, цена, изображение           │
│    - [Редактировать] → EditItemScreen     │
│    - [Удалить] → DELETE /items/{id}       │
│  [+ Добавить желание] → AddItemScreen     │
│  [Настройки] → ListSettingsScreen        │
│  [Поделиться] → Share public link         │
└───────────────────────────────────────────┘

┌─ AddItemScreen / EditItemScreen ──────────┐
│  Поля: name, description, url, price,    │
│    image_url, is_group_fund, target_amount│
│  URL-поле: при вставке → scrapeUrl()     │
│    автозаполняет name, image, price       │
│  Загрузка изображения (опционально MVP+) │
└───────────────────────────────────────────┘

┌─ PublicListScreen ────────────────────────┐
│  Viewer/Guest view:                       │
│  - GuestBanner (если не авторизован)     │
│  - Список PublicItemCard:                │
│    • Зарезервировано? Badge + кем        │
│    • [Зарезервировать] / [Освободить]    │
│    • Group fund → FundingProgress bar    │
│    • [Участвовать] → ContributeModal     │
│  Real-time: useListWebSocket(slug)        │
└───────────────────────────────────────────┘

┌─ ListSettingsScreen ──────────────────────┐
│  title, description, occasion, date       │
│  [Сохранить] → PATCH /lists/{id}         │
│  [Удалить список] (danger zone)          │
└───────────────────────────────────────────┘

┌─ ProfileScreen ───────────────────────────┐
│  Avatar (FastImage), display_name        │
│  [Изменить имя] → PATCH /auth/me         │
│  [Выйти] → authStore.logout()            │
└───────────────────────────────────────────┘
```

### 9.2. Ключевые UX-детали

**Drag-and-drop реордер (ListDetailScreen):**
- `react-native-draggable-flatlist` для визуала
- `onDragEnd` → optimistic update в Query cache
- Дебаунс 500ms → `PATCH /lists/{id}/items/reorder`

**URL-скрапинг (AddItemScreen):**
- При изменении поля `url` (onChangeText, debounce 800ms)
- Показываем `ActivityIndicator` рядом с полем
- `POST /items/scrape { url }` → заполняем name, image, price
- Пользователь может переписать авто-заполненные поля

**Share списка:**
- `Share.share({ url: 'https://wishify.app/l/{slug}' })` (или схему deep link)
- Deep link откроет PublicListScreen у получателя

**Guest Banner:**
- Если `guestService.getToken()` === undefined → показываем Modal
- Пользователь вводит имя → `POST /auth/guest { display_name }`
- Сохраняем token через `guestService.saveSession()`

**Funding progress:**
- `ProgressBar` компонент: `filled / target * 100%`
- Если `target_amount === null` → показываем только сумму
- ContributeModal: сумма + заметка → `POST /items/{id}/contributions`

---

## 10. UI / компоненты

### 10.1. Цветовая система

```ts
// src/constants/colors.ts
export const colors = {
  primary: '#6C63FF',    // Фиолетовый (основной бренд)
  primaryLight: '#EEF0FF',
  secondary: '#FF6584',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  border: '#E9ECEF',
  textPrimary: '#212529',
  textSecondary: '#6C757D',
  textDisabled: '#ADB5BD',
  overlay: 'rgba(0, 0, 0, 0.5)',
};
```

### 10.2. Spacing

```ts
// src/constants/layout.ts
export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};
export const borderRadius = {
  sm: 4, md: 8, lg: 12, xl: 16, full: 9999,
};
```

### 10.3. Button компонент (пример атома)

```tsx
// src/components/ui/Button.tsx
import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle
} from 'react-native';
import { colors, spacing, borderRadius } from '@/constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title, onPress, variant = 'primary',
  size = 'md', loading, disabled, style
}: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.base, styles[variant], styles[`size_${size}`], style,
        (disabled || loading) && styles.disabled]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? colors.primary : '#fff'} />
      ) : (
        <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`]]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.lg },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.secondary },
  danger: { backgroundColor: colors.error },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  disabled: { opacity: 0.5 },
  size_sm: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, minHeight: 36 },
  size_md: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, minHeight: 48 },
  size_lg: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, minHeight: 56 },
  text: { fontWeight: '600' },
  text_primary: { color: '#fff' },
  text_secondary: { color: '#fff' },
  text_danger: { color: '#fff' },
  text_ghost: { color: colors.primary },
  textSize_sm: { fontSize: 13 },
  textSize_md: { fontSize: 15 },
  textSize_lg: { fontSize: 17 },
});
```

### 10.4. Принципы дизайна

- **Нативный feel:** `TouchableOpacity` / `Pressable`, haptic feedback (`react-native-haptic-feedback`)
- **Safe area:** все экраны оборачивать в `<SafeAreaView>`
- **Loading states:** Skeleton placeholders вместо spinner'ов на экранах
- **Empty states:** EmptyState компонент с иллюстрацией и CTA
- **Error states:** Toast через `uiStore` + retry кнопка

---

## 11. State Management

### 11.1. Server state — TanStack Query

```ts
// Примеры query keys
['myLists']                      // GET /lists
['list', listId]                 // GET /lists/{id}
['publicList', slug]             // GET /lists/public/{slug}
['contributionSummary', itemId]  // GET /items/{id}/contributions/summary
```

**Мутации с optimistic updates:**

```ts
// Пример: резервирование (optimistic)
const mutation = useMutation({
  mutationFn: () => reservationsApi.reserve(itemId),
  onMutate: async () => {
    await queryClient.cancelQueries({ queryKey: ['publicList', slug] });
    const previous = queryClient.getQueryData(['publicList', slug]);

    queryClient.setQueryData(['publicList', slug], (old: any) => ({
      ...old,
      items: old.items.map((item: Item) =>
        item.id === itemId
          ? { ...item, is_reserved: true, reserved_by_me: true }
          : item
      ),
    }));

    return { previous };
  },
  onError: (_err, _vars, ctx) => {
    queryClient.setQueryData(['publicList', slug], ctx?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['publicList', slug] });
  },
});
```

### 11.2. Client state — Zustand

Только то, что не является server state:
- `authStore`: статус авторизации, user, token
- `uiStore`: модальные окна, toast-сообщения

---

## 12. Deep Linking

### 12.1. Схема

```
wishify://list/{slug}   →  PublicListScreen
wishify://oauth/callback?access_token=...  →  OAuthCallbackScreen
```

### 12.2. Universal Links (рекомендуется для App Store)

```
https://wishify.app/l/{slug}  →  открывает приложение → PublicListScreen
```

Требует: `apple-app-site-association` файл на домене.

### 12.3. Конфигурация навигации

```ts
// src/navigation/linking.ts
import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from '@/types/navigation';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['wishify://', 'https://wishify.app'],
  config: {
    screens: {
      PublicList: {
        path: 'l/:slug',
        parse: { slug: (slug: string) => slug },
      },
      Auth: {
        screens: {
          OAuthCallback: 'oauth/callback',
        },
      },
    },
  },
};
```

---

## 13. Push-уведомления (MVP+)

> Не в скоупе первого релиза. Описание для планирования.

**Сценарии:**
- Кто-то зарезервировал товар из твоего списка → уведомление владельцу
- Кто-то внёс вклад в группа-покупку → уведомление владельцу

**Стек:**
- `react-native-push-notification` или Firebase Cloud Messaging (`@react-native-firebase/messaging`)
- Бэкенд: добавить `device_token` к пользователю, отправлять после событий

---

## 14. Тестирование

### 14.1. Unit тесты

```bash
jest --testPathPattern="src/__tests__"
```

**Приоритет:**
1. `tokenService` — Keychain read/write/clear
2. `authStore` — initialize, setAuth, logout
3. `apiClient` — interceptors (401 → refresh → retry)
4. Utility functions: `formatters.ts`, `validators.ts`

**Пример теста interceptor:**

```ts
// __tests__/api/client.test.ts
import { apiClient } from '@/api/client';
import { server } from '../mocks/server'; // MSW server
import { rest } from 'msw';

it('refreshes token on 401 and retries', async () => {
  let callCount = 0;

  server.use(
    rest.get('/lists', (req, res, ctx) => {
      callCount++;
      if (callCount === 1) return res(ctx.status(401));
      return res(ctx.json([]));
    }),
    rest.post('/auth/refresh', (_req, res, ctx) =>
      res(ctx.json({ access_token: 'new-token' }))
    )
  );

  const result = await apiClient.get('/lists');
  expect(result.data).toEqual([]);
  expect(callCount).toBe(2);
});
```

### 14.2. Component тесты

```ts
// __tests__/components/Button.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components/ui/Button';

it('calls onPress and shows loading', () => {
  const onPress = jest.fn();
  const { getByText, rerender } = render(<Button title="Test" onPress={onPress} />);
  fireEvent.press(getByText('Test'));
  expect(onPress).toHaveBeenCalledTimes(1);

  rerender(<Button title="Test" onPress={onPress} loading />);
  expect(() => getByText('Test')).toThrow(); // ActivityIndicator вместо текста
});
```

### 14.3. E2E с Detox

```bash
# Сборка
detox build -c ios.sim.debug

# Запуск
detox test -c ios.sim.debug
```

**Критичные E2E сценарии:**
1. Регистрация → создание списка → добавление айтема
2. Открытие public ссылки → гостевая сессия → резервирование
3. Logout → вернуться в приложение → экран логина

---

## 15. CI/CD и деплой в App Store

### 15.1. GitHub Actions pipeline

```yaml
# .github/workflows/ios.yml
name: iOS CI

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx jest --ci --coverage

  build:
    needs: test
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - uses: ruby/setup-ruby@v1
        with: { ruby-version: '3.2', bundler-cache: true }
      - run: npm ci
      - run: cd ios && pod install
      - name: Build & Upload to TestFlight
        env:
          APP_STORE_CONNECT_API_KEY: ${{ secrets.APP_STORE_CONNECT_API_KEY }}
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
        run: bundle exec fastlane beta
```

### 15.2. Fastlane

```ruby
# ios/fastlane/Fastfile
lane :beta do
  match(type: 'appstore')
  build_app(
    workspace: 'WishifyMobile.xcworkspace',
    scheme: 'WishifyMobile',
    export_method: 'app-store'
  )
  upload_to_testflight
end
```

### 15.3. App Store требования

- **Bundle ID:** `com.wishify.mobile`
- **Privacy manifest:** объяснить использование Keychain, сети
- **NSPhotoLibraryUsageDescription** (если добавить загрузку изображений)
- **NSCameraUsageDescription** (опционально)
- **App Transport Security:** разрешить Railway домен (HTTPS — без проблем)

---

## 16. Чеклист перед релизом

### Безопасность
- [ ] Токены только в Keychain, не AsyncStorage
- [ ] Нет секретов в коде (API keys, etc.)
- [ ] SSL pinning для API домена (опционально для MVP)
- [ ] Deep link валидация (не открывать произвольные URL)
- [ ] Guest token в MMKV с шифрованием

### Функциональность
- [ ] Login / Register / Google OAuth
- [ ] Dashboard: список, создание, удаление списков
- [ ] ListDetail: CRUD айтемов, drag-and-drop реордер
- [ ] Share: копирование/шеринг public ссылки
- [ ] PublicList: просмотр, резервирование, группа-покупка
- [ ] Guest сессия
- [ ] URL-скрапинг в AddItemScreen
- [ ] WebSocket real-time обновления
- [ ] Offline banner

### UX / Polish
- [ ] Skeleton loading на всех экранах
- [ ] Empty states
- [ ] Pull-to-refresh на Dashboard и ListDetail
- [ ] Haptic feedback на ключевых действиях
- [ ] Анимации переходов (react-native-reanimated)
- [ ] Dark mode (опционально)

### Инфраструктура
- [ ] `.env` → production URL'ы
- [ ] Подписывание (Fastlane + match)
- [ ] TestFlight бета-тест
- [ ] Privacy policy URL (обязателен для App Store)

---

## 17. Риски и ограничения

| Риск | Серьёзность | Митигация |
|------|------------|-----------|
| Refresh token через cookie недоступен при холодном старте | Высокая | Пользователь re-логинится. Альтернатива: бэкенд возвращает refresh в body для `X-Client: mobile` |
| WebSocket разрывается в фоне (iOS URLSession) | Средняя | AppState listener + reconnect при активации |
| Google OAuth в inappbrowser требует redirect scheme | Средняя | Настроить `wishify://` в Info.plist и Google Console |
| Drag-and-drop на медленных устройствах | Низкая | FlashList + Reanimated worklets — 60fps |
| Нет offline поддержки для мутаций | Средняя | `@tanstack/react-query` + `react-native-netinfo` — показываем баннер и блокируем мутации |
| App Store review: privacy policy обязателен | Высокая | Создать страницу privacy policy до сабмита |
| Keychain на симуляторе ведёт себя иначе | Низкая | Тестировать на реальном устройстве перед релизом |
