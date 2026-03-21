// Этап 4: useNetworkStatus — подписка на статус сети через @react-native-community/netinfo
// При изменении → uiStore.setIsOffline(true/false)
// Монтировать один раз в RootNavigator / AppNavigator.

import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useUiStore } from '@/store/uiStore';

export function useNetworkStatus(): void {
  const setIsOffline = useUiStore((s) => s.setIsOffline);

  useEffect(() => {
    // Получить текущее состояние немедленно (без ожидания первого события)
    NetInfo.fetch().then((state) => {
      setIsOffline(!(state.isConnected ?? true));
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!(state.isConnected ?? true));
    });

    return unsubscribe;
  }, [setIsOffline]);
}
