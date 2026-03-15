import api from "./api";
import type { PublicList, Reservation, Contribution, ContributionCreate, ContributionSummary } from "@/types";

// ─── Public list ──────────────────────────────────────────────────────────────

export async function getPublicList(slug: string): Promise<PublicList> {
  const res = await api.get<PublicList>(`/lists/public/${slug}`);
  return res.data;
}

// ─── Reservations ─────────────────────────────────────────────────────────────

export async function reserveItem(itemId: string): Promise<Reservation> {
  const res = await api.post<Reservation>(`/items/${itemId}/reserve`);
  return res.data;
}

export async function releaseReservation(itemId: string): Promise<void> {
  await api.delete(`/items/${itemId}/reserve`);
}

// ─── Contributions ────────────────────────────────────────────────────────────

export async function addContribution(
  itemId: string,
  data: ContributionCreate
): Promise<Contribution> {
  const res = await api.post<Contribution>(`/items/${itemId}/contributions`, data);
  return res.data;
}

export async function getContributionSummary(itemId: string): Promise<ContributionSummary> {
  const res = await api.get<ContributionSummary>(`/items/${itemId}/contributions/summary`);
  return res.data;
}

export async function deleteContribution(
  itemId: string,
  contributionId: string
): Promise<void> {
  await api.delete(`/items/${itemId}/contributions/${contributionId}`);
}
