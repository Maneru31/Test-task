# Wishify iOS — План реализации

> Сессия планирования: 2026-03-19
> Входные документы: `TZ_WISHIFY_iOS.md`, `ADR.md`, `MOBILE_APP_GUIDE.md`

---

## Текущее состояние (Этап 5 — ✅ ВЫПОЛНЕН 2026-03-20)

### Готово
| Слой | Артефакты |
|------|-----------|
| API | `src/api/client.ts`, `auth.ts`, `lists.ts`, `items.ts`, `contributions.ts`, `reservations.ts`, `scrape.ts` |
| Навигация | `RootNavigator`, `AppNavigator`, `AuthNavigator` (реальные экраны), `ListsStackNavigator`, `linking.ts` |
| Store | `authStore.ts`, `uiStore.ts` |
| Services | `tokenService.ts`, `guestService.ts`, `wsManager.ts` |
| Типы и константы | `types/api.ts`, `types/navigation.ts`, `constants/` |
| Конфигурация | `tsconfig.json`, `babel.config.js`, `jest.config.js` |
| Утилиты | `src/utils/validators.ts` (Zod: loginSchema, registerSchema, createListSchema, itemSchema) |
| Утилиты | `src/utils/formatters.ts` (formatPrice, formatDate, formatRelativeDate) |
| Компоненты | `src/components/common/Button.tsx` (primary/secondary/danger, loading, 44pt) |
| Компоненты | `src/components/common/FormInput.tsx` (react-hook-form Controller + inline error) |
| Компоненты | `src/components/common/Toast.tsx` (success/error/info, анимация, поверх всего) |
| Экраны | `src/screens/auth/SplashScreen.tsx` (логотип + initialize → RootNavigator переключает) |
| Экраны | `src/screens/auth/LoginScreen.tsx` (email/password + Google OAuth + ссылка на Register) |
| Экраны | `src/screens/auth/RegisterScreen.tsx` (display_name + email + password + ссылка на Login) |
| Тесты | `__tests__/services/tokenService.test.ts` (save/get/clear, Keychain mock) |
| Тесты | `__tests__/services/guestService.test.ts` (save/get/clear, MMKV mock) |
| Тесты | `__tests__/store/authStore.test.ts` (initialize, setAuth, logout; все переходы статусов) |
| Тесты | `__tests__/api/client.test.ts` (interceptor 401→refresh→retry, race condition) |
| Тесты | `__tests__/utils/validators.test.ts` (валидные/невалидные данные для всех схем) |
| Тесты | `__tests__/utils/formatters.test.ts` (цены, даты, относительные даты) |

### Исправленные дефекты
- `package.json` jest config: `"setupFilesAfterFramework"` → `"setupFilesAfterEachTest"` ✅

### Реализовано в Этапе 2 (2026-03-20)
| Слой | Артефакты |
|------|-----------|
| Hooks | `src/hooks/useLists.ts`, `useItems.ts`, `useScrape.ts` |
| Компоненты (common) | `SkeletonCard.tsx`, `EmptyState.tsx`, `BottomSheet.tsx` |
| Компоненты (lists) | `ListCard.tsx`, `ItemCard.tsx`, `CreateListBottomSheet.tsx` |
| Экраны | `DashboardScreen`, `ListDetailScreen`, `AddItemScreen`, `EditItemScreen`, `ListSettingsScreen`, `ProfileScreen` |
| Навигация | `ListsStackNavigator`, `AppNavigator` — реальные экраны |
| Тесты | `__tests__/components/Button.test.tsx` |
| Конфигурация | `package.json` + `@react-native-community/datetimepicker`; `tsconfig.json` — явные jsx/lib |

### Реализовано в Этапе 3 (2026-03-20)
| Слой | Артефакты |
|------|-----------|
| Hooks | `src/hooks/usePublicList.ts`, `useReservations.ts`, `useContributions.ts` |
| Компоненты (public) | `FundingProgress.tsx`, `ReserveButton.tsx`, `GuestBanner.tsx`, `GuestNameBottomSheet.tsx`, `ContributeBottomSheet.tsx`, `ItemPublicCard.tsx` |
| Экраны | `src/screens/public/PublicListScreen.tsx` |
| Навигация | `RootNavigator.tsx` — подключён реальный `PublicListScreen` (INV-06) |
| Тесты | `__tests__/components/FundingProgress.test.tsx`, `ReserveButton.test.tsx`, `GuestBanner.test.tsx` |

