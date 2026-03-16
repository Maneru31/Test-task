"use client";

import { useState } from "react";
import { HeartHandshakeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuestNameModal } from "@/components/guest/GuestNameModal";
import { ContributeModal } from "./ContributeModal";
import { useGuestSession } from "@/hooks/useGuestSession";
import { useAuth } from "@/hooks/useAuth";
import type { PublicItem } from "@/types";

interface ContributeButtonProps {
  item: PublicItem;
  slug: string;
}

export function ContributeButton({ item, slug }: ContributeButtonProps) {
  const { user } = useAuth();
  const { guestToken } = useGuestSession();
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [contributeModalOpen, setContributeModalOpen] = useState(false);

  function handleClick() {
    if (!user && !guestToken) {
      setGuestModalOpen(true);
    } else {
      setContributeModalOpen(true);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleClick} className="gap-1.5">
        <HeartHandshakeIcon className="size-3.5" />
        Внести взнос
      </Button>

      <GuestNameModal
        open={guestModalOpen}
        onOpenChange={setGuestModalOpen}
        onSuccess={() => setContributeModalOpen(true)}
      />

      <ContributeModal
        open={contributeModalOpen}
        onOpenChange={setContributeModalOpen}
        item={item}
        slug={slug}
      />
    </>
  );
}
