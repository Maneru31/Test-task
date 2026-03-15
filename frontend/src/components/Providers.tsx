"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { GuestProvider } from "@/contexts/GuestContext";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  // One QueryClient per browser session (stable across renders)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GuestProvider>
          {children}
          <Toaster richColors position="top-right" />
        </GuestProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
