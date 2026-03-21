// Глобальные mock-и нативных модулей для Jest
// Запускается через setupFiles (перед каждым тест-файлом)

// react-native-reanimated
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

// react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
  PanGestureHandler: 'PanGestureHandler',
  TapGestureHandler: 'TapGestureHandler',
  Swipeable: 'Swipeable',
  DrawerLayout: 'DrawerLayout',
  State: {},
  Directions: {},
}));

// react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// react-native-screens
jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
  Screen: 'Screen',
  ScreenContainer: 'ScreenContainer',
}));

// react-native-fast-image
jest.mock('react-native-fast-image', () => 'FastImage');

// react-native-linear-gradient
jest.mock('react-native-linear-gradient', () => 'LinearGradient');

// react-native-skeleton-placeholder
jest.mock('react-native-skeleton-placeholder', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
  Item: 'SkeletonItem',
}));

// react-native-vector-icons
jest.mock('react-native-vector-icons/Feather', () => 'Icon');
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');

// react-native-config
jest.mock('react-native-config', () => ({ default: { API_BASE_URL: 'http://localhost:8000' } }));

// @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
}));

// @react-native-community/datetimepicker
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

// react-native-mmkv
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn().mockReturnValue(undefined),
    delete: jest.fn(),
    contains: jest.fn().mockReturnValue(false),
  })),
}));

// react-native-keychain (глобальный fallback; тесты, которым нужен конкретный mock, переопределяют через jest.mock)
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn().mockResolvedValue(false),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'kSecAttrAccessibleWhenUnlockedThisDeviceOnly' },
}));

// react-native-inappbrowser-reborn
jest.mock('react-native-inappbrowser-reborn', () => ({
  default: {
    isAvailable: jest.fn().mockResolvedValue(true),
    open: jest.fn().mockResolvedValue({ type: 'cancel' }),
    close: jest.fn(),
    openAuth: jest.fn().mockResolvedValue({ type: 'cancel', url: '' }),
  },
}));

// @react-navigation/native — базовые хуки для компонентных тестов
// Тест-файлы могут переопределить через локальный jest.mock
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), push: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));

// react-native-draggable-flatlist
jest.mock('react-native-draggable-flatlist', () => ({
  __esModule: true,
  default: 'DraggableFlatList',
  ScaleDecorator: ({ children }: { children: React.ReactNode }) => children,
}));