### Реализовано в Этапе 4 (2026-03-20)
| Слой | Артефакты |
|------|-----------|
| Store | `uiStore.ts` — добавлены `isOffline: boolean`, `setIsOffline()` |
| Hooks | `src/hooks/useNetworkStatus.ts` — NetInfo → uiStore.setIsOffline |
| Hooks | `src/hooks/useListWebSocket.ts` — WS подписка + AppState reconnect + invalidateQueries (INV-08) |
| Компоненты (common) | `src/components/common/OfflineBanner.tsx` — persistent полоска офлайн |
| Компоненты (lists) | `ItemCard.tsx` — добавлен `onDragStart` prop, drag-handle стал нажимаемым |
| Экраны | `ListDetailScreen.tsx` — DraggableFlatList + debounce 500мс reorder + useListWebSocket + error state + OfflineBanner |
| Экраны | `PublicListScreen.tsx` — useListWebSocket + OfflineBanner во всех состояниях |
| Экраны | `DashboardScreen.tsx` — error state + OfflineBanner |
| E2E тесты | `__tests__/e2e/auth.spec.ts` (E2E-01, E2E-05) |
| E2E тесты | `__tests__/e2e/lists.spec.ts` (E2E-02) |
| E2E тесты | `__tests__/e2e/public.spec.ts` (E2E-03) |
| E2E тесты | `__tests__/e2e/realtime.spec.ts` (E2E-04, только локально — 2 симулятора) |

---

## Этап 1 — Auth-экраны + unit-тесты фундамента ✅ ВЫПОЛНЕН 2026-03-19

**Цель:** Закрыть TZ Спринт 1-2: пользователь регистрируется, входит через email и Google, токен сохраняется, автологин работает. Фундамент покрыт тестами.

**Входные требования:** FR-01, FR-02, FR-03, FR-04, FR-05

**Зависимости:** нет (инфраструктура готова)

### Артефакты

| Файл | Содержимое |
|------|-----------|
| `src/utils/validators.ts` | Zod-схемы форм: `loginSchema`, `registerSchema`, `createListSchema`, `itemSchema` |
| `src/utils/formatters.ts` | `formatPrice(amount, currency)`, `formatDate(date)` |
| `src/components/common/Button.tsx` | variants: primary/secondary/danger, loading state, disabled, 44pt touch target |
| `src/components/common/FormInput.tsx` | react-hook-form Controller wrapper, inline error под полем |
| `src/components/common/Toast.tsx` | success / error / info — показывается поверх всего |
| `src/screens/auth/SplashScreen.tsx` | Логотип + `authStore.initialize()` → Dashboard или Login |
| `src/screens/auth/LoginScreen.tsx` | email + password, кнопка Google OAuth, ссылка на Register |
| `src/screens/auth/RegisterScreen.tsx` | display_name + email + password, ссылка на Login |
| `__tests__/services/tokenService.test.ts` | save / get / clear; проверить изоляцию через mock Keychain |
| `__tests__/services/guestService.test.ts` | save / get / clear; проверить MMKV mock |
| `__tests__/store/authStore.test.ts` | initialize, setAuth, logout; статусы: idle → loading → authenticated / unauthenticated |
| `__tests__/api/client.test.ts` | interceptor: 401 → refresh → retry; parallel 401 (race condition — только один refresh) |
| `__tests__/utils/validators.test.ts` | валидные и невалидные данные для каждой схемы |
| `__tests__/utils/formatters.test.ts` | форматирование цен (1500 RUB → «1 500 ₽»), дат |

### Риски

| Риск | Вероятность | Митигация |
|------|------------|-----------|
| Google OAuth: `wishify://oauth/callback` не добавлен в Google Console | Высокая | **Блокирующий.** Добавить redirect URI до начала тестирования FR-03. Нужен доступ к Google Cloud Console проекта. |
| `react-native-inappbrowser-reborn` — нативная линковка, нужен `pod install` | Средняя | Запускать тест OAuth только на симуляторе/устройстве, не в Jest. |
| Access token истёк при холодном старте → принудительный logout | Реализуется | Осознанный trade-off (ADR 1.1). Документировать в SplashScreen flow, не чинить. |
| Typo в jest config (`setupFilesAfterFramework`) → тесты не запускаются | Высокая | Исправить в первую очередь. |

