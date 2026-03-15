import { useGuestContext } from "@/contexts/GuestContext";

export function useGuestSession() {
  return useGuestContext();
}
