"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { DataPage, Permission, Session, User } from "@/lib/types";

type ResourceRows = {
  users: User;
  "user-tokens": Session;
  "user-permissions": Permission;
};
export type RecordResource = keyof ResourceRows;

export function useRecords<R extends RecordResource>(
  userId: number,
  resource: R,
  page = 1,
) {
  return useQuery({
    queryKey: queryKeys.recordsPage(userId, resource, page),
    queryFn: ({ signal }) =>
      api<DataPage<ResourceRows[R]>>(
        `data/${resource}?_page=${page}&_pageSize=10`,
        undefined,
        signal,
      ),
    // Keep prior page data only within the same account and resource.
    placeholderData: (previous, query) =>
      query?.queryKey[1] === userId && query?.queryKey[2] === resource
        ? previous
        : undefined,
  });
}
