"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLists } from "@/lib/listsApi";
import { ListCard } from "@/components/list/ListCard";
import { CreateListModal } from "@/components/list/CreateListModal";
import { EmptyDashboard } from "@/components/empty-states/EmptyDashboard";

export default function DashboardPage() {
  const [createOpen, setCreateOpen] = useState(false);

  const { data: lists, isLoading } = useQuery({
    queryKey: ["lists"],
    queryFn: getLists,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Мои вишлисты</h1>
        <CreateListModal open={createOpen} onOpenChange={setCreateOpen} />
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && lists && lists.length === 0 && (
        <EmptyDashboard onCreateClick={() => setCreateOpen(true)} />
      )}

      {!isLoading && lists && lists.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <ListCard key={list.id} list={list} />
          ))}
        </div>
      )}
    </div>
  );
}
