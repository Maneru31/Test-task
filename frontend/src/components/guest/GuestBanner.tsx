"use client";

import { InfoIcon } from "lucide-react";
import { useGuestSession } from "@/hooks/useGuestSession";

export function GuestBanner() {
  const { guestName } = useGuestSession();

  if (!guestName) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
      <InfoIcon className="mt-0.5 size-4 shrink-0" />
      <p>
        Вы просматриваете как <span className="font-medium">{guestName}</span>.
        Не очищайте данные браузера — иначе потеряете доступ к своим резервациям.
      </p>
    </div>
  );
}
