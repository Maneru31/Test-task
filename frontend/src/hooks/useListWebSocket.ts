"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getAccessToken } from "@/lib/api";
import type { ListWithItems } from "@/lib/listsApi";
import type {
  PublicList,
  PublicItem,
  Item,
  WsEvent,
  WsEventName,
  WsReservationPayload,
  WsContributionPayload,
  WsItemPayload,
  WsReorderPayload,
  WsListPayload,
} from "@/types";

const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL ??
  (process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/^https?/, (p) =>
        p === "https" ? "wss" : "ws"
      )
    : "ws://localhost:8000/api/v1");

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

type WsErrorPayload = { message?: string };

export function useListWebSocket(
  slug: string | undefined,
  mode: "public" | "owner",
  listId?: string
): void {
  const queryClient = useQueryClient();

  // Refs to avoid stale closures inside ws event handlers
  const modeRef = useRef(mode);
  const listIdRef = useRef(listId);
  const slugRef = useRef(slug);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    listIdRef.current = listId;
  }, [listId]);

  useEffect(() => {
    slugRef.current = slug;
  }, [slug]);

  useEffect(() => {
    if (!slug) return;

    let destroyed = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attemptIndex = 0;
    let wasConnected = false;

    function connect() {
      if (destroyed) return;

      const token = getAccessToken();
      const url = token
        ? `${WS_BASE_URL}/ws/lists/${slug}?token=${encodeURIComponent(token)}`
        : `${WS_BASE_URL}/ws/lists/${slug}`;

      ws = new WebSocket(url);

      ws.onopen = () => {
        if (destroyed) {
          ws?.close();
          return;
        }
        if (wasConnected) {
          // Reconnect: invalidate the relevant query to sync any missed updates
          if (modeRef.current === "public" && slugRef.current) {
            queryClient.invalidateQueries({
              queryKey: ["list-public", slugRef.current],
            });
          } else if (modeRef.current === "owner" && listIdRef.current) {
            queryClient.invalidateQueries({
              queryKey: ["list", listIdRef.current],
            });
          }
        }
        wasConnected = true;
        attemptIndex = 0;
      };

      ws.onmessage = (event: MessageEvent) => {
        if (destroyed) return;
        let parsed: WsEvent<unknown>;
        try {
          parsed = JSON.parse(event.data as string) as WsEvent<unknown>;
        } catch {
          return;
        }
        handleEvent(parsed);
      };

      ws.onerror = () => {
        // Let onclose handle reconnect logic
        ws?.close();
      };

      ws.onclose = () => {
        if (destroyed) return;
        ws = null;
        const delay =
          RECONNECT_DELAYS[Math.min(attemptIndex, RECONNECT_DELAYS.length - 1)];
        attemptIndex = Math.min(attemptIndex + 1, RECONNECT_DELAYS.length - 1);
        reconnectTimer = setTimeout(() => {
          if (!destroyed) connect();
        }, delay);
      };
    }

    function handleEvent(wsEvent: WsEvent<unknown>) {
      const { event, payload } = wsEvent;

      if (event === ("connected" satisfies WsEventName)) {
        return;
      }

      if (event === "error") {
        const errPayload = payload as WsErrorPayload;
        toast.error(errPayload?.message ?? "Ошибка соединения");
        return;
      }

      if (modeRef.current === "public") {
        handlePublicEvent(event, payload);
      } else {
        handleOwnerEvent(event, payload);
      }
    }

    function handlePublicEvent(event: WsEventName, payload: unknown) {
      const currentSlug = slugRef.current;
      if (!currentSlug) return;
      const queryKey = ["list-public", currentSlug];

      switch (event) {
        case "reservation.changed": {
          const p = payload as WsReservationPayload;
          queryClient.setQueryData<PublicList>(queryKey, (old) => {
            if (!old) return old;
            return {
              ...old,
              items: old.items.map((item) =>
                item.id === p.item_id
                  ? {
                      ...item,
                      is_reserved: p.is_reserved,
                      ...(p.reserved_by_me !== undefined
                        ? { reserved_by_me: p.reserved_by_me }
                        : {}),
                      ...(p.reserver_name !== undefined
                        ? { reserver_name: p.reserver_name }
                        : {}),
                    }
                  : item
              ),
            };
          });
          break;
        }
        case "contribution.added":
        case "contribution.removed": {
          const p = payload as WsContributionPayload;
          queryClient.setQueryData<PublicList>(queryKey, (old) => {
            if (!old) return old;
            return {
              ...old,
              items: old.items.map((item) =>
                item.id === p.item_id
                  ? { ...item, total_contributed: p.total_contributed }
                  : item
              ),
            };
          });
          break;
        }
        case "item.created": {
          const p = payload as { item_id: string; item: PublicItem };
          const newItem: PublicItem = {
            is_reserved: false,
            total_contributed: "0",
            reserved_by_me: false,
            reserver_name: null,
            my_contributions: [],
            ...p.item,
          };
          queryClient.setQueryData<PublicList>(queryKey, (old) => {
            if (!old) return old;
            if (old.items.some((item) => item.id === newItem.id)) return old;
            return { ...old, items: [...old.items, newItem] };
          });
          break;
        }
        case "item.updated": {
          const p = payload as { item_id: string; item: WsItemPayload };
          queryClient.setQueryData<PublicList>(queryKey, (old) => {
            if (!old) return old;
            return {
              ...old,
              items: old.items.map((item) =>
                item.id === p.item_id ? { ...item, ...p.item } : item
              ),
            };
          });
          break;
        }
        case "item.deleted": {
          const p = payload as { item_id: string };
          queryClient.setQueryData<PublicList>(queryKey, (old) => {
            if (!old) return old;
            return {
              ...old,
              items: old.items.filter((item) => item.id !== p.item_id),
            };
          });
          break;
        }
        case "item.reordered": {
          const p = payload as { item_ids: string[] };
          queryClient.setQueryData<PublicList>(queryKey, (old) => {
            if (!old) return old;
            const positionMap = new Map(
              p.item_ids.map((id, idx) => [id, idx])
            );
            const updatedItems = old.items
              .map((item) =>
                positionMap.has(item.id)
                  ? { ...item, position: positionMap.get(item.id)! }
                  : item
              )
              .sort((a, b) => a.position - b.position);
            return { ...old, items: updatedItems };
          });
          break;
        }
        case "list.updated": {
          const p = payload as { list: WsListPayload };
          queryClient.setQueryData<PublicList>(queryKey, (old) => {
            if (!old) return old;
            return { ...old, ...p.list } as PublicList;
          });
          break;
        }
        default:
          break;
      }
    }

    function handleOwnerEvent(event: WsEventName, payload: unknown) {
      const currentListId = listIdRef.current;
      if (!currentListId) return;
      const queryKey = ["list", currentListId];

      switch (event) {
        case "item.created": {
          const p = payload as { item_id: string; item: Item };
          queryClient.setQueryData<ListWithItems>(queryKey, (old) => {
            if (!old) return old;
            if (old.items.some((item) => item.id === p.item_id)) return old;
            return { ...old, items: [...old.items, p.item] };
          });
          break;
        }
        case "item.updated": {
          const p = payload as { item_id: string; item: Partial<Item> };
          queryClient.setQueryData<ListWithItems>(queryKey, (old) => {
            if (!old) return old;
            return {
              ...old,
              items: old.items.map((item) =>
                item.id === p.item_id ? { ...item, ...p.item } : item
              ),
            };
          });
          break;
        }
        case "item.deleted": {
          const p = payload as { item_id: string };
          queryClient.setQueryData<ListWithItems>(queryKey, (old) => {
            if (!old) return old;
            return {
              ...old,
              items: old.items.filter((item) => item.id !== p.item_id),
            };
          });
          break;
        }
        case "item.reordered": {
          const p = payload as { item_ids: string[] };
          queryClient.setQueryData<ListWithItems>(queryKey, (old) => {
            if (!old) return old;
            const positionMap = new Map(
              p.item_ids.map((id, idx) => [id, idx])
            );
            const updatedItems = old.items
              .map((item) =>
                positionMap.has(item.id)
                  ? { ...item, position: positionMap.get(item.id)! }
                  : item
              )
              .sort((a, b) => a.position - b.position);
            return { ...old, items: updatedItems };
          });
          break;
        }
        case "list.updated": {
          const p = payload as { list: WsListPayload };
          queryClient.setQueryData<ListWithItems>(queryKey, (old) => {
            if (!old) return old;
            return { ...old, ...p.list } as ListWithItems;
          });
          break;
        }
        default:
          break;
      }
    }

    connect();

    return () => {
      destroyed = true;
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (ws) {
        // Remove handlers so onclose doesn't trigger reconnect
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        ws.onopen = null;
        ws.close();
        ws = null;
      }
    };
  }, [slug, queryClient]);
}
