"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GiftIcon, LogOutIcon, LayoutDashboardIcon, UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [user, isLoading, router]);

  if (isLoading) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-orange-500">
              <GiftIcon className="size-4 text-white" />
            </div>
            <span className="font-bold text-white">Wishify</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="hidden items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white sm:flex"
            >
              <LayoutDashboardIcon className="size-4" />
              Мои списки
            </Link>
            <span className="hidden text-sm text-zinc-600 sm:block">|</span>
            <Link
              href="/profile"
              className="hidden items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white sm:flex"
            >
              <UserIcon className="size-4" />
              <span className="max-w-[120px] truncate">{user.display_name || user.email}</span>
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-500 transition-all hover:bg-zinc-800 hover:text-red-400"
            >
              <LogOutIcon className="size-4" />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
