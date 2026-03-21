// Manual mock для react-native-keychain
// Используется когда тест вызывает jest.mock('react-native-keychain') без фабрики
const mockSetGenericPassword = jest.fn().mockResolvedValue(false);
const mockGetGenericPassword = jest.fn().mockResolvedValue(false);
const mockResetGenericPassword = jest.fn().mockResolvedValue(true);

module.exports = {
  setGenericPassword: mockSetGenericPassword,
  getGenericPassword: mockGetGenericPassword,
  resetGenericPassword: mockResetGenericPassword,
  ACCESSIBLE: {
    WHEN_UNLOCKED: 'kSecAttrAccessibleWhenUnlocked',
    AFTER_FIRST_UNLOCK: 'kSecAttrAccessibleAfterFirstUnlock',
    ALWAYS: 'kSecAttrAccessibleAlways',
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'kSecAttrAccessibleWhenUnlockedThisDeviceOnly',
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly',
  },
  STORAGE: {
    KEYCHAIN: 'keychain',
    KEYSTORE: 'keystore',
  },
};
