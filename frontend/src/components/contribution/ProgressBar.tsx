"use client";

import { motion } from "framer-motion";
import { formatPrice } from "@/lib/formatters";

interface ProgressBarProps {
  totalContributed: string;
  targetAmount: string | null;
  progressPct: number | null;
  currency?: string;
}

export function ProgressBar({
  totalContributed,
  targetAmount,
  progressPct,
  currency = "RUB",
}: ProgressBarProps) {
  const pct = Math.min(progressPct ?? 0, 100);

  return (
    <div className="flex flex-col gap-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatPrice(totalContributed, currency)} собрано</span>
        {targetAmount && (
          <span>из {formatPrice(targetAmount, currency)}</span>
        )}
      </div>
    </div>
  );
}
