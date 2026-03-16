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
  birthday: "bg-pink-100 text-pink-700",
  new_year: "bg-blue-100 text-blue-700",
  wedding: "bg-purple-100 text-purple-700",
  other: "bg-emerald-100 text-emerald-700",
};

const CARD_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-pink-500 to-rose-600",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
];

interface ListCardProps {
  list: ListSummary;
}

export function ListCard({ list }: ListCardProps) {
  const queryClient = useQueryClient();
  const gradientIdx = list.id.charCodeAt(0) % CARD_GRADIENTS.length;
  const gradient = CARD_GRADIENTS[gradientIdx];

  const deleteMutation = useMutation({
    mutationFn: () => deleteList(list.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      toast.success("Список удалён");
    },
    onError: () => {
      toast.error("Не удалось удалить список");
    },
  });

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Удалить список «${list.title}»?`)) return;
    deleteMutation.mutate();
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      {/* Gradient top bar */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${gradient}`} />

      <Link href={`/lists/${list.id}`} className="block p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-semibold leading-tight">{list.title}</h3>
          {list.occasion && (
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${OCCASION_COLORS[list.occasion] ?? "bg-muted text-muted-foreground"}`}>
              {OCCASION_LABELS[list.occasion] ?? list.occasion}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <GiftIcon className="size-4 text-primary" />
            <span className="font-medium text-foreground">{list.item_count}</span>
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
        className="absolute right-3 top-5 rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 disabled:opacity-50"
      >
        <Trash2Icon className="size-4" />
      </button>
    </div>
  );
}
