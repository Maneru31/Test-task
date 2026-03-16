import Link from "next/link";
import { CalendarIcon, SettingsIcon, GiftIcon } from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { ShareButton } from "./ShareButton";
import { Button } from "@/components/ui/button";
import type { WishList } from "@/types";

const OCCASION_LABELS: Record<string, string> = {
  birthday: "День рождения 🎂",
  new_year: "Новый год 🎉",
  wedding: "Свадьба 💍",
  other: "Другое ✨",
};

const OCCASION_COLORS: Record<string, string> = {
  birthday: "bg-pink-100 text-pink-700",
  new_year: "bg-blue-100 text-blue-700",
  wedding: "bg-purple-100 text-purple-700",
  other: "bg-emerald-100 text-emerald-700",
};

interface ListHeaderProps {
  list: WishList;
  itemCount: number;
}

export function ListHeader({ list, itemCount }: ListHeaderProps) {
  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-pink-500/5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{list.title}</h1>
            {list.occasion && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${OCCASION_COLORS[list.occasion] ?? "bg-muted text-muted-foreground"}`}>
                {OCCASION_LABELS[list.occasion] ?? list.occasion}
              </span>
            )}
          </div>

          {list.description && (
            <p className="mb-3 text-sm text-muted-foreground">{list.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 font-medium text-primary">
              <GiftIcon className="size-4" />
              {itemCount} {itemCount === 1 ? "подарок" : itemCount < 5 ? "подарка" : "подарков"}
            </span>
            {list.occasion_date && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarIcon className="size-4" />
                {formatDate(list.occasion_date)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ShareButton slug={list.public_slug} />
          <Link href={`/lists/${list.id}/settings`}>
            <Button variant="outline" size="icon" className="border-primary/20 hover:bg-primary/5">
              <SettingsIcon className="text-primary" />
              <span className="sr-only">Настройки списка</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
