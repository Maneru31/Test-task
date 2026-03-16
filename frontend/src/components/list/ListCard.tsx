"use client";

import Link from "next/link";
import { CalendarIcon, GiftIcon, Trash2Icon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteList } from "@/lib/listsApi";
import { formatDate } from "@/lib/formatters";
import type { ListSummary } from "@/types";

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

interface ListCardProps {
  list: ListSummary;
}

export function ListCard({ list }: ListCardProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteList(list.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      toast.success("Список удалён");
    },
    onError: () => toast.error("Не удалось удалить список"),
  });

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Удалить список «${list.title}»?`)) return;
    deleteMutation.mutate();
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition-all hover:border-orange-500/40 hover:bg-zinc-800/80">
      {/* Orange top accent */}
      <div className="h-0.5 w-full bg-gradient-to-r from-orange-500 to-amber-400 opacity-0 transition-opacity group-hover:opacity-100" />

      <Link href={`/lists/${list.id}`} className="block p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-semibold leading-tight text-white">{list.title}</h3>
          {list.occasion && (
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${OCCASION_COLORS[list.occasion] ?? "bg-zinc-800 text-zinc-400"}`}>
              {OCCASION_LABELS[list.occasion] ?? list.occasion}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-zinc-500">
          <span className="flex items-center gap-1.5">
            <GiftIcon className="size-4 text-orange-500" />
            <span className="font-medium text-zinc-300">{list.item_count}</span>
            {" "}подарк{list.item_count === 1 ? "" : list.item_count < 5 ? "а" : "ов"}
          </span>
          {list.occasion_date && (
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="size-4" />
              {formatDate(list.occasion_date)}
            </span>
          )}
        </div>
      </Link>

      <button
        onClick={handleDelete}
        disabled={deleteMutation.isPending}
        aria-label="Удалить список"
        className="absolute right-3 top-4 rounded-lg p-1.5 text-zinc-700 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100 disabled:opacity-50"
      >
        <Trash2Icon className="size-4" />
      </button>
    </div>
  );
}
