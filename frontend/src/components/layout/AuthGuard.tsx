"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GiftIcon, LogOutIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
              <GiftIcon className="size-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-primary">Wishify</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">
              {user.display_name || user.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOutIcon className="size-4" />
              <span className="ml-1.5 hidden sm:inline">Выйти</span>
            </Button>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
