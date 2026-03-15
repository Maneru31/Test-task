import Link from "next/link";
import { CalendarIcon, SettingsIcon } from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { ShareButton } from "./ShareButton";
import { Button } from "@/components/ui/button";
import type { WishList } from "@/types";

const OCCASION_LABELS: Record<string, string> = {
  birthday: "День рождения",
  new_year: "Новый год",
  wedding: "Свадьба",
  other: "Другое",
};

interface ListHeaderProps {
  list: WishList;
  itemCount: number;
}

export function ListHeader({ list, itemCount }: ListHeaderProps) {
  return (
    <div className="mb-8">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{list.title}</h1>
            {list.occasion && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                {OCCASION_LABELS[list.occasion] ?? list.occasion}
              </span>
            )}
          </div>

          {list.description && (
            <p className="mb-2 text-sm text-muted-foreground">{list.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span>{itemCount} {itemCount === 1 ? "подарок" : itemCount < 5 ? "подарка" : "подарков"}</span>
            {list.occasion_date && (
              <span className="flex items-center gap-1">
                <CalendarIcon className="size-3.5" />
                {formatDate(list.occasion_date)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ShareButton slug={list.public_slug} />
          <Link href={`/lists/${list.id}/settings`}>
            <Button variant="outline" size="icon">
              <SettingsIcon />
              <span className="sr-only">Настройки списка</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
