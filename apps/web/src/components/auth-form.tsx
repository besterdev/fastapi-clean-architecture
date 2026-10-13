"use client";

import {
  ArrowUpRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSignIn, type AuthMode } from "@/hooks/use-auth";

export function AuthForm() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const mutation = useSignIn(() => setMode("login"));
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const credentials = {
      email: String(form.get("email")),
      password: String(form.get("password")),
    };
    mutation.mutate(
      mode === "register"
        ? {
            ...credentials,
            mode,
            first_name: String(form.get("first_name")),
            last_name: String(form.get("last_name")),
          }
        : { ...credentials, mode },
    );
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="hairline-grid relative hidden overflow-hidden border-r border-border px-14 py-12 lg:flex lg:flex-col xl:px-20">
        <Brand />
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 my-auto py-20"
        >
          <p className="mb-8 font-mono text-xs tracking-[0.2em] text-primary">
            YOUR SPACE. SIMPLIFIED.
          </p>
          <h1 className="editorial-title max-w-xl text-[clamp(4rem,6vw,6.5rem)] font-medium">
            A little order.
            <br />
            <span className="text-primary">A lot of clarity.</span>
          </h1>
          <p className="mt-8 max-w-sm text-lg leading-relaxed text-muted-foreground">
            Your profile, your sessions, your permissions. One calm place to
            keep it all together.
          </p>
          <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 text-sm text-muted-foreground">
            {["Private by default", "Always in your control"].map((label) => (
              <span key={label} className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                {label}
              </span>
            ))}
          </div>
        </motion.div>
        <div className="flex items-center justify-between border-t border-border pt-6 text-xs text-muted-foreground">
          <span>Less noise. More focus.</span>
          <span className="font-mono">WORKSPACE / 01</span>
        </div>
      </section>
      <section className="flex flex-col justify-center px-6 py-12 sm:px-16 lg:px-14 xl:px-24">
        <div className="mb-14 lg:hidden">
          <Brand />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="mx-auto w-full max-w-md"
        >
          <p className="mb-3 font-mono text-xs tracking-widest text-muted-foreground">
            LET’S GET YOU SETTLED
          </p>
          <h2 className="editorial-title text-4xl font-medium sm:text-5xl">
            {mode === "login" ? "Welcome back." : "Make it yours."}
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {mode === "login"
              ? "Sign in to pick up where you left off."
              : "Create your account and find a little more focus."}
          </p>
          <Tabs
            value={mode}
            onValueChange={(value) => {
              setMode(value === "register" ? "register" : "login");
              mutation.reset();
            }}
            className="mt-8"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" disabled={mutation.isPending}>
                Sign in
              </TabsTrigger>
              <TabsTrigger value="register" disabled={mutation.isPending}>
                Create account
              </TabsTrigger>
            </TabsList>
            <TabsContent value={mode}>
              <form onSubmit={submit} className="mt-7 space-y-5">
                {mode === "register" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">First name</Label>
                      <Input
                        id="first-name"
                        name="first_name"
                        autoComplete="given-name"
                        required
                        maxLength={100}
                        placeholder="Mac"
                        disabled={mutation.isPending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">Last name</Label>
                      <Input
                        id="last-name"
                        name="last_name"
                        autoComplete="family-name"
                        required
                        maxLength={100}
                        placeholder="Your last name"
                        disabled={mutation.isPending}
                      />
                    </div>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    disabled={mutation.isPending}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                      required
                      minLength={mode === "register" ? 8 : 1}
                      maxLength={72}
                      placeholder="Enter your password"
                      disabled={mutation.isPending}
                      className="h-12 pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                  {mode === "register" ? (
                    <p className="text-xs text-muted-foreground">
                      At least 8 characters; up to 72 UTF-8 bytes.
                    </p>
                  ) : null}
                </div>
                {mutation.isError ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {mutation.error.message}
                    </AlertDescription>
                  </Alert>
                ) : null}
                <Button
                  className="h-12 w-full justify-between px-5"
                  type="submit"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending
                    ? "Please wait…"
                    : mode === "login"
                      ? "Enter workspace"
                      : "Create your account"}
                  {mutation.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <ArrowUpRight />
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" />
            <span>Your session stays private on this device.</span>
          </div>
        </motion.div>
      </section>
    </main>
  );
}

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="grid size-9 place-content-center rounded-lg bg-primary text-lg font-bold text-primary-foreground"
      >
        c<span className="sr-only">.</span>
      </span>
      <span className="text-sm font-semibold tracking-tight">
        clean
        <span className="font-normal text-muted-foreground"> / workspace</span>
      </span>
    </div>
  );
}
