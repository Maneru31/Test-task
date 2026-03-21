export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
}

export interface WishList {
  id: string;
  title: string;
  description: string | null;
  occasion: 'birthday' | 'new_year' | 'wedding' | 'other' | null;
  occasion_date: string | null;
  public_slug: string;
  is_active: boolean;
  created_at: string;
  item_count: number;
}

export interface Item {
  id: string;
  list_id: string;
  name: string;
  description: string | null;
  url: string | null;
  image_url: string | null;
  price: number | null;
  currency: string;
  is_group_fund: boolean;
  target_amount: number | null;
  position: number;
  is_reserved: boolean;
  reserved_by_me: boolean;
  reserver_name: string | null;
  total_contributed: number | null;
  my_contribution_id: string | null;
}

export interface PublicItem extends Item {
  contributions_summary?: {
    total_contributed: number;
    contributors_count: number;
    target_amount: number | null;
  };
}

export interface Contribution {
  id: string;
  amount: number;
  note: string | null;
  contributor_display_name: string;
  contributed_at: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface GuestSessionResponse {
  guest_token: string;
  display_name: string;
}

export interface ScrapeResult {
  title: string | null;
  image_url: string | null;
  price: number | null;
  currency: string | null;
}

export type WsEvent =
  | { type: 'item.created'; data: Item }
  | { type: 'item.updated'; data: Item }
  | { type: 'item.deleted'; data: { item_id: string } }
  | { type: 'item.reordered'; data: { items: Item[] } }
  | { type: 'reservation.changed'; data: { item_id: string; is_reserved: boolean; reserver_name: string | null } }
  | { type: 'contribution.added'; data: { item_id: string; total_contributed: number } }
  | { type: 'contribution.removed'; data: { item_id: string; total_contributed: number } }
  | { type: 'list.updated'; data: Partial<WishList> };
