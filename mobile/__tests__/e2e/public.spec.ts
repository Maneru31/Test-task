// E2E-03: Deep link → ввести гостевое имя → зарезервировать → увидеть статус
//
// Запуск: npx detox test --configuration ios.sim.debug e2e/public
// Требует: iPhone 15 Pro Simulator iOS 17, валидный slug от бэкенда

import { device, element, by, expect as detoxExpect } from 'detox';

// Slug тестового публичного списка (нужно создать заранее на бэкенде)
const TEST_SLUG = 'test-list-e2e';

describe('E2E-03: Публичный список и резервирование', () => {
  beforeAll(async () => {
    // Открываем приложение с deep link (без авторизации — новый инстанс)
    await device.launchApp({
      newInstance: true,
      url: `wishify://list/${TEST_SLUG}`,
    });
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('E2E-03a: deep link открывает PublicListScreen без авторизации (INV-06)', async () => {
    await detoxExpect(element(by.id('public-list-screen'))).toBeVisible();
    // Форма логина НЕ должна появляться автоматически
    await detoxExpect(element(by.id('login-screen'))).not.toBeVisible();
  });

  it('E2E-03b: нажатие «Зарезервировать» без сессии → GuestNameBottomSheet', async () => {
    await element(by.id('reserve-button')).atIndex(0).tap();
    await detoxExpect(element(by.id('guest-name-bottom-sheet'))).toBeVisible();
  });

  it('E2E-03c: ввести имя гостя → сессия создана → GuestBanner виден', async () => {
    await element(by.id('guest-name-input')).typeText('Гость Тест');
    await element(by.id('guest-name-submit-button')).tap();
    await detoxExpect(element(by.id('guest-banner'))).toBeVisible();
    await detoxExpect(element(by.text('Гость Тест'))).toBeVisible();
  });

  it('E2E-03d: резервирование позиции → статус «Зарезервировано»', async () => {
    await element(by.id('reserve-button')).atIndex(0).tap();
    await detoxExpect(element(by.text('Зарезервировано!'))).toBeVisible(); // toast
    await detoxExpect(element(by.text('Отменить резерв'))).toBeVisible(); // кнопка сменила состояние
  });

  it('E2E-03e: убить приложение → переоткрыть → GuestBanner сохранился (FR-24)', async () => {
    await device.terminateApp();
    await device.launchApp({
      newInstance: false,
      url: `wishify://list/${TEST_SLUG}`,
    });
    await detoxExpect(element(by.id('public-list-screen'))).toBeVisible();
    await detoxExpect(element(by.id('guest-banner'))).toBeVisible();
    await detoxExpect(element(by.text('Гость Тест'))).toBeVisible();
  });
});
