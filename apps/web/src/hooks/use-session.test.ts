import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { replaceSession } from "./use-session";
import { queryKeys } from "@/lib/query-keys";
import type { User } from "@/lib/types";

const oldUser: User = {
  id: 1,
  email: "old@example.com",
  first_name: "Old",
  last_name: "User",
  created_at: "2026-10-13T00:00:00Z",
  updated_at: "2026-10-13T00:00:00Z",
};

describe("session cache transitions", () => {
  it("prevents an in-flight profile response from restoring a logged-out account", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    client.setQueryData(queryKeys.session, oldUser);
    client.setQueryData(queryKeys.recordsPage(1, "users", 1), {
      data: [oldUser],
    });
    let finish!: (user: User) => void;
    const delayed = new Promise<User>((resolve) => {
      finish = resolve;
    });
    const read = client
      .fetchQuery({
        queryKey: queryKeys.session,
        queryFn: () => delayed,
      })
      .catch(() => null);
    await replaceSession(client, null);
    finish(oldUser);
    await read;
    expect(client.getQueryData(queryKeys.session)).toBeNull();
    expect(client.getQueriesData({ queryKey: queryKeys.records })).toHaveLength(
      0,
    );
    client.clear();
  });

  it("clears previous-account records on sign-in while keeping public health data", async () => {
    const client = new QueryClient();
    const newUser = { ...oldUser, id: 2, email: "new@example.com" };
    client.setQueryData(queryKeys.recordsPage(1, "user-permissions", 1), {
      data: ["private"],
    });
    client.setQueryData(queryKeys.health, { name: "service" });
    await replaceSession(client, newUser);
    expect(client.getQueryData(queryKeys.session)).toEqual(newUser);
    expect(client.getQueriesData({ queryKey: queryKeys.records })).toHaveLength(
      0,
    );
    expect(client.getQueryData(queryKeys.health)).toEqual({ name: "service" });
    client.clear();
  });
});
