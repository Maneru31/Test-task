import Link from "next/link";
import { CalendarIcon, SettingsIcon, GiftIcon } from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { ShareButton } from "./ShareButton";
import type { WishList } from "@/types";

const OCCASION_LABELS: Record<string, string> = {
  birthday: "День рождения 🎂",
  new_year: "Новый год 🎉",
  wedding: "Свадьба 💍",
  other: "Другое ✨",
};

const OCCASION_COLORS: Record<string, string> = {
  birthday: "bg-pink-500/10 text-pink-400",
  new_year: "bg-blue-500/10 text-blue-400",
  wedding: "bg-purple-500/10 text-purple-400",
  other: "bg-emerald-500/10 text-emerald-400",
};

interface ListHeaderProps {
  list: WishList;
  itemCount: number;
}

export function ListHeader({ list, itemCount }: ListHeaderProps) {
  return (
    <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{list.title}</h1>
            {list.occasion && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${OCCASION_COLORS[list.occasion] ?? "bg-zinc-800 text-zinc-400"}`}>
                {OCCASION_LABELS[list.occasion] ?? list.occasion}
              </span>
            )}
          </div>

          {list.description && (
            <p className="mb-3 text-sm text-zinc-400">{list.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 font-medium text-orange-400">
              <GiftIcon className="size-4" />
              {itemCount} {itemCount === 1 ? "подарок" : itemCount < 5 ? "подарка" : "подарков"}
            </span>
            {list.occasion_date && (
              <span className="flex items-center gap-1.5 text-zinc-500">
                <CalendarIcon className="size-4" />
                {formatDate(list.occasion_date)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ShareButton slug={list.public_slug} />
          <Link
            href={`/lists/${list.id}/settings`}
            className="flex size-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 transition-all hover:border-orange-500/50 hover:text-orange-400"
          >
            <SettingsIcon className="size-4" />
            <span className="sr-only">Настройки</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
