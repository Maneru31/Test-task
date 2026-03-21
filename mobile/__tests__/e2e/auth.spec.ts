// E2E-01: Регистрация → Dashboard
// E2E-05: Logout + автологин (токен сохраняется, приложение восстанавливает сессию)
//
// Запуск: npx detox test --configuration ios.sim.debug e2e/auth
// Требует: iPhone 15 Pro Simulator iOS 17, бэкенд доступен по API_BASE_URL

import { device, element, by, expect as detoxExpect } from 'detox';

describe('E2E-01: Регистрация и вход', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('E2E-01a: SplashScreen → LoginScreen (нет токена)', async () => {
    await detoxExpect(element(by.id('login-screen'))).toBeVisible();
  });

  it('E2E-01b: переход на RegisterScreen', async () => {
    await element(by.id('goto-register-link')).tap();
    await detoxExpect(element(by.id('register-screen'))).toBeVisible();
  });

  it('E2E-01c: успешная регистрация → Dashboard', async () => {
    const timestamp = Date.now();
    await element(by.id('register-displayname-input')).typeText(`TestUser_${timestamp}`);
    await element(by.id('register-email-input')).typeText(`test_${timestamp}@wishify.test`);
    await element(by.id('register-password-input')).typeText('Password123!');
    await element(by.id('register-submit-button')).tap();
    await detoxExpect(element(by.id('dashboard-screen'))).toBeVisible();
  });
});

describe('E2E-05: Logout и автологин', () => {
  it('E2E-05a: logout переводит на LoginScreen', async () => {
    await element(by.id('tab-profile')).tap();
    await detoxExpect(element(by.id('profile-screen'))).toBeVisible();
    await element(by.id('logout-button')).tap();
    await detoxExpect(element(by.id('login-screen'))).toBeVisible();
  });

  it('E2E-05b: повторный вход сохраняет токен', async () => {
    await element(by.id('login-email-input')).typeText('existing@wishify.test');
    await element(by.id('login-password-input')).typeText('Password123!');
    await element(by.id('login-submit-button')).tap();
    await detoxExpect(element(by.id('dashboard-screen'))).toBeVisible();
  });

  it('E2E-05c: убить приложение → переоткрыть → Dashboard без логина (автологин)', async () => {
    await device.terminateApp();
    await device.launchApp({ newInstance: false });
    // SplashScreen выполняет authStore.initialize() → токен есть → Dashboard
    await detoxExpect(element(by.id('dashboard-screen'))).toBeVisible();
  });
});
