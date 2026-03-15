"use client";

import { useState } from "react";
import { useGuestSession } from "@/hooks/useGuestSession";
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
import { toast } from "sonner";

interface GuestNameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after guest session is created, so the caller can retry its action */
  onSuccess?: () => void;
}

export function GuestNameModal({ open, onOpenChange, onSuccess }: GuestNameModalProps) {
  const { setGuest } = useGuestSession();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await setGuest(name.trim());
      onOpenChange(false);
      setName("");
      onSuccess?.();
    } catch {
      toast.error("Не удалось создать гостевую сессию");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Как вас зовут?</DialogTitle>
          <DialogDescription>
            Имя будет видно владельцу списка после того, как вы зарезервируете подарок.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="guest-name">Ваше имя</Label>
            <Input
              id="guest-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например, Иван"
              autoFocus
              required
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!name.trim() || loading}>
              {loading ? "Сохранение..." : "Продолжить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
