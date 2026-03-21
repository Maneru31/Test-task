import Config from 'react-native-config';

export const API_BASE_URL = Config.API_BASE_URL ?? 'https://test-task-production-4fd4.up.railway.app/api/v1';
export const WS_BASE_URL = Config.WS_BASE_URL ?? 'wss://test-task-production-4fd4.up.railway.app/api/v1';

export const REQUEST_TIMEOUT_MS = 15_000;
