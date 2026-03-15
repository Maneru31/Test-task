"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { createList } from "@/lib/listsApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
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

interface CreateListModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateListModal({ open: controlledOpen, onOpenChange: controlledOnOpenChange }: CreateListModalProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);

  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [occasion, setOccasion] = useState<Occasion | "">("");
  const [occasionDate, setOccasionDate] = useState("");

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () =>
      createList({
        title: title.trim(),
        description: description.trim() || null,
        occasion: occasion || null,
        occasion_date: occasionDate || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      toast.success("Список создан");
      handleClose();
    },
    onError: () => {
      toast.error("Не удалось создать список");
    },
  });

  function handleClose() {
    setOpen(false);
    setTitle("");
    setDescription("");
    setOccasion("");
    setOccasionDate("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusIcon />
        Создать список
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Новый вишлист</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Название *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Мой день рождения"
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Описание</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Необязательно"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="occasion">Повод</Label>
            <select
              id="occasion"
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
              <Label htmlFor="occasion_date">Дата</Label>
              <Input
                id="occasion_date"
                type="date"
                value={occasionDate}
                onChange={(e) => setOccasionDate(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={!title.trim() || createMutation.isPending}>
              {createMutation.isPending ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
