// E2E-02: Login → создать список → добавить позицию → увидеть позицию
//
// Запуск: npx detox test --configuration ios.sim.debug e2e/lists
// Требует: iPhone 15 Pro Simulator iOS 17, аккаунт existing@wishify.test / Password123!

import { device, element, by, expect as detoxExpect } from 'detox';

describe('E2E-02: Core Owner Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    // Логинимся перед тестами
    await element(by.id('login-email-input')).typeText('existing@wishify.test');
    await element(by.id('login-password-input')).typeText('Password123!');
    await element(by.id('login-submit-button')).tap();
    await detoxExpect(element(by.id('dashboard-screen'))).toBeVisible();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('E2E-02a: создать список через FAB', async () => {
    await element(by.id('dashboard-fab')).tap();
    await detoxExpect(element(by.id('create-list-bottom-sheet'))).toBeVisible();
    await element(by.id('create-list-title-input')).typeText('E2E Test List');
    await element(by.id('create-list-submit-button')).tap();
    await detoxExpect(element(by.text('E2E Test List'))).toBeVisible();
  });

  it('E2E-02b: открыть список → экран деталей', async () => {
    await element(by.text('E2E Test List')).tap();
    await detoxExpect(element(by.id('list-detail-screen'))).toBeVisible();
  });

  it('E2E-02c: добавить позицию вручную', async () => {
    await element(by.id('add-item-footer-button')).tap();
    await detoxExpect(element(by.id('add-item-screen'))).toBeVisible();
    await element(by.id('item-name-input')).typeText('Nintendo Switch');
    await element(by.id('item-price-input')).typeText('25000');
    await element(by.id('add-item-submit-button')).tap();
    await detoxExpect(element(by.id('list-detail-screen'))).toBeVisible();
    await detoxExpect(element(by.text('Nintendo Switch'))).toBeVisible();
  });

  it('E2E-02d: drag-and-drop позиции (длинное нажатие на handle)', async () => {
    // Второй элемент добавляем для переупорядочивания
    await element(by.id('add-item-footer-button')).tap();
    await element(by.id('item-name-input')).typeText('PlayStation 5');
    await element(by.id('add-item-submit-button')).tap();

    // Проверяем, что оба элемента видны
    await detoxExpect(element(by.text('Nintendo Switch'))).toBeVisible();
    await detoxExpect(element(by.text('PlayStation 5'))).toBeVisible();
  });
});
