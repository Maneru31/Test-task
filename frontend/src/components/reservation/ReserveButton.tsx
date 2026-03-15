"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckIcon, LockIcon, UnlockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuestNameModal } from "@/components/guest/GuestNameModal";
import { reserveItem, releaseReservation } from "@/lib/publicApi";
import { useGuestSession } from "@/hooks/useGuestSession";
import type { PublicItem, PublicList } from "@/types";

interface ReserveButtonProps {
  item: PublicItem;
  slug: string;
}

export function ReserveButton({ item, slug }: ReserveButtonProps) {
  const { guestToken } = useGuestSession();
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const reserveMutation = useMutation({
    mutationFn: () => reserveItem(item.id),
    onSuccess: () => {
      queryClient.setQueryData<PublicList>(["list-public", slug], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((i) =>
            i.id === item.id ? { ...i, is_reserved: true, reserved_by_me: true } : i
          ),
        };
      });
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        toast.error("Подарок уже зарезервирован");
      } else {
        toast.error("Не удалось зарезервировать подарок");
      }
    },
  });

  const releaseMutation = useMutation({
    mutationFn: () => releaseReservation(item.id),
    onSuccess: () => {
      queryClient.setQueryData<PublicList>(["list-public", slug], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((i) =>
            i.id === item.id
              ? { ...i, is_reserved: false, reserved_by_me: false, reserver_name: null }
              : i
          ),
        };
      });
    },
    onError: () => {
      toast.error("Не удалось снять резервацию");
    },
  });

  function handleReserveClick() {
    if (!guestToken) {
      setGuestModalOpen(true);
      return;
    }
    reserveMutation.mutate();
  }

  function handleGuestSuccess() {
    // guest session created — retry reserve
    reserveMutation.mutate();
  }

  const isPending = reserveMutation.isPending || releaseMutation.isPending;

  // Viewer: item reserved by someone else
  if (item.is_reserved && !item.reserved_by_me) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-1.5 text-muted-foreground">
        <LockIcon className="size-3.5" />
        Зарезервировано
      </Button>
    );
  }

  // Viewer: item reserved by me — can release
  if (item.is_reserved && item.reserved_by_me) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => releaseMutation.mutate()}
        disabled={isPending}
        className="gap-1.5"
      >
        <CheckIcon className="size-3.5 text-green-600" />
        {isPending ? "Отмена..." : "Отменить резерв"}
      </Button>
    );
  }

  // Owner view — no reserve button (item.reserved_by_me is undefined/null for owner)
  // But if is_reserved is true without reserved_by_me we already show locked above
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleReserveClick}
        disabled={isPending}
        className="gap-1.5"
      >
        <UnlockIcon className="size-3.5" />
        {isPending ? "Резервирование..." : "Зарезервировать"}
      </Button>

      <GuestNameModal
        open={guestModalOpen}
        onOpenChange={setGuestModalOpen}
        onSuccess={handleGuestSuccess}
      />
    </>
  );
}
