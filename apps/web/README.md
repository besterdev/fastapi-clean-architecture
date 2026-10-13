# Clean Workspace

Next.js frontend for the FastAPI Clean Architecture backend. Full setup and Docker instructions
are in [the repository README](../../README.md).

## Layers

- `src/app/api/[...path]/route.ts`: explicit BFF allowlist, same-origin writes and HTTP responses.
- `src/lib/backend.ts`: server-only FastAPI adapter and HttpOnly session cookies.
- `src/lib/api.ts`: Axios client with a shared refresh request and normalized errors.
- `src/components/providers.tsx`: React Query cache and reduced-motion configuration.
- UI components: shadcn primitives, auth form, workspace and paginated records.

## Client rendering and custom hooks

The workspace is explicitly client-rendered. `app/page.tsx` renders `WorkspaceClient`, a client
boundary using `next/dynamic` with `ssr: false`. The server returns a loading shell, and the browser
loads the workspace and starts React Query requests after mounting. Metadata, the root layout and
Next.js `/api` route handlers remain server-side. This is not a static export: the BFF server is
required for HttpOnly cookies and forwarding calls to FastAPI.

`src/hooks/` owns reusable data and authentication behavior:

| Hook | Responsibility |
|---|---|
| `useSession` | Fetch the profile; represent an unauthorized session as `null` |
| `useSignIn` | Sign in, or register then sign in; replace session cache after success |
| `useLogout` | Revoke the server session, cancel pending reads and clear account caches |
| `useRenewSession` | Renew tokens, update the profile cache and invalidate records; clear identity on 401 |
| `useHealth` | Poll service status every 60 seconds |
| `useRecords` | Typed resource reads, pagination and request cancellation |

Components keep presentation state such as selected navigation, form mode, password visibility and
the page number in `useState`. They consume hooks rather than defining query/mutation workflows.
`lib/query-keys.ts` centralizes cache keys. `replaceSession` in `use-session.ts` cancels in-flight
profile/record queries before changing identity, so a late response cannot restore a signed-out user.
Previous-page placeholders are reused only for the same user and resource.

React Query owns API/server state; no duplicate user or records store is added. Zustand is not needed
for the current UI. Add it only when several unrelated components or pages need shared client-only
state, such as a persistent sidebar preference or draft. Keep fetched API records in React Query.

Business rules remain in FastAPI. No ORM or duplicate authentication rules are added to Next.js.
`npm run dev` serves port 3000; `npm run build` produces a standalone Docker-compatible server.

Primary references: [Next.js route handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route),
[cookies](https://nextjs.org/docs/app/api-reference/functions/cookies),
[shadcn/ui](https://ui.shadcn.com/docs/installation/next),
[Tailwind PostCSS](https://tailwindcss.com/docs/installation/using-postcss),
[Motion](https://motion.dev/docs/react), [Axios interceptors](https://axios-http.com/docs/interceptors),
[TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview).
