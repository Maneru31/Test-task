module.exports = {
  preset: 'react-native',
  setupFiles: ['./__mocks__/setup.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/e2e/',
  ],
  moduleNameMapper: {
    '^react-native-config$': '<rootDir>/__mocks__/react-native-config.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-keychain|react-native-mmkv|react-native-reanimated|react-native-gesture-handler|@shopify/flash-list|react-native-fast-image|react-native-linear-gradient|react-native-skeleton-placeholder|react-native-draggable-flatlist|react-native-vector-icons|react-native-safe-area-context|react-native-screens|@react-native-community)/)',
  ],
};