### Минимальные проверки (Definition of Done)

```bash
npm run lint          # 0 errors, 0 warnings
npm run typecheck     # 0 errors
npm test -- --testPathPattern="services|store|api|utils"  # все зелёные
```

**Контракты (проверить через MOBILE_APP_GUIDE.md §7):**
- `POST /auth/register` → `{ access_token, user }`
- `POST /auth/login` → `{ access_token, user }`
- `GET /auth/me` → `User` (Bearer обязателен)
- `POST /auth/refresh` → `{ access_token }` (cookie refresh_token обязателен)
- `POST /auth/logout` → 200 / best-effort

**Ручная проверка (обязательно на реальном устройстве):**
- Keychain: токен НЕ попадает в AsyncStorage (проверить Xcode Instruments → Data & Persistence) — INV-01
- Google OAuth: SFSafariViewController открывается, после авторизации → Dashboard

**Критерий готовности:** Пользователь регистрируется → выходит → входит снова → убивает приложение → открывает → попадает на Dashboard без логина. Все тесты зелёные.

---

## Этап 2 — Core Owner Flow ✅ ВЫПОЛНЕН 2026-03-20

**Цель:** Полный CRUD списков и позиций. Пользователь может управлять своими вишлистами полностью.

**Входные требования:** FR-04, FR-06, FR-07, FR-08, FR-09, FR-10, FR-11, FR-12, FR-13, FR-14, FR-16, FR-25, FR-26

**Зависимости:** Этап 1 завершён (authStore.status = `authenticated` → AppNavigator отрисовывает Dashboard).

### Артефакты

| Файл | Содержимое |
|------|-----------|
| `src/hooks/useLists.ts` | `useGetLists`, `useCreateList`, `useUpdateList`, `useDeleteList` (TanStack Query, optimistic) |
| `src/hooks/useItems.ts` | `useGetListItems`, `useCreateItem`, `useUpdateItem`, `useDeleteItem`, `useReorderItems` |
| `src/hooks/useScrape.ts` | `useScrapedItem` — debounce 800мс, silent fail |
| `src/components/common/SkeletonCard.tsx` | Skeleton placeholder для карточки |
| `src/components/common/EmptyState.tsx` | Иллюстрация + текст + CTA кнопка |
| `src/components/common/BottomSheet.tsx` | Reanimated wrapper, закрытие по tap вне |
| `src/components/lists/ListCard.tsx` | Карточка в 2-колонной сетке: название, повод, дата, кол-во позиций; swipe-to-delete |
| `src/components/lists/ItemCard.tsx` | Позиция: FastImage, название, цена, иконки редактировать/удалить, drag-handle |
| `src/components/lists/CreateListBottomSheet.tsx` | Форма: название, описание, Picker повода, DatePicker |
| `src/screens/lists/DashboardScreen.tsx` | FlatList 2 колонки, pull-to-refresh, skeleton (4 карточки), EmptyState, кнопка «+» |
| `src/screens/lists/ListDetailScreen.tsx` | FlashList позиций, skeleton, header (Поделиться / Настройки), footer (+ Добавить) |
| `src/screens/lists/AddItemScreen.tsx` | Форма с URL-полем и скрапингом, групповая покупка switch |
| `src/screens/lists/EditItemScreen.tsx` | Предзаполненная форма, PATCH |
| `src/screens/lists/ListSettingsScreen.tsx` | Метаданные PATCH + «Удалить список» (danger zone) |
| `src/screens/profile/ProfileScreen.tsx` | Аватар (FastImage + fallback инициалы), имя, email, кнопка «Выйти» |
| `__tests__/components/Button.test.tsx` | Все варианты, loading state, disabled state |

### Риски

| Риск | Вероятность | Митигация |
|------|------------|-----------|
| URL scraping медленный или недоступен | Средняя | `silently fail` per FR-16: не показывать ошибку, просто не заполнять поля. Timeout 5с на запрос. |
| Оптимистичный откат при удалении: нужен snapshot queryData | Средняя | В `onMutate` → `queryClient.cancelQueries` + `queryClient.getQueryData` → snapshot; `onError` → `queryClient.setQueryData(snapshot)`. Шаблон отработать на `useDeleteList` сначала. |
| FlashList требует `estimatedItemSize` | Низкая | Замерить среднюю высоту ItemCard, выставить константу в `constants/layout.ts`. |
| Swipe-to-delete конфликтует с ScrollView на iOS | Средняя | `react-native-gesture-handler` Swipeable — проверить на iPhone SE 2022 реальное устройство. |
| DatePicker: нет встроенного компонента в RN | Средняя | Использовать `@react-native-community/datetimepicker` — добавить в зависимости. |

