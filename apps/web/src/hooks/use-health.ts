"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: ({ signal }) =>
      api<{ name: string; version: string }>("health", undefined, signal),
    refetchInterval: 60000,
  });
}
