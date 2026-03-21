// Этап 2: AppNavigator — реальный ProfileScreen вместо placeholder'а
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ListsStackNavigator } from './ListsStackNavigator';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { colors } from '@/constants/colors';
import type { AppTabParamList } from '@/types/navigation';

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tab.Screen
        name="ListsStack"
        component={ListsStackNavigator}
        options={{ title: 'Списки' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Профиль' }}
      />
    </Tab.Navigator>
  );
}