### Минимальные проверки

```bash
npm run lint
npm run typecheck
npm test  # все предыдущие + новые тесты
```

**Контракты:**
- `GET /lists` → `List[]`
- `POST /lists { title, description?, occasion?, date? }` → `List`
- `PATCH /lists/{id}` → `List`
- `DELETE /lists/{id}` → 204
- `GET /lists/{listId}` → `List` + `items: Item[]`
- `POST /lists/{listId}/items` → `Item`
- `PATCH /lists/{listId}/items/{itemId}` → `Item`
- `DELETE /lists/{listId}/items/{itemId}` → 204
- `PATCH /lists/{listId}/items/reorder { item_ids: string[] }` → 200
- `POST /items/scrape { url }` → `{ title, image_url, price }` / 4xx (silent)

**Ручная проверка (Airplane mode):**
- Удалить список при отсутствии сети → оптимистичный откат: карточка возвращается + toast «Не удалось удалить»

**Критерий готовности:** Владелец создаёт список → добавляет 3 позиции (одну через URL-скрапинг) → редактирует одну → удаляет одну → удаляет список. Всё через UI, без хардкода данных.

---

## Этап 3 — Core Viewer Flow ✅ ВЫПОЛНЕН 2026-03-20

**Цель:** Публичный список, гостевая сессия, резервирование, групповые покупки, шеринг по deep link.

**Входные требования:** FR-18, FR-19, FR-20, FR-21, FR-22, FR-23, FR-24, FR-27

**Зависимости:** Этап 2 (компоненты: `SkeletonCard`, `EmptyState`, `Toast`, `BottomSheet`, `Button`). INV-06 (`PublicListScreen` в `RootNavigator` — уже настроено в `linking.ts`).

### Артефакты

| Файл | Содержимое |
|------|-----------|
| `src/hooks/usePublicList.ts` | `useGetPublicList(slug)` — без Bearer, с X-Guest-Token если есть |
| `src/hooks/useReservations.ts` | `useReserveItem`, `useUnreserveItem` — optimistic |
| `src/hooks/useContributions.ts` | `useAddContribution`, `useDeleteContribution` |
| `src/components/public/ItemPublicCard.tsx` | Карточка зрителя: статус «Свободно/Зарезервировано», кнопка резервирования, прогресс групповой |
| `src/components/public/ReserveButton.tsx` | Переключает состояния, вызывает мутацию, haptic на успехе |
| `src/components/public/FundingProgress.tsx` | Progress bar + сумма, граничные случаи 0%/100%/>100% |
| `src/components/public/ContributeBottomSheet.tsx` | Поля: сумма, сообщение; кнопка «Внести вклад» |
| `src/components/public/GuestNameBottomSheet.tsx` | «Как вас зовут?»: поле имени, «Продолжить», «Войти в аккаунт» |
| `src/components/public/GuestBanner.tsx` | «Вы входите как [Имя] · Войти» — persistent при наличии guest сессии |
| `src/screens/public/PublicListScreen.tsx` | FlashList, GuestBanner, pull-to-refresh, skeleton, empty state |
| `__tests__/components/ReserveButton.test.tsx` | Переключение состояний, вызов мутации, откат при ошибке |
| `__tests__/components/FundingProgress.test.tsx` | 0%, 50%, 100%, 120% — отображение |
| `__tests__/components/GuestBanner.test.tsx` | Отображение при наличии / отсутствии гостевой сессии |

### Риски

