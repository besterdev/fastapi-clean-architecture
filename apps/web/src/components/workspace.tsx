"use client";

import {
  ArrowUpRight,
  Circle,
  LayoutDashboard,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Laptop,
  KeyRound,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { AuthForm, Brand } from "@/components/auth-form";
import { Records, formatDate } from "@/components/records";
import { useSession } from "@/hooks/use-session";
import { useLogout, useRenewSession } from "@/hooks/use-auth";
import { useHealth } from "@/hooks/use-health";
import { useRecords } from "@/hooks/use-records";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Workspace() {
  const session = useSession();
  if (session.isPending)
    return (
      <main className="grid min-h-screen place-content-center gap-5 p-8">
        <Brand />
        <Skeleton className="h-4 w-64" />
        <p className="text-sm text-muted-foreground" role="status">
          Opening your workspace…
        </p>
      </main>
    );
  if (session.isError)
    return (
      <main className="grid min-h-screen place-content-center gap-5 p-8">
        <Brand />
        <h1 className="text-3xl">We couldn’t connect.</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {session.error.message}
        </p>
        <Button onClick={() => session.refetch()}>Try again</Button>
      </main>
    );
  return (
    <AnimatePresence mode="wait">
      {session.data ? (
        <motion.div
          key={`workspace-${session.data.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <AccountWorkspace user={session.data} />
        </motion.div>
      ) : (
        <motion.div
          key="auth"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <AuthForm />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const navigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "profile", label: "My profile", icon: UserRound },
  { id: "sessions", label: "Sessions", icon: Laptop },
  { id: "permissions", label: "Permissions", icon: KeyRound },
] as const;
type View = (typeof navigation)[number]["id"];

function AccountWorkspace({ user }: { user: User }) {
  const [view, setView] = useState<View>("overview");
  const health = useHealth();
  const logout = useLogout();
  const renew = useRenewSession();
  const selected = navigation.find((item) => item.id === view)!;
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="flex flex-col border-b border-border bg-card/40 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="p-6 lg:p-7">
          <Brand />
        </div>
        <nav
          aria-label="Main navigation"
          className="flex gap-2 overflow-x-auto px-4 pb-4 lg:flex-col lg:gap-1 lg:px-4 lg:pt-9"
        >
          {navigation.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => setView(item.id)}
              aria-current={view === item.id ? "page" : undefined}
              className={cn(
                "h-11 shrink-0 justify-start gap-3 px-3 text-muted-foreground",
                view === item.id &&
                  "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Button>
          ))}
        </nav>
        <div className="mt-auto hidden px-6 pb-6 lg:block">
          <div className="mb-7 border-l-2 border-primary/40 pl-4">
            <p className="text-sm">Everything in its place.</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              A focused space, built around you.
            </p>
          </div>
          <Separator />
          <div className="flex items-center gap-3 pt-5">
            <span className="grid size-9 shrink-0 place-content-center rounded-full border border-border text-sm text-primary">
              {user.first_name.slice(0, 1)}
              {user.last_name.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {user.first_name} {user.last_name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between gap-3 border-b border-border px-6 py-5 sm:px-10">
          <p className="text-xs text-muted-foreground">
            Workspace <span className="px-2 text-border">/</span>
            <span className="text-foreground">{selected.label}</span>
          </p>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="hidden gap-2 font-normal sm:flex"
            >
              <Circle
                className={cn(
                  "size-2 fill-current",
                  health.isSuccess ? "text-primary" : "text-muted-foreground",
                )}
              />
              {health.isSuccess
                ? "Connected"
                : health.isPending
                  ? "Connecting"
                  : "Service unavailable"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout.mutate()}
              disabled={logout.isPending || renew.isPending}
            >
              {logout.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <LogOut />
              )}
              <span>Sign out</span>
            </Button>
          </div>
        </header>
        <main
          id="main-content"
          className="mx-auto max-w-7xl px-6 py-8 sm:px-10 sm:py-12"
        >
          <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="mb-3 font-mono text-[10px] tracking-[0.2em] text-primary">
                YOUR WORKSPACE
              </p>
              <h1 className="editorial-title text-4xl font-medium sm:text-5xl">
                {view === "overview"
                  ? `Hello, ${user.first_name}.`
                  : selected.label}
              </h1>
              <p className="mt-4 text-sm text-muted-foreground">
                {view === "overview"
                  ? "Here’s your account, at a glance."
                  : view === "profile"
                    ? "The details that make this space yours."
                    : view === "sessions"
                      ? "Stay in control of where you’re signed in."
                      : "A clear view of your assigned access."}
              </p>
            </div>
            {view === "sessions" ? (
              <Button
                variant="outline"
                disabled={renew.isPending || logout.isPending}
                onClick={() => renew.mutate()}
              >
                <RefreshCw className={renew.isPending ? "animate-spin" : ""} />
                Renew session
              </Button>
            ) : (
              <span className="font-mono text-xs text-muted-foreground">
                ACCOUNT / {String(user.id).padStart(4, "0")}
              </span>
            )}
          </div>
          {logout.isError || renew.isError ? (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>
                {logout.error?.message || renew.error?.message}
              </AlertDescription>
            </Alert>
          ) : null}
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              {view === "overview" ? (
                <Overview user={user} navigate={setView} />
              ) : view === "profile" ? (
                <Profile user={user} />
              ) : (
                <Records
                  key={view}
                  userId={user.id}
                  resource={
                    view === "sessions" ? "user-tokens" : "user-permissions"
                  }
                />
              )}
            </motion.div>
          </AnimatePresence>
          <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground">
            <span>Clean workspace. Clear head.</span>
            <span>All times shown in Bangkok.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function Overview({
  user,
  navigate,
}: {
  user: User;
  navigate: (view: View) => void;
}) {
  const sessions = useRecords(user.id, "user-tokens");
  const permissions = useRecords(user.id, "user-permissions");
  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-xl border border-primary/25 bg-primary p-7 text-primary-foreground sm:p-10">
        <div
          aria-hidden
          className="absolute -right-12 -top-20 size-80 rounded-full border-[44px] border-primary-foreground/5"
        />
        <div className="relative max-w-lg">
          <ShieldCheck className="mb-8 size-7" />
          <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
            Your account.
            <br />
            Under your control.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-6 opacity-75">
            Review your details, keep an eye on your session, and see what you
            have access to.
          </p>
          <Button
            variant="outline"
            className="mt-7 border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            onClick={() => navigate("profile")}
          >
            View my profile <ArrowUpRight />
          </Button>
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <Metric
          label="Active sessions"
          value={
            sessions.isSuccess
              ? String(sessions.data.total_data).padStart(2, "0")
              : "—"
          }
          note={
            sessions.isError
              ? "Could not load sessions"
              : "A single, secure sign-in"
          }
          onClick={() => navigate("sessions")}
          icon={Laptop}
        />
        <Metric
          label="Assigned permissions"
          value={
            permissions.isSuccess
              ? String(permissions.data.total_data).padStart(2, "0")
              : "—"
          }
          note={
            permissions.isError
              ? "Could not load permissions"
              : "Access specific to you"
          }
          onClick={() => navigate("permissions")}
          icon={KeyRound}
        />
      </div>
      <section className="flex flex-wrap items-center justify-between gap-5 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <span className="grid size-12 shrink-0 place-content-center rounded-full bg-muted text-lg text-primary">
            {user.first_name.slice(0, 1)}
          </span>
          <div>
            <h2 className="font-medium">
              {user.first_name} {user.last_name}
            </h2>
            <p className="mt-1 break-all text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>
        <Button variant="ghost" onClick={() => navigate("profile")}>
          Account details <ArrowUpRight />
        </Button>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  onClick,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  onClick: () => void;
  icon: typeof Laptop;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="mt-6 flex items-end justify-between">
        <div>
          <p className="font-mono text-4xl tracking-tight">{value}</p>
          <p className="mt-2 text-xs text-muted-foreground">{note}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`View ${label.toLowerCase()}`}
          onClick={onClick}
        >
          <ArrowUpRight />
        </Button>
      </div>
    </section>
  );
}

function Profile({ user }: { user: User }) {
  const details = [
    ["First name", user.first_name],
    ["Last name", user.last_name],
    ["Email address", user.email],
    ["Account ID", `#${user.id}`],
    ["Created", formatDate(user.created_at)],
    ["Last updated", formatDate(user.updated_at)],
  ];
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-5 border-b border-border p-7">
        <span className="grid size-16 shrink-0 place-content-center rounded-full border border-primary/25 bg-primary/10 text-xl text-primary">
          {user.first_name.slice(0, 1)}
          {user.last_name.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <h2 className="break-words text-xl font-medium">
            {user.first_name} {user.last_name}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your personal account details
          </p>
        </div>
      </div>
      <dl className="grid gap-x-12 gap-y-8 p-7 sm:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-2 break-words text-sm">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-border px-7 py-5 text-xs text-muted-foreground">
        Profile details are read-only in this workspace.
      </p>
    </section>
  );
}
