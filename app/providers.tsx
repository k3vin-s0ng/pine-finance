"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { useEffect, useState, type ReactNode } from "react";
import superjson from "superjson";
import { Toaster } from "@/app/components/ui/sonner";
import { TooltipProvider } from "@/app/components/ui/tooltip";
import ErrorBoundary from "@/app/components/ErrorBoundary";
import { ThemeProvider } from "@/app/contexts/ThemeContext";
import { trpc } from "@/app/lib/trpc";
import { getLoginUrl } from "@/app/lib/const";
import { UNAUTHED_ERR_MSG } from "@/app/shared/const";
import posthog from "posthog-js";
import { useAuth } from "@/app/_core/hooks/useAuth";

function redirectToLoginIfUnauthorized(error: unknown) {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  if (error.message === UNAUTHED_ERR_MSG) {
    window.location.href = getLoginUrl();
  }
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient();

    client.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") {
        redirectToLoginIfUnauthorized(event.query.state.error);
      }
    });

    client.getMutationCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") {
        redirectToLoginIfUnauthorized(event.mutation.state.error);
      }
    });

    return client;
  });

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
          fetch(input, init) {
            return globalThis.fetch(input, {
              ...(init ?? {}),
              credentials: "include",
            });
          },
        }),
      ],
    }),
  );

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <PostHogIdentify />
              {children}
              <Toaster />
            </QueryClientProvider>
          </trpc.Provider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export function PostHogIdentify() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;

    if (!user) {
      posthog.reset();
      return;
    }

    posthog.identify(String(user.id), {
      email: user.email,
      name: user.name,
      role: user.role,
      organization: user.organization,
      teamId: user.teamId,
    });
  }, [
    loading,
    user?.id,
    user?.email,
    user?.name,
    user?.role,
    user?.organization,
    user?.teamId,
  ]);

  return null;
}