// Этап 3: подключён реальный PublicListScreen (INV-06: вне Auth/App веток)
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { PublicListScreen } from '@/screens/public/PublicListScreen';
import { linking } from './linking';
import { colors } from '@/constants/colors';
import type { RootStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

function SplashScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function RootNavigator() {
  const { status, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (status === 'loading') {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {status === 'authenticated' ? (
          <Stack.Screen name="App" component={AppNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
        {/* Публичный экран доступен всегда (deep link + прямая навигация) */}
        <Stack.Screen
          name="PublicList"
          component={PublicListScreen}
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Список желаний',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
