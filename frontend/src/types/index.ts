// ─── Auth / User ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RefreshResponse {
  access_token: string;
  token_type: string;
}

export interface GuestTokenResponse {
  guest_token: string;
  display_name: string;
}

// ─── Lists ────────────────────────────────────────────────────────────────────

export type Occasion = "birthday" | "new_year" | "wedding" | "other";

export interface WishList {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  occasion: Occasion | null;
  occasion_date: string | null; // ISO date "YYYY-MM-DD"
  public_slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListSummary {
  id: string;
  title: string;
  occasion: Occasion | null;
  occasion_date: string | null;
  public_slug: string;
  is_active: boolean;
  item_count: number;
  created_at: string;
}

export interface ListCreate {
  title: string;
  description?: string | null;
  occasion?: string | null;
  occasion_date?: string | null;
}

export interface ListUpdate {
  title?: string | null;
  description?: string | null;
  occasion?: string | null;
  occasion_date?: string | null;
  is_active?: boolean | null;
}

// ─── Items ────────────────────────────────────────────────────────────────────

export interface Item {
  id: string;
  list_id: string;
  name: string;
  description: string | null;
  url: string | null;
  image_url: string | null;
  price: string | null; // Decimal as string from API
  currency: string;
  is_group_fund: boolean;
  target_amount: string | null;
  position: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemCreate {
  name: string;
  description?: string | null;
  url?: string | null;
  image_url?: string | null;
  price?: string | null;
  currency?: string;
  is_group_fund?: boolean;
  target_amount?: string | null;
}

export interface ItemUpdate {
  name?: string | null;
  description?: string | null;
  url?: string | null;
  image_url?: string | null;
  price?: string | null;
  currency?: string | null;
  is_group_fund?: boolean | null;
  target_amount?: string | null;
}

export interface ReorderRequest {
  item_ids: string[];
}

// ─── Public list (viewer / owner view) ───────────────────────────────────────

export interface MyContribution {
  id: string;
  amount: string; // Decimal as string
  note: string | null;
  contributed_at: string;
}

export interface PublicItem {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  image_url: string | null;
  price: string | null;
  currency: string;
  is_group_fund: boolean;
  target_amount: string | null;
  position: number;
  is_reserved: boolean;
  total_contributed: string;
  // viewer-only fields (absent when caller_role === "owner")
  reserved_by_me?: boolean | null;
  reserver_name?: string | null;
  my_contributions?: MyContribution[] | null;
}

export interface PublicList {
  id: string;
  title: string;
  description: string | null;
  occasion: Occasion | null;
  occasion_date: string | null;
  public_slug: string;
  owner_display_name: string;
  caller_role: "owner" | "viewer";
  items: PublicItem[];
}

// ─── Reservations ─────────────────────────────────────────────────────────────

export interface Reservation {
  id: string;
  item_id: string;
  reserved_at: string;
}

// ─── Contributions ────────────────────────────────────────────────────────────

export interface Contribution {
  id: string;
  item_id: string;
  amount: string;
  note: string | null;
  contributed_at: string;
}

export interface ContributionCreate {
  amount: string;
  note?: string | null;
}

export interface ContributionSummary {
  total_contributed: string;
  target_amount: string | null;
  progress_pct: number | null;
  contribution_count: number;
  // viewer-only
  my_contributions?: MyContribution[] | null;
}

// ─── Scraper ──────────────────────────────────────────────────────────────────

export interface ScrapeResult {
  title: string | null;
  image_url: string | null;
  price: string | null;
  currency: string | null;
}

// ─── WebSocket events ─────────────────────────────────────────────────────────

export type WsEventName =
  | "connected"
  | "item.created"
  | "item.updated"
  | "item.deleted"
  | "item.reordered"
  | "list.updated"
  | "reservation.changed"
  | "contribution.added"
  | "contribution.removed"
  | "error";

export interface WsEvent<T = unknown> {
  event: WsEventName;
  payload: T;
  ts: string;
}

export interface WsConnectedPayload {
  list_id: string;
  viewer_role: "owner" | "viewer";
}

export interface WsReservationPayload {
  item_id: string;
  is_reserved: boolean;
  reserved_by_me?: boolean;
  reserver_name?: string;
}

export interface WsContributionPayload {
  item_id: string;
  total_contributed: string;
  progress_pct: number | null;
  contribution_count: number;
}

export interface WsItemPayload extends Partial<PublicItem> {
  id: string;
}

export interface WsReorderPayload {
  items: Array<{ id: string; position: number }>;
}

export interface WsListPayload {
  title?: string;
  description?: string | null;
  occasion?: string | null;
  occasion_date?: string | null;
}

// ─── API error ────────────────────────────────────────────────────────────────

export interface ApiError {
  detail: string | Array<{ loc: string[]; msg: string; type: string }>;
}
