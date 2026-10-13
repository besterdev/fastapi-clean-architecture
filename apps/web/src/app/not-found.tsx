import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-content-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-semibold">Page not found.</h1>
      <Link href="/" className="text-primary underline underline-offset-4">
        Back to workspace
      </Link>
    </main>
  );
}