| Риск | Вероятность | Митигация |
|------|------------|-----------|
| Race condition резервирования (двое одновременно) | Средняя | Бэкенд вернёт 409/conflict → toast «Кто-то успел раньше» + откат optimistic update. Проверить на двух симуляторах. |
| GuestBanner → «Войти» → AuthNavigator, но PublicListScreen должен остаться | Средняя | Навигировать на Login с параметром `returnTo: { screen: 'PublicList', params: { slug } }` → после login → `navigation.navigate('PublicList', { slug })`. |
| Deep link для гостя без авторизации | Низкая (INV-06 решает) | Проверить на чистой установке (без токена): открыть `wishify://list/{slug}` → PublicListScreen без Auth. |
| `POST /auth/guest` токен в MMKV, не Keychain | Реализуется | Соответствует INV-01: guest token разрешён в MMKV через `guestService`. Не изменять. |
| Владелец открывает свой же список по публичной ссылке | Низкая | Бэкенд фильтрует имена резервирующих для владельца — проверить, что UI не показывает их. |

### Минимальные проверки

```bash
npm run lint
npm run typecheck
npm test -- --testPathPattern="ReserveButton|FundingProgress|GuestBanner|public"
```

**Контракты:**
- `GET /lists/public/{slug}` → публичный список (без имён резервирующих для владельца)
- `POST /items/{id}/reserve` → 200 | 409 (уже занято)
- `DELETE /items/{id}/reserve` → 204
- `POST /items/{id}/contributions { amount, note? }` → `Contribution`
- `DELETE /items/{id}/contributions/{contributionId}` → 204
- `POST /auth/guest { display_name }` → `{ guest_token, display_name }`

**Заголовки для гостя:** interceptor в `client.ts` автоматически добавляет `X-Guest-Token` из `guestService.getToken()` рядом с Bearer (или вместо него).

**Ручная проверка:**
- Persistent гостевая сессия: ввести имя → убить приложение → открыть тот же список → GuestBanner показывает имя, без повторного ввода (FR-24)
- Шеринг: `Share.share` → нативный iOS Share Sheet открывается с правильной ссылкой

**Критерий готовности:** Гость открывает список по deep link `wishify://list/{slug}` → вводит имя → резервирует позицию → видит статус «Зарезервировано» → убивает приложение → открывает снова → GuestBanner с именем сохранился.

---

## Этап 4 — Real-time и polish ✅ ВЫПОЛНЕН 2026-03-20

**Цель:** WebSocket интеграция, drag-and-drop, полный UX (skeleton/empty/error везде), haptics. Готовность к TestFlight.

**Входные требования:** FR-15, FR-28 + polish всех предыдущих экранов

**Зависимости:** Все экраны из Этапов 1-3. `wsManager.ts` готов — нужен только хук.

### Артефакты

| Файл | Содержимое |
|------|-----------|
| `src/hooks/useListWebSocket.ts` | Подписка на `wsManager`, при событии → `queryClient.invalidateQueries` (INV-08). AppState listener для reconnect из фона. |
| `src/hooks/useNetworkStatus.ts` | NetInfo wrapper → `uiStore.setIsOffline` |
| `src/components/common/OfflineBanner.tsx` | Persistent «Нет подключения» — показывается поверх контента |
| Обновление `ListDetailScreen` | Интеграция `react-native-draggable-flatlist`, debounce 500мс для reorder PATCH, `useListWebSocket` |
| Обновление `PublicListScreen` | `useListWebSocket(slug)`, skeleton, all states |
| Обновление всех экранов | Error state (inline + кнопка «Повторить»), skeleton loaders везде |
| Haptic feedback | `react-native-haptic-feedback` или `Vibration` (добавить если не в зависимостях): success при резервировании, warning при удалении |
| `__tests__/e2e/auth.spec.ts` | E2E-01: регистрация → Dashboard; E2E-05: logout + автологин |
| `__tests__/e2e/lists.spec.ts` | E2E-02: login → create list → add item → see item |
| `__tests__/e2e/public.spec.ts` | E2E-03: deep link → guest name → reserve → see status |
| `__tests__/e2e/realtime.spec.ts` | E2E-04: изменение на одном устройстве → видно на другом |

### Риски

