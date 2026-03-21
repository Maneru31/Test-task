import { WS_BASE_URL } from '@/constants/api';
import type { WsEvent } from '@/types/api';

type WsListener = (event: WsEvent) => void;

class WsManager {
  private ws: WebSocket | null = null;
  private currentSlug: string | null = null;
  private currentToken: string | undefined = undefined;
  private listeners: Set<WsListener> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30_000;

  connect(slug: string, token?: string): void {
    this.disconnect();
    this.currentSlug = slug;
    this.currentToken = token;

    const url = `${WS_BASE_URL}/ws/lists/${slug}`;
    // Token passed as header (stays out of server logs) — RN-specific 3rd arg
    // @ts-ignore — React Native WebSocket supports options.headers
    this.ws = new WebSocket(url, undefined, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
    };

    this.ws.onmessage = (e) => {
      try {
        const event: WsEvent = JSON.parse(e.data);
        this.listeners.forEach((fn) => fn(event));
      } catch {
        // Игнорируем некорректный JSON
      }
    };

    this.ws.onclose = (e) => {
      if (!e.wasClean) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close(1000);
    this.ws = null;
    this.currentSlug = null;
    this.currentToken = undefined;
  }

  addListener(fn: WsListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private scheduleReconnect(): void {
    if (!this.currentSlug) return;
    this.reconnectTimer = setTimeout(() => {
      if (this.currentSlug) {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
        this.connect(this.currentSlug, this.currentToken);
      }
    }, this.reconnectDelay);
  }
}

export const wsManager = new WsManager();
