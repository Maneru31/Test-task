"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GiftIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

function CallbackHandler() {
  const { loginWithToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const token = searchParams.get("access_token");
    if (!token) {
      router.replace("/login?error=oauth_failed");
      return;
    }

    loginWithToken(token)
      .then(() => router.replace("/dashboard"))
      .catch(() => router.replace("/login?error=oauth_failed"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-violet-50 via-background to-pink-50">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-pink-500 shadow-lg">
        <GiftIcon className="size-7 text-white" />
      </div>
      <p className="text-sm text-muted-foreground">Входим через Google…</p>
      <Suspense>
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
