import api from "./api";
import type { WishList, Item, ListCreate, ListUpdate, ItemCreate, ItemUpdate, ReorderRequest, ScrapeResult } from "@/types";

// ─── Owner list view ──────────────────────────────────────────────────────────

export interface ListWithItems extends WishList {
  items: Item[];
}

// ─── Delete response types ────────────────────────────────────────────────────

export type DeleteWarning = "has_contributions" | "has_reservation" | "has_both";

export interface DeleteCheckResponse {
  warning: DeleteWarning;
}

export interface DeleteConfirmResponse {
  deleted: boolean;
  soft: boolean;
}

// ─── Lists API ────────────────────────────────────────────────────────────────

export async function getLists(): Promise<WishList[]> {
  const res = await api.get<WishList[]>("/lists");
  return res.data;
}

export async function getList(listId: string): Promise<ListWithItems> {
  const res = await api.get<ListWithItems>(`/lists/${listId}`);
  return res.data;
}

export async function createList(data: ListCreate): Promise<WishList> {
  const res = await api.post<WishList>("/lists", data);
  return res.data;
}

export async function updateList(listId: string, data: ListUpdate): Promise<WishList> {
  const res = await api.patch<WishList>(`/lists/${listId}`, data);
  return res.data;
}

export async function deleteList(listId: string): Promise<void> {
  await api.delete(`/lists/${listId}`);
}

// ─── Items API ────────────────────────────────────────────────────────────────

export async function createItem(listId: string, data: ItemCreate): Promise<Item> {
  const res = await api.post<Item>(`/lists/${listId}/items`, data);
  return res.data;
}

export async function updateItem(listId: string, itemId: string, data: ItemUpdate): Promise<Item> {
  const res = await api.patch<Item>(`/lists/${listId}/items/${itemId}`, data);
  return res.data;
}

/**
 * Phase 1: returns null on 204 (no dependencies), or DeleteCheckResponse with warning.
 */
export async function deleteItemCheck(
  listId: string,
  itemId: string
): Promise<DeleteCheckResponse | null> {
  const res = await api.delete<DeleteCheckResponse | null>(`/lists/${listId}/items/${itemId}`);
  return res.status === 204 ? null : res.data;
}

/**
 * Phase 2: confirm deletion with ?confirm=true.
 */
export async function deleteItemConfirm(
  listId: string,
  itemId: string
): Promise<DeleteConfirmResponse> {
  const res = await api.delete<DeleteConfirmResponse>(
    `/lists/${listId}/items/${itemId}?confirm=true`
  );
  return res.data;
}

export async function reorderItems(listId: string, itemIds: string[]): Promise<void> {
  const body: ReorderRequest = { item_ids: itemIds };
  await api.patch(`/lists/${listId}/items/reorder`, body);
}

// ─── Scraper API ──────────────────────────────────────────────────────────────

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const res = await api.post<ScrapeResult>("/util/scrape", { url });
  return res.data;
}