| Риск | Вероятность | Митигация |
|------|------------|-----------|
| iOS разрывает WS при уходе в фон | Высокая (системное поведение iOS) | `useListWebSocket`: подписаться на `AppState.addEventListener('change', ...)` → при `active` → `wsManager.connect(slug)`. Тест: уйти в фон на 1 мин, обновить список на другом устройстве, вернуться. |
| DnD 60fps на iPhone SE 2022 | Средняя | `react-native-draggable-flatlist` использует Reanimated — проверить производительность на реальном устройстве. Если просадки — уменьшить количество `useSharedValue` в ItemCard. |
| Detox setup на CI (macOS runner, дорого) | Высокая | E2E в CI: E2E-01, E2E-02, E2E-03, E2E-05 — на каждый push в main. E2E-04 (2 симулятора real-time) — только локально и перед релизом. |
| Debounce reorder 500мс: быстрые переносы → неправильный финальный порядок | Средняя | Брать snapshot `item_ids` в момент выполнения debounce callback (после всех перемещений), не в начале drag. |
| `react-native-haptic-feedback` не в package.json | Низкая | Использовать `Vibration` из `react-native` core. Или добавить `react-native-haptic-feedback` в dependencies. |

### Минимальные проверки

```bash
npm run lint
npm run typecheck
npm test                # все unit + component тесты
npx detox build --configuration ios.sim.debug
npx detox test --configuration ios.sim.debug e2e/auth e2e/lists e2e/public
```

**WS-контракт (проверить на реальном бэкенде):**

| Событие | Action |
|---------|--------|
| `item.created` | `invalidateQueries(['list', slug])` |
| `item.updated` | `invalidateQueries(['list', slug])` |
| `item.deleted` | `invalidateQueries(['list', slug])` |
| `item.reordered` | `invalidateQueries(['list', slug])` |
| `reservation.changed` | `invalidateQueries(['publicList', slug])` |
| `contribution.added` | `invalidateQueries(['publicList', slug])` |
| `contribution.removed` | `invalidateQueries(['publicList', slug])` |
| `list.updated` | `invalidateQueries(['list', slug])` |

**Критерий готовности (TestFlight ready):**
- [ ] E2E-01…E2E-05 проходят на iPhone 15 Pro Simulator iOS 17
- [ ] 60fps при скролле и DnD на iPhone SE 2022 (реальное устройство — Xcode Instruments → Time Profiler)
- [ ] WS reconnect: потеря WiFi + возврат в foreground → данные актуальны без ручного обновления
- [ ] IPA ≤ 50 МБ (`xcrun altool --validate-app` или Xcode Archive → Analyze)
- [ ] 0 crashes на E2E сценариях
- [ ] Все INV-01…INV-10 соблюдены (чеклист ниже)

---

## Этап 5 — Релиз ✅ ВЫПОЛНЕН 2026-03-20

**Цель:** CI/CD, App Store submission, публичный TestFlight.

**Зависимости:** Этап 4 завершён, Apple Developer Program аккаунт активен, Mac + Xcode 15+.

### Реализовано в Этапе 5 (2026-03-20)
| Файл | Содержимое |
|------|-----------|
| `Gemfile` | `gem 'fastlane'` + `gem 'cocoapods'` |
| `fastlane/Appfile` | `app_identifier("com.wishify.mobile")`, заготовка Apple ID |
| `fastlane/Fastfile` | Lanes: `test` (lint + typecheck + jest + detox E2E-01..03,05), `beta` (match + build + TestFlight), `release` (deliver + App Store submit) |
| `.github/workflows/ios.yml` | 3 джоба: `lint-and-test` (каждый push/PR) → `detox-e2e` (main only) → `build-beta` (main only, TestFlight) |
| `fastlane/metadata/ru/name.txt` | «Wishify» |
| `fastlane/metadata/ru/subtitle.txt` | «Списки желаний» |
| `fastlane/metadata/ru/description.txt` | Полное описание App Store на русском |
| `fastlane/metadata/ru/keywords.txt` | 10 ключевых слов |
| `fastlane/metadata/ru/release_notes.txt` | What's New для v1.0 |
| `fastlane/metadata/ru/privacy_url.txt` | `https://wishify.app/privacy` |
| `.gitignore` | node_modules, .env*, *.ipa, Pods/, fastlane/screenshots/, coverage/ |
| `fastlane/Matchfile` | git_url из env, type=appstore, bundle ID, username |
| `fastlane/app_rating_config.json` | Все категории = 0 (без ограничений возраста) |
| `fastlane/screenshots/.gitkeep` | Placeholder директории для скриншотов App Store |

### Артефакты

