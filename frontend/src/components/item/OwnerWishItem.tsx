"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon, PencilIcon, Trash2Icon, ExternalLinkIcon } from "lucide-react";
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

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition-shadow"
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          aria-label="Перетащить"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        >
          <GripVerticalIcon className="size-4" />
        </button>

        {/* Image */}
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="size-12 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="size-12 shrink-0 rounded-lg bg-muted" />
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium">{item.name}</p>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLinkIcon className="size-3.5" />
              </a>
            )}
          </div>
          {item.description && (
            <p className="truncate text-xs text-muted-foreground">{item.description}</p>
          )}
          {item.price && (
            <p className="mt-0.5 text-xs font-medium text-foreground">
              {formatPrice(item.price, item.currency)}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => setEditOpen(true)}
            aria-label="Редактировать"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <PencilIcon className="size-4" />
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            aria-label="Удалить"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
          >
            <Trash2Icon className="size-4" />
          </button>
        </div>
      </div>

      <EditItemModal
        open={editOpen}
        onOpenChange={setEditOpen}
        listId={listId}
        item={item}
      />
      <DeleteConfirmModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        listId={listId}
        itemId={item.id}
        itemName={item.name}
      />
    </>
  );
}
