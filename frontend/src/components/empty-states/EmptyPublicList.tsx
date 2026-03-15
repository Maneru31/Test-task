"use client";

import { GiftIcon } from "lucide-react";

export function EmptyPublicList() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
      <GiftIcon className="size-12 opacity-30" />
      <p className="text-sm">В этом списке пока нет подарков</p>
    </div>
  );
}
