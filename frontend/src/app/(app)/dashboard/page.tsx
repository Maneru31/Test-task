"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { getLists } from "@/lib/listsApi";
import { ListCard } from "@/components/list/ListCard";
import { CreateListModal } from "@/components/list/CreateListModal";
import { EmptyDashboard } from "@/components/empty-states/EmptyDashboard";
import { Button } from "@/components/ui/button";
import type { ListSummary } from "@/types";

export default function DashboardPage() {
  const [createOpen, setCreateOpen] = useState(false);

  const { data: lists, isLoading } = useQuery({
    queryKey: ["lists"],
    queryFn: getLists,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-3xl font-bold text-transparent">
              Мои вишлисты
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Создавай списки желаний и делись ими с близкими
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 bg-gradient-to-r from-primary to-pink-500 hover:opacity-90"
          >
            <PlusIcon className="size-4" />
            <span className="hidden sm:inline">Создать список</span>
            <span className="sm:hidden">Создать</span>
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
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
