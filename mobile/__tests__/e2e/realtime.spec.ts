// E2E-04: Real-time — изменение на одном устройстве видно на другом
//
// ⚠️  Запускать ТОЛЬКО локально (2 симулятора одновременно), НЕ на CI.
//     Причина: требует два параллельных Detox-инстанса — дорого и сложно на GitHub Actions.
//     Инструкция в PLAN.md §Этап 4 риски.
//
// Запуск:
//   Устройство A (владелец):  npx detox test --configuration ios.sim.debug e2e/realtime
//   Устройство B (зритель):   открыть симулятор вручную с deep link wishify://list/{slug}
//
// Этот файл описывает сценарий для устройства A.

import { device, element, by, expect as detoxExpect } from 'detox';

const TEST_SLUG = 'test-list-e2e';

describe('E2E-04: Real-time WebSocket обновления', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    // Логин как владелец
    await element(by.id('login-email-input')).typeText('existing@wishify.test');
    await element(by.id('login-password-input')).typeText('Password123!');
    await element(by.id('login-submit-button')).tap();
    await detoxExpect(element(by.id('dashboard-screen'))).toBeVisible();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('E2E-04a: владелец открывает список → WS подключается', async () => {
    await element(by.text('E2E Test List')).tap();
    await detoxExpect(element(by.id('list-detail-screen'))).toBeVisible();
    // Проверяем, что экран отображается (WS соединение устанавливается в фоне)
  });

  it('E2E-04b: уйти в фон и вернуться → данные актуальны без pull-to-refresh', async () => {
    // Уйти в фон
    await device.sendToHome();
    // Подождать 3 секунды (имитация: на втором устройстве гость резервирует позицию)
    await new Promise((resolve) => setTimeout(resolve, 3000));
    // Вернуться в foreground
    await device.launchApp({ newInstance: false });
    await detoxExpect(element(by.id('list-detail-screen'))).toBeVisible();
    // Данные должны обновиться через WS reconnect при AppState 'active'
    // Конкретная проверка зависит от действий на втором устройстве
  });

  it('E2E-04c: добавить позицию → зритель видит без обновления (real-time)', async () => {
    // Этот тест требует второго открытого симулятора с PublicListScreen
    // Здесь проверяем только, что добавление позиции работает
    await element(by.id('add-item-footer-button')).tap();
    await element(by.id('item-name-input')).typeText('Real-time Item');
    await element(by.id('add-item-submit-button')).tap();
    await detoxExpect(element(by.id('list-detail-screen'))).toBeVisible();
    await detoxExpect(element(by.text('Real-time Item'))).toBeVisible();
    // На втором симуляторе зритель должен увидеть позицию без ручного обновления
  });
});
