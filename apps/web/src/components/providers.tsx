"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { useEffect, useState } from "react";
import { RequestError } from "@/lib/api";
import { replaceSession } from "@/hooks/use-session";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30000,
            retry: (count, error) =>
              count < 1 &&
              (!(error instanceof RequestError) || error.status >= 500),
          },
          mutations: { retry: false },
        },
      }),
  );
  useEffect(() => {
    const expire = () => {
      void replaceSession(client, null);
    };
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, [client]);
  return (
    <QueryClientProvider client={client}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </QueryClientProvider>
  );
}
