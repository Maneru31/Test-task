"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon, PencilIcon, Trash2Icon, ExternalLinkIcon, GiftIcon } from "lucide-react";
import Image from "next/image";
import { formatPrice } from "@/lib/formatters";
import { EditItemModal } from "./EditItemModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import type { Item } from "@/types";

interface OwnerWishItemProps {
  item: Item;
  listId: string;
}

export function OwnerWishItem({ item, listId }: OwnerWishItemProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="group flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 transition-all hover:border-orange-500/30 hover:bg-zinc-800/80"
      >
        <button
          {...attributes} {...listeners}
          aria-label="Перетащить"
          className="cursor-grab touch-none text-zinc-700 hover:text-zinc-500 active:cursor-grabbing"
        >
          <GripVerticalIcon className="size-4" />
        </button>

        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} width={56} height={56} className="size-14 shrink-0 rounded-xl object-cover" unoptimized />
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-800">
            <GiftIcon className="size-6 text-zinc-600" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-medium text-white">{item.name}</p>
            {item.url && (
              <a href={item.url} target="_blank" rel="noopener noreferrer"
                className="shrink-0 text-zinc-600 hover:text-orange-400" onClick={(e) => e.stopPropagation()}>
                <ExternalLinkIcon className="size-3.5" />
              </a>
            )}
          </div>
          {item.description && <p className="truncate text-sm text-zinc-500">{item.description}</p>}
          {item.price && (
            <p className="mt-0.5 text-sm font-semibold text-orange-400">{formatPrice(item.price, item.currency)}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={() => setEditOpen(true)} aria-label="Редактировать"
            className="rounded-lg p-2 text-zinc-600 hover:bg-orange-500/10 hover:text-orange-400">
            <PencilIcon className="size-4" />
          </button>
          <button onClick={() => setDeleteOpen(true)} aria-label="Удалить"
            className="rounded-lg p-2 text-zinc-600 hover:bg-red-500/10 hover:text-red-400">
            <Trash2Icon className="size-4" />
          </button>
        </div>
      </div>

      <EditItemModal open={editOpen} onOpenChange={setEditOpen} listId={listId} item={item} />
      <DeleteConfirmModal open={deleteOpen} onOpenChange={setDeleteOpen} listId={listId} itemId={item.id} itemName={item.name} />
    </>
  );
}
