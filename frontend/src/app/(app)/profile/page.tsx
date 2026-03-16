"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserIcon, SaveIcon, ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import type { User } from "@/types";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch<User>("/auth/me", { display_name: displayName.trim() || null });
      return res.data;
    },
    onSuccess: (updated) => {
      setUser(updated);
      toast.success("Профиль обновлён");
    },
    onError: () => toast.error("Не удалось обновить профиль"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex size-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400 transition-all hover:border-orange-500/50 hover:text-orange-400"
        >
          <ArrowLeftIcon className="size-4" />
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/10">
            <UserIcon className="size-4 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Профиль</h1>
            <p className="text-xs text-zinc-500">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Основная информация
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="display-name" className="text-sm font-medium text-zinc-300">
              Отображаемое имя
            </label>
            <input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Твоё имя"
              className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 text-sm text-white placeholder:text-zinc-600 outline-none transition-all focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-300">Email</label>
            <input
              value={user?.email ?? ""}
              disabled
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-800/50 px-4 text-sm text-zinc-500 cursor-not-allowed"
            />
            <p className="text-xs text-zinc-600">Email нельзя изменить</p>
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-400 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SaveIcon className="size-4" />
            {mutation.isPending ? "Сохранение..." : "Сохранить"}
          </button>
        </form>
      </div>
    </div>
  );
}
