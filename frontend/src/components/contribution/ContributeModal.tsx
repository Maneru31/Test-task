"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addContribution } from "@/lib/publicApi";
import type { PublicItem, PublicList } from "@/types";

interface ContributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PublicItem;
  slug: string;
}

export function ContributeModal({ open, onOpenChange, item, slug }: ContributeModalProps) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();

  const total = parseFloat(item.total_contributed ?? "0") || 0;
  const target = item.target_amount ? parseFloat(item.target_amount) : null;
  const enteredAmount = parseFloat(amount) || 0;
  const wouldExceed = target !== null && enteredAmount > 0 && total + enteredAmount > target;

  const mutation = useMutation({
    mutationFn: () =>
      addContribution(item.id, {
        amount: enteredAmount.toFixed(2),
        note: note.trim() || null,
      }),
    onSuccess: (contribution) => {
      queryClient.setQueryData<PublicList>(["list-public", slug], (old) => {
        if (!old) return old;
        const newTotal = (total + parseFloat(contribution.amount)).toFixed(2);
        return {
          ...old,
          items: old.items.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  total_contributed: newTotal,
                  my_contributions: [
                    ...(i.my_contributions ?? []),
                    {
                      id: contribution.id,
                      amount: contribution.amount,
                      note: contribution.note,
                      contributed_at: contribution.contributed_at,
                    },
                  ],
                }
              : i
          ),
        };
      });
      toast.success("Взнос добавлен");
      onOpenChange(false);
      setAmount("");
      setNote("");
      // Trigger progress bar re-render with updated data
      queryClient.invalidateQueries({ queryKey: ["list-public", slug] });
    },
    onError: () => {
      toast.error("Не удалось добавить взнос");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!enteredAmount || enteredAmount <= 0) return;
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Внести взнос</DialogTitle>
          <DialogDescription>
            {item.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contribute-amount">Сумма взноса</Label>
            <Input
              id="contribute-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              autoFocus
              required
            />
          </div>

          {wouldExceed && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Взнос превысит цель сбора. Вы всё равно можете его внести.
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contribute-note">Сообщение (необязательно)</Label>
            <Input
              id="contribute-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Пожелание или комментарий"
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={!enteredAmount || enteredAmount <= 0 || mutation.isPending}
            >
              {mutation.isPending ? "Отправка..." : "Внести"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
