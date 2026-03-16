"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { getLists } from "@/lib/listsApi";
import { ListCard } from "@/components/list/ListCard";
import { CreateListModal } from "@/components/list/CreateListModal";
import { EmptyDashboard } from "@/components/empty-states/EmptyDashboard";
import type { ListSummary } from "@/types";

export default function DashboardPage() {
  const [createOpen, setCreateOpen] = useState(false);

  const { data: lists, isLoading } = useQuery({
    queryKey: ["lists"],
    queryFn: getLists,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Мои вишлисты</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Создавай и делись с близкими</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-400 active:scale-95"
        >
          <PlusIcon className="size-4" />
          <span className="hidden sm:inline">Создать список</span>
          <span className="sm:hidden">Создать</span>
        </button>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-zinc-800" />
          ))}
        </div>
      )}

      {!isLoading && lists && lists.length === 0 && (
        <EmptyDashboard onCreateClick={() => setCreateOpen(true)} />
      )}

      {!isLoading && lists && lists.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(lists as unknown as ListSummary[]).map((list) => (
            <ListCard key={list.id} list={list} />
          ))}
        </div>
      )}

      <CreateListModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
