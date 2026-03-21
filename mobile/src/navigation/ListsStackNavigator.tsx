// Этап 2: ListsStackNavigator — реальные экраны вместо placeholder'ов
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '@/screens/lists/DashboardScreen';
import { ListDetailScreen } from '@/screens/lists/ListDetailScreen';
import { ListSettingsScreen } from '@/screens/lists/ListSettingsScreen';
import { AddItemScreen } from '@/screens/lists/AddItemScreen';
import { EditItemScreen } from '@/screens/lists/EditItemScreen';
import { colors } from '@/constants/colors';
import type { ListsStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<ListsStackParamList>();

export function ListsStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.textPrimary },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Мои списки' }}
      />
      <Stack.Screen
        name="ListDetail"
        component={ListDetailScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
      <Stack.Screen
        name="ListSettings"
        component={ListSettingsScreen}
        options={{ title: 'Настройки списка' }}
      />
      <Stack.Screen
        name="AddItem"
        component={AddItemScreen}
        options={{ title: 'Добавить желание' }}
      />
      <Stack.Screen
        name="EditItem"
        component={EditItemScreen}
        options={{ title: 'Редактировать желание' }}
      />
    </Stack.Navigator>
  );
}
