"use client";

import Link from "next/link";
import { CalendarIcon, GiftIcon, Trash2Icon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteList } from "@/lib/listsApi";
import { formatDate } from "@/lib/formatters";
import type { WishList } from "@/types";

const OCCASION_LABELS: Record<string, string> = {
  birthday: "День рождения",
  new_year: "Новый год",
  wedding: "Свадьба",
  other: "Другое",
};

interface ListCardProps {
  list: WishList;
}

export function ListCard({ list }: ListCardProps) {
  const queryClient = useQueryClient();

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
    <div className="group relative rounded-xl border border-border bg-background p-4 transition-shadow hover:shadow-md">
      <Link href={`/lists/${list.id}`} className="block">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight">{list.title}</h3>
          {list.occasion && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {OCCASION_LABELS[list.occasion] ?? list.occasion}
            </span>
          )}
        </div>

        {list.description && (
          <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{list.description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <GiftIcon className="size-3.5" />
            {/* item_count not available in WishList, shown as dash */}—
          </span>
          {list.occasion_date && (
            <span className="flex items-center gap-1">
              <CalendarIcon className="size-3.5" />
              {formatDate(list.occasion_date)}
            </span>
          )}
        </div>
      </Link>

      <button
        onClick={handleDelete}
        disabled={deleteMutation.isPending}
        aria-label="Удалить список"
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 disabled:opacity-50"
      >
        <Trash2Icon className="size-4" />
      </button>
    </div>
  );
}
