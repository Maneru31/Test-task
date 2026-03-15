"use client";

import { ExternalLinkIcon } from "lucide-react";
import { formatPrice } from "@/lib/formatters";
import { ReserveButton } from "@/components/reservation/ReserveButton";
import { ReservationBadge } from "@/components/reservation/ReservationBadge";
import { ContributeButton } from "@/components/contribution/ContributeButton";
import { ProgressBar } from "@/components/contribution/ProgressBar";
import type { PublicItem } from "@/types";

interface WishItemProps {
  item: PublicItem;
  slug: string;
  callerRole: "owner" | "viewer";
}

export function WishItem({ item, slug, callerRole }: WishItemProps) {
  const isOwner = callerRole === "owner";
  const hasGroupFund = item.is_group_fund;
  const totalContributed = parseFloat(item.total_contributed ?? "0") || 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4">
      <div className="flex gap-3">
        {/* Image */}
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="size-16 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="size-16 shrink-0 rounded-lg bg-muted" />
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate font-medium">{item.name}</p>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLinkIcon className="size-3.5" />
                  </a>
                )}
              </div>
              {item.description && (
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {item.description}
                </p>
              )}
              {item.price && (
                <p className="mt-1 text-sm font-medium">
                  {formatPrice(item.price, item.currency)}
                </p>
              )}
            </div>

            {/* Reservation status badge (only if reserved) */}
            {item.is_reserved && (
              <div className="shrink-0">
                <ReservationBadge
                  reserverName={!isOwner ? item.reserver_name : undefined}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Group fund progress */}
      {hasGroupFund && totalContributed >= 0 && (
        <ProgressBar
          totalContributed={item.total_contributed}
          targetAmount={item.target_amount}
          progressPct={
            item.target_amount
              ? Math.min(
                  (totalContributed / parseFloat(item.target_amount)) * 100,
                  100
                )
              : null
          }
          currency={item.currency}
        />
      )}

      {/* Actions — only for viewers */}
      {!isOwner && (
        <div className="flex flex-wrap gap-2">
          <ReserveButton item={item} slug={slug} />
          {hasGroupFund && <ContributeButton item={item} slug={slug} />}
        </div>
      )}
    </div>
  );
}
