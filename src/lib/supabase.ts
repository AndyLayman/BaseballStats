import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// In-memory mutex that replaces the browser Web Locks API.
// Web Locks serialized ALL parallel Supabase requests (30s+ loads).
// A no-op lock fixed that but broke token refresh (refresh tokens are single-use,
// so concurrent refreshes race and destroy the session → mobile stuck on spinner).
// This mutex serializes calls with the same lock name (preventing concurrent
// token refreshes) while still allowing truly parallel data queries.
const activeLocks = new Map<string, Promise<unknown>>();

export const supabase = createBrowserClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder",
  {
    auth: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lock: async (name: string, acquireTimeout: number, fn: () => Promise<any>) => {
        // Wait for the current holder of this lock name (if any) to finish.
        // If a tab is suspended mid-request, the previous holder's promise can
        // be left pending forever — bound the wait so we don't deadlock all
        // future Supabase calls when the tab wakes up.
        const timeoutMs = acquireTimeout > 0 ? acquireTimeout : 10_000;
        const deadline = Date.now() + timeoutMs;
        while (activeLocks.has(name)) {
          const remaining = deadline - Date.now();
          if (remaining <= 0) {
            // Forcibly evict the stuck holder so we can proceed
            activeLocks.delete(name);
            break;
          }
          try {
            await Promise.race([
              activeLocks.get(name),
              new Promise((_, rej) => setTimeout(() => rej(new Error("lock-timeout")), remaining)),
            ]);
          } catch {
            // Previous holder threw or we timed out — loop and re-check
          }
        }

        // Now we hold the lock — store our promise so others wait
        let resolve: () => void;
        let reject: (err: unknown) => void;
        const gate = new Promise<void>((res, rej) => {
          resolve = res;
          reject = rej;
        });
        activeLocks.set(name, gate);

        try {
          const result = await fn();
          resolve!();
          return result;
        } catch (err) {
          reject!(err);
          throw err;
        } finally {
          // Only delete if we're still the current holder
          if (activeLocks.get(name) === gate) {
            activeLocks.delete(name);
          }
        }
      },
    },
  }
);
