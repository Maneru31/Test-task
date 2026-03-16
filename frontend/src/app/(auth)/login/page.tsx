"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GiftIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      await login({ email, password });
      router.replace("/dashboard");
    } catch {
      setError("Неверный email или пароль");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-background to-pink-50 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-pink-500 shadow-lg">
            <GiftIcon className="size-7 text-white" />
          </div>
          <h1 className="bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-2xl font-bold text-transparent">
            Wishify
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Вход в аккаунт</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}
            <Button
              type="submit"
              disabled={isPending}
              className="bg-gradient-to-r from-primary to-pink-500 hover:opacity-90"
            >
              {isPending ? "Входим…" : "Войти"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Нет аккаунта?{" "}
            <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
