export const queryKeys = {
  session: ["session"] as const,
  health: ["health"] as const,
  records: ["records"] as const,
  recordsPage: (userId: number, resource: string, page: number) =>
    ["records", userId, resource, page] as const,
};
