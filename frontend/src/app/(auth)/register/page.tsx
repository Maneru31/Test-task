"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GiftIcon } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TokenResponse } from "@/types/index";

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      await api.post<TokenResponse>("/auth/register", { display_name: displayName, email, password });
      await login({ email, password });
      router.replace("/dashboard");
    } catch {
      setError("Не удалось зарегистрироваться. Возможно, email уже занят.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-orange-500 shadow-lg shadow-orange-500/25">
            <GiftIcon className="size-7 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Wishify</span>
        </Link>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-6 text-center text-lg font-semibold text-white">Создать аккаунт</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="displayName" className="text-zinc-400">Имя</Label>
              <Input
                id="displayName" type="text" autoComplete="name"
                value={displayName} onChange={(e) => setDisplayName(e.target.value)} required
                className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-600 focus-visible:border-orange-500 focus-visible:ring-orange-500/20"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-zinc-400">Email</Label>
              <Input
                id="email" type="email" autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)} required
                className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-600 focus-visible:border-orange-500 focus-visible:ring-orange-500/20"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-zinc-400">Пароль</Label>
              <Input
                id="password" type="password" autoComplete="new-password"
                value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-600 focus-visible:border-orange-500 focus-visible:ring-orange-500/20"
              />
            </div>
            {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
            <Button type="submit" disabled={isPending} className="bg-orange-500 text-white hover:bg-orange-400">
              {isPending ? "Создаём…" : "Создать аккаунт"}
            </Button>
          </form>

          <div className="relative my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs text-zinc-600">или</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <a
            href="/api/v1/auth/google"
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-all hover:border-zinc-600 hover:bg-zinc-700"
          >
            <svg viewBox="0 0 24 24" className="size-4" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Зарегистрироваться через Google
          </a>

          <p className="mt-5 text-center text-sm text-zinc-600">
            Уже есть аккаунт?{" "}
            <Link href="/login" className="font-medium text-orange-400 hover:text-orange-300">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
