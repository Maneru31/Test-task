"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { getList, reorderItems } from "@/lib/listsApi";
import type { ListWithItems } from "@/lib/listsApi";
import { ListHeader } from "@/components/list/ListHeader";
import { OwnerWishItem } from "@/components/item/OwnerWishItem";
import { AddItemForm } from "@/components/item/AddItemForm";
import { EmptyOwnerList } from "@/components/empty-states/EmptyOwnerList";
import type { Item } from "@/types";
import { useListWebSocket } from "@/hooks/useListWebSocket";

interface ListPageProps {
  params: { listId: string };
}

export default function ListPage({ params }: ListPageProps) {
  const { listId } = params;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["list", listId],
    queryFn: () => getList(listId),
  });

  useListWebSocket(data?.public_slug, "owner", listId);

  const reorderMutation = useMutation({
    mutationFn: (itemIds: string[]) => reorderItems(listId, itemIds),
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["list", listId] });
      toast.error("Не удалось сохранить порядок");
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const sortedItems: Item[] = data?.items
    ? [...data.items].sort((a, b) => a.position - b.position)
    : [];

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedItems.findIndex((i) => i.id === active.id);
    const newIndex = sortedItems.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(sortedItems, oldIndex, newIndex);

    // Optimistic update
    queryClient.setQueryData<ListWithItems>(["list", listId], (old) => {
      if (!old) return old;
      return {
        ...old,
        items: reordered.map((item, idx) => ({ ...item, position: idx })),
      };
    });

    reorderMutation.mutate(reordered.map((i) => i.id));
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8 h-24 animate-pulse rounded-xl bg-muted" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-muted-foreground">
        Список не найден
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <ListHeader list={data} itemCount={sortedItems.length} />

      <div className="flex flex-col gap-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedItems.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {sortedItems.map((item) => (
              <OwnerWishItem key={item.id} item={item} listId={listId} />
            ))}
          </SortableContext>
        </DndContext>

        {sortedItems.length === 0 && <EmptyOwnerList />}

        <AddItemForm listId={listId} />
      </div>
    </div>
  );
}
