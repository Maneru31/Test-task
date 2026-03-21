import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';
import type { AuthStackParamList } from '@/types/navigation';

// OAuthCallback — обрабатывается через deep link (wishify://oauth/callback),
// экран-заглушка нужен только чтобы navigator знал о маршруте
const OAuthCallbackScreen = () => null;

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="OAuthCallback" component={OAuthCallbackScreen} />
    </Stack.Navigator>
  );
}
