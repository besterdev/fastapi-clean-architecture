"use client";

import { ChevronLeft, ChevronRight, Inbox, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRecords } from "@/hooks/use-records";

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

export function Records({
  userId,
  resource,
}: {
  userId: number;
  resource: "user-tokens" | "user-permissions";
}) {
  const [page, setPage] = useState(1);
  const query = useRecords(userId, resource, page);
  const isSessions = resource === "user-tokens";
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-4 border-b border-border p-6">
        <div>
          <h2 className="text-lg font-medium">
            {isSessions ? "Your active session" : "Your permissions"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSessions
              ? "One active sign-in. A new login replaces the previous session."
              : "Access assigned to your account."}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="Reload records"
          disabled={query.isFetching}
          onClick={() => query.refetch()}
        >
          <RefreshCw className={query.isFetching ? "animate-spin" : ""} />
        </Button>
      </div>
      {query.isError ? (
        <div className="p-6">
          <Alert variant="destructive">
            <AlertDescription>{query.error.message}</AlertDescription>
          </Alert>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => query.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : query.isPending ? (
        <div className="space-y-3 p-6" aria-label="Loading records">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : query.data.data.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-20 text-center">
          <Inbox className="mb-5 size-8 text-muted-foreground" />
          <h3 className="font-medium">
            {isSessions ? "No active session" : "No permissions assigned"}
          </h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {isSessions
              ? "Sign in again to start a fresh session."
              : "Your profile is ready. Assigned permissions will appear here."}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">
                {isSessions ? "Session" : "Permission"}
              </TableHead>
              <TableHead>Record ID</TableHead>
              <TableHead className="pr-6">Last updated · Bangkok</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data.data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="py-5 pl-6">
                  {isSessions ? (
                    <Badge
                      className="border-primary/20 bg-primary/10 text-primary"
                      variant="outline"
                    >
                      Active session
                    </Badge>
                  ) : (
                    <span className="font-medium">
                      {"permission" in row ? row.permission : ""}
                    </span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  #{row.id}
                </TableCell>
                <TableCell className="whitespace-nowrap pr-6 text-sm text-muted-foreground">
                  {formatDate(row.updated_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {query.data ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4 text-xs text-muted-foreground">
          <span>
            {query.data.total_data} {isSessions ? "session" : "permission(s)"} ·
            Page {page} of {Math.max(1, query.data.total_page)}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
              disabled={page === 1 || query.isFetching}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next page"
              disabled={page >= query.data.total_page || query.isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
