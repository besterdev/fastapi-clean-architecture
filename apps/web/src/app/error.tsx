"use client";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-screen place-content-center gap-5 p-8 text-center">
      <h1 className="text-3xl font-semibold">Something went wrong.</h1>
      <p className="text-muted-foreground">
        Please try loading your workspace again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
