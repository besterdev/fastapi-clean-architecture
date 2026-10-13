"use client";

import dynamic from "next/dynamic";

const Workspace = dynamic(
  () => import("@/components/workspace").then((module) => module.Workspace),
  {
    ssr: false,
    loading: () => (
      <main className="grid min-h-screen place-content-center p-8">
        <p role="status" className="text-sm text-muted-foreground">
          Opening your workspace…
        </p>
      </main>
    ),
  },
);

export function WorkspaceClient() {
  return <Workspace />;
}
