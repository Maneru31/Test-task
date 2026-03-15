"use client";

import { CheckIcon } from "lucide-react";

interface ReservationBadgeProps {
  reserverName?: string | null;
}

export function ReservationBadge({ reserverName }: ReservationBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
      <CheckIcon className="size-3" />
      {reserverName ? `Резервирует ${reserverName}` : "Зарезервировано"}
    </span>
  );
}
