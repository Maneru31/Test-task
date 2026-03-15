"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangleIcon } from "lucide-react";
import { deleteItemCheck, deleteItemConfirm } from "@/lib/listsApi";
import type { DeleteWarning } from "@/lib/listsApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const WARNING_MESSAGES: Record<DeleteWarning, string> = {
  has_contributions: "К этому подарку есть взносы. После удаления данные о взносах будут потеряны.",
  has_reservation: "Этот подарок зарезервирован. Резервация будет снята.",
  has_both: "К этому подарку есть взносы и он зарезервирован. Все данные будут потеряны.",
};

interface DeleteConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  itemId: string;
  itemName: string;
}

export function DeleteConfirmModal({
  open,
  onOpenChange,
  listId,
  itemId,
  itemName,
}: DeleteConfirmModalProps) {
  const [warning, setWarning] = useState<DeleteWarning | null>(null);
  const queryClient = useQueryClient();

  function handleSuccess() {
    queryClient.invalidateQueries({ queryKey: ["list", listId] });
    toast.success("Подарок удалён");
    onOpenChange(false);
    setWarning(null);
  }

  // Phase 1: check for dependencies
  const checkMutation = useMutation({
    mutationFn: () => deleteItemCheck(listId, itemId),
    onSuccess: (result) => {
      if (result === null) {
        // No dependencies — item deleted immediately (204)
        handleSuccess();
      } else {
        setWarning(result.warning);
      }
    },
    onError: () => {
      toast.error("Не удалось удалить подарок");
    },
  });

  // Phase 2: confirm deletion
  const confirmMutation = useMutation({
    mutationFn: () => deleteItemConfirm(listId, itemId),
    onSuccess: handleSuccess,
    onError: () => {
      toast.error("Не удалось удалить подарок");
    },
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      setWarning(null);
    }
    onOpenChange(next);
  }

  const isPending = checkMutation.isPending || confirmMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Удалить подарок?</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            «{itemName}» будет удалён.
          </p>

          {warning && (
            <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
              <span>{WARNING_MESSAGES[warning]}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Отмена
          </Button>
          {warning ? (
            <Button
              variant="destructive"
              onClick={() => confirmMutation.mutate()}
              disabled={isPending}
            >
              {confirmMutation.isPending ? "Удаление..." : "Всё равно удалить"}
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={() => checkMutation.mutate()}
              disabled={isPending}
            >
              {checkMutation.isPending ? "Проверка..." : "Удалить"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
