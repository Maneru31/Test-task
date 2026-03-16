"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeftIcon, SettingsIcon, CalendarIcon, TagIcon, AlignLeftIcon, TypeIcon, Trash2Icon, SaveIcon } from "lucide-react";
import Link from "next/link";
import { getList, updateList, deleteList } from "@/lib/listsApi";
import type { Occasion } from "@/types";

const OCCASIONS: { value: Occasion; label: string; emoji: string }[] = [
  { value: "birthday", label: "День рождения", emoji: "🎂" },
  { value: "new_year", label: "Новый год", emoji: "🎉" },
  { value: "wedding", label: "Свадьба", emoji: "💍" },
  { value: "other", label: "Другое", emoji: "✨" },
];

interface SettingsPageProps {
  params: { listId: string };
}

export default function ListSettingsPage({ params }: SettingsPageProps) {
  const { listId } = params;
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["list", listId],
    queryFn: () => getList(listId),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [occasion, setOccasion] = useState<Occasion | "">("");
  const [occasionDate, setOccasionDate] = useState("");

  useEffect(() => {
    if (data) {
      setTitle(data.title);
      setDescription(data.description ?? "");
      setOccasion((data.occasion as Occasion | null) ?? "");
      setOccasionDate(data.occasion_date ?? "");
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateList(listId, {
        title: title.trim() || null,
        description: description.trim() || null,
        occasion: occasion || null,
        occasion_date: occasionDate || null,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["list", listId], (old: typeof data) =>
        old ? { ...old, ...updated } : old
      );
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      toast.success("Список обновлён");
    },
    onError: () => {
      toast.error("Не удалось обновить список");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteList(listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      toast.success("Список удалён");
      router.push("/dashboard");
    },
    onError: () => {
      toast.error("Не удалось удалить список");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    updateMutation.mutate();
  }

  function handleDelete() {
    if (!confirm(`Удалить список «${title}»? Это действие нельзя отменить.`)) return;
    deleteMutation.mutate();
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-zinc-800 mb-8" />
        <div className="h-96 animate-pulse rounded-2xl bg-zinc-900" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-zinc-500">
        Список не найден
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link
          href={`/lists/${listId}`}
          className="flex size-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400 transition-all hover:border-orange-500/50 hover:text-orange-400"
        >
          <ArrowLeftIcon className="size-4" />
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20">
            <SettingsIcon className="size-4 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Настройки списка</h1>
            <p className="text-xs text-zinc-500 truncate max-w-xs">{data.title}</p>
          </div>
        </div>
      </div>

      {/* Main form card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 mb-6">
        <h2 className="mb-5 text-sm font-semibold text-zinc-400 uppercase tracking-wider">Основная информация</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Title */}
          <div className="flex flex-col gap-2">
            <label htmlFor="s-title" className="flex items-center gap-1.5 text-sm font-medium text-zinc-300">
              <TypeIcon className="size-3.5 text-zinc-500" />
              Название <span className="text-orange-500">*</span>
            </label>
            <input
              id="s-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название вишлиста"
              required
              className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 text-sm text-white placeholder:text-zinc-600 outline-none transition-all focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <label htmlFor="s-description" className="flex items-center gap-1.5 text-sm font-medium text-zinc-300">
              <AlignLeftIcon className="size-3.5 text-zinc-500" />
              Описание
            </label>
            <input
              id="s-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Необязательно"
              className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 text-sm text-white placeholder:text-zinc-600 outline-none transition-all focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          {/* Occasion */}
          <div className="flex flex-col gap-2">
            <label htmlFor="s-occasion" className="flex items-center gap-1.5 text-sm font-medium text-zinc-300">
              <TagIcon className="size-3.5 text-zinc-500" />
              Повод
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <button
                type="button"
                onClick={() => setOccasion("")}
                className={`h-11 rounded-xl border text-sm font-medium transition-all ${
                  occasion === ""
                    ? "border-orange-500/60 bg-orange-500/10 text-orange-400"
                    : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                }`}
              >
                Не выбрано
              </button>
              {OCCASIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setOccasion(o.value)}
                  className={`h-11 rounded-xl border text-sm font-medium transition-all flex flex-col items-center justify-center gap-0.5 ${
                    occasion === o.value
                      ? "border-orange-500/60 bg-orange-500/10 text-orange-400"
                      : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  <span className="text-base leading-none">{o.emoji}</span>
                  <span className="text-xs">{o.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          {occasion && (
            <div className="flex flex-col gap-2">
              <label htmlFor="s-occasion-date" className="flex items-center gap-1.5 text-sm font-medium text-zinc-300">
                <CalendarIcon className="size-3.5 text-zinc-500" />
                Дата события
              </label>
              <input
                id="s-occasion-date"
                type="date"
                value={occasionDate}
                onChange={(e) => setOccasionDate(e.target.value)}
                className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 text-sm text-white outline-none transition-all focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 [color-scheme:dark]"
              />
            </div>
          )}

          {/* Save button */}
          <button
            type="submit"
            disabled={!title.trim() || updateMutation.isPending}
            className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-400 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SaveIcon className="size-4" />
            {updateMutation.isPending ? "Сохранение..." : "Сохранить изменения"}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
            <Trash2Icon className="size-4 text-red-400" />
          </div>
          <div className="flex-1">
            <h2 className="mb-1 text-sm font-semibold text-red-400">Опасная зона</h2>
            <p className="mb-4 text-xs text-zinc-500">
              Удаление списка необратимо. Все товары и данные о взносах будут удалены навсегда.
            </p>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-all hover:bg-red-500/20 hover:border-red-500/50 active:scale-[0.98] disabled:opacity-50"
            >
              <Trash2Icon className="size-4" />
              {deleteMutation.isPending ? "Удаление..." : "Удалить список"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
