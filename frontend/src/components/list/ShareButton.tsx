"use client";

import { Share2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ShareButtonProps {
  slug: string;
}

export function ShareButton({ slug }: ShareButtonProps) {
  async function handleCopy() {
    const url = `${window.location.origin}/l/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Ссылка скопирована");
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  }

  return (
    <Button variant="outline" onClick={handleCopy}>
      <Share2Icon />
      Поделиться
    </Button>
  );
}
