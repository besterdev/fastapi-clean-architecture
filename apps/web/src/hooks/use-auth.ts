"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { replaceSession } from "@/hooks/use-session";
import { api, RequestError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { User } from "@/lib/types";

export type AuthMode = "login" | "register";
type Credentials = { email: string; password: string };
export type SignInInput = Credentials &
  (
    | { mode: "login" }
    | { mode: "register"; first_name: string; last_name: string }
  );

export function useSignIn(onRegistered?: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: SignInInput) => {
      const { email, password } = input;
      if (input.mode === "register") {
        await api<User>("users/register", {
          email,
          password,
          first_name: input.first_name,
          last_name: input.last_name,
        });
        onRegistered?.();
      }
      return api<User>("users/login", { email, password });
    },
    onSuccess: (user) => replaceSession(client, user),
  });
}

export function useLogout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api<null>("users/logout", {}),
    onSuccess: () => replaceSession(client, null),
  });
}

export function useRenewSession() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api<User>("users/refresh-token", {}),
    onSuccess: async (user) => {
      await client.cancelQueries({ queryKey: queryKeys.session });
      client.setQueryData(queryKeys.session, user);
      await client.invalidateQueries({ queryKey: queryKeys.records });
    },
    onError: async (error) => {
      if (error instanceof RequestError && error.status === 401) {
        await replaceSession(client, null);
      }
    },
  });
}