| Файл / Action | Содержимое |
|------|-----------|
| `Gemfile` | `gem 'fastlane'` |
| `fastlane/Fastfile` | Lanes: `test` (lint + jest + detox), `beta` (build + TestFlight), `release` (App Store) |
| `fastlane/Appfile` | `app_identifier("com.wishify.mobile")`, Apple ID |
| `.github/workflows/ios.yml` | Triggers: push to main. Steps: lint → typecheck → jest → detox (E2E-01..03, 05) → build → TestFlight |
| `fastlane/metadata/ru/` | Название, описание, ключевые слова, скриншоты для App Store |
| App Store Connect | Privacy Policy URL, Bundle ID `com.wishify.mobile`, иконка 1024×1024 без альфа |

### Риски

| Риск | Вероятность | Митигация |
|------|------------|-----------|
| App Store review rejection (Privacy Policy, разрешения) | Средняя | Проверить §12.3 ТЗ до подачи. Все `NSUsageDescription` добавлены. Privacy Policy URL валиден. |
| GitHub Actions macOS runner: дорого и медленно | Высокая | E2E только на push в main / по workflow_dispatch. Unit + lint — на каждый PR. |
| Fastlane match certificates: нужен приватный репозиторий | Средняя | Альтернатива — `fastlane match` с App Store Connect API key (без репозитория). |
| Google OAuth `wishify://oauth/callback` не в Google Console | Высокая | Проверить на реальном устройстве ДО загрузки в TestFlight. |

### Минимальные проверки

```bash
bundle exec fastlane ios test    # lint + jest + detox
bundle exec fastlane ios beta    # build + upload TestFlight
# Ручная проверка на 3 устройствах: iPhone SE, iPhone 14, iPhone 15 Pro Max
```

**Критерий готовности:**
- [ ] Privacy Policy URL указан в App Store Connect
- [ ] Все пункты §12.3 ТЗ выполнены
- [ ] Build загружен в TestFlight без ошибок
- [ ] Минимум 3 тестировщика подтверждают сценарии S1–S5 из ТЗ §2.2

---

## Таблица зависимостей

```
Инфраструктура (DONE)
       │
       ▼
Этап 1: Auth-экраны + unit-тесты
       │  Разблокирует: AppNavigator рендерит Dashboard
       ▼
Этап 2: Core Owner Flow
       │  Разблокирует: общие компоненты (SkeletonCard, Toast, BottomSheet)
       ▼
Этап 3: Core Viewer Flow
       │  Разблокирует: все экраны + hooks
       ▼
Этап 4: Real-time + polish
       │  Разблокирует: TestFlight build
       ▼
Этап 5: Релиз
```

**Параллельно на Этапах 2–3:** unit-тесты новых компонентов пишутся в том же PR, что и компонент.

---

## Чеклист инвариантов (проверять перед каждым этапом)

> Источник: `ADR.md §3`

| INV | Проверка |
|-----|---------|
| INV-01 | `grep -r "AsyncStorage" src/` → 0 результатов. Токен только через `tokenService`. |
| INV-02 | `grep -r "axios.create" src/` → только 1 результат в `api/client.ts`. |
| INV-03 | В `client.ts`: проверка `!originalRequest._retry` перед вызовом refresh. |
| INV-04 | В `wsManager.ts`: `connect()` вызывает `disconnect()` перед новым подключением. |
| INV-05 | `grep -r "isLoggedIn\|isAuthenticated" src/` → только в `authStore`. |
| INV-06 | `PublicListScreen` зарегистрирован в `RootNavigator`, НЕ внутри `AppNavigator`. |
| INV-07 | Все импорты в `src/` используют `@/`. `grep -r '"\.\.' src/` → 0 результатов. |
| INV-08 | `grep -r "setQueryData" src/hooks/useListWebSocket.ts` → 0 результатов. |
| INV-09 | `grep -r "SafeAreaView" src/screens/` → только из `react-native-safe-area-context`. |
| INV-10 | Последний плагин в `babel.config.js` — `react-native-reanimated/plugin`. |

---

## Недостающие зависимости (добавить перед Этапом 2)

| Пакет | Причина |
|-------|---------|
| `@react-native-community/datetimepicker` | DatePicker в CreateListBottomSheet (FR-07) |
| `react-native-haptic-feedback` | Haptic feedback (FR-19, FR-13) — если не использовать `Vibration` |

`react-native-config` уже есть — не забыть создать `.env` с `API_BASE_URL` и `.env.production`.
