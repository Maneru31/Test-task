"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { getList, updateList, deleteList } from "@/lib/listsApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Occasion } from "@/types";

const OCCASIONS: { value: Occasion; label: string }[] = [
  { value: "birthday", label: "День рождения" },
  { value: "new_year", label: "Новый год" },
  { value: "wedding", label: "Свадьба" },
  { value: "other", label: "Другое" },
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
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8 text-center text-muted-foreground">
        Список не найден
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/lists/${listId}`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeftIcon />
            <span className="sr-only">Назад</span>
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Настройки списка</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="s-title">Название *</Label>
          <Input
            id="s-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название вишлиста"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="s-description">Описание</Label>
          <Input
            id="s-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Необязательно"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="s-occasion">Повод</Label>
          <select
            id="s-occasion"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value as Occasion | "")}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">Не выбрано</option>
            {OCCASIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {occasion && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-occasion-date">Дата</Label>
            <Input
              id="s-occasion-date"
              type="date"
              value={occasionDate}
              onChange={(e) => setOccasionDate(e.target.value)}
            />
          </div>
        )}

        <Button type="submit" disabled={!title.trim() || updateMutation.isPending}>
          {updateMutation.isPending ? "Сохранение..." : "Сохранить изменения"}
        </Button>
      </form>

      {/* Danger zone */}
      <div className="mt-10 rounded-xl border border-destructive/30 p-4">
        <h2 className="mb-2 text-sm font-semibold text-destructive">Опасная зона</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Удаление списка необратимо. Все товары и данные о взносах будут удалены.
        </p>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? "Удаление..." : "Удалить список"}
        </Button>
      </div>
    </div>
  );
}
