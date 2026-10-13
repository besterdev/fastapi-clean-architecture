"use client";

import { useQuery, type QueryClient } from "@tanstack/react-query";
import { api, RequestError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { User } from "@/lib/types";

export function useSession() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: async ({ signal }) => {
      try {
        return await api<User>("users/profile", undefined, signal);
      } catch (error) {
        if (error instanceof RequestError && error.status === 401) return null;
        throw error;
      }
    },
  });
}

/** Cancel in-flight reads before changing identity so late results cannot restore old data. */
export async function replaceSession(client: QueryClient, user: User | null) {
  await Promise.all([
    client.cancelQueries({ queryKey: queryKeys.session }),
    client.cancelQueries({ queryKey: queryKeys.records }),
  ]);
  client.removeQueries({ queryKey: queryKeys.records });
  client.setQueryData<User | null>(queryKeys.session, user);
}
