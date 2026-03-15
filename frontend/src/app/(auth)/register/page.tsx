"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      await api.post<TokenResponse>("/auth/register", {
        display_name: displayName,
        email,
        password,
      });
      // Auto-login after registration
      await login({ email, password });
      router.replace("/dashboard");
    } catch {
      setError("Не удалось зарегистрироваться. Возможно, email уже занят.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Регистрация</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="displayName">Имя</Label>
              <Input
                id="displayName"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
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
            <div className="flex flex-col gap-1">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Создаём аккаунт…" : "Создать аккаунт"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Уже есть аккаунт?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Войти
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
