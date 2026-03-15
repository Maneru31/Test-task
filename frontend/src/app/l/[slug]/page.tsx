"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarIcon, UserIcon } from "lucide-react";
import { getPublicList } from "@/lib/publicApi";
import { WishItem } from "@/components/item/WishItem";
import { GuestBanner } from "@/components/guest/GuestBanner";
import { EmptyPublicList } from "@/components/empty-states/EmptyPublicList";
import { formatDate } from "@/lib/formatters";
import { useListWebSocket } from "@/hooks/useListWebSocket";

interface PublicListPageProps {
  params: { slug: string };
}

export default function PublicListPage({ params }: PublicListPageProps) {
  const { slug } = params;

  useListWebSocket(slug, "public");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["list-public", slug],
    queryFn: () => getPublicList(slug),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 h-20 animate-pulse rounded-xl bg-muted" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">
        <p className="text-lg font-medium">Список не найден</p>
        <p className="mt-1 text-sm">Проверьте ссылку или попросите отправить её ещё раз.</p>
      </div>
    );
  }

  const sortedItems = [...data.items].sort((a, b) => a.position - b.position);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{data.title}</h1>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <UserIcon className="size-3.5" />
            {data.owner_display_name}
          </span>
          {data.occasion_date && (
            <span className="flex items-center gap-1">
              <CalendarIcon className="size-3.5" />
              {formatDate(data.occasion_date)}
            </span>
          )}
        </div>

        {data.description && (
          <p className="text-sm text-muted-foreground">{data.description}</p>
        )}
      </div>

      {/* Guest banner — shown only when guest session is active */}
      <div className="mb-4">
        <GuestBanner />
      </div>

      {/* Items */}
      {sortedItems.length === 0 ? (
        <EmptyPublicList />
      ) : (
        <div className="flex flex-col gap-3">
          {sortedItems.map((item) => (
            <WishItem
              key={item.id}
              item={item}
              slug={slug}
              callerRole={data.caller_role}
            />
          ))}
        </div>
      )}
    </div>
  );
}
