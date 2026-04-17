import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// In-memory mutex that replaces the browser Web Locks API.
// Web Locks serialized ALL parallel Supabase requests (30s+ loads).
// A no-op lock fixed that but broke token refresh (refresh tokens are single-use,
// so concurrent refreshes race and destroy the session → mobile stuck on spinner).
// This mutex serializes calls with the same lock name (preventing concurrent
// token refreshes) while still allowing truly parallel data queries.
interface LockEntry {
  promise: Promise<unknown>;
  reject: (err: unknown) => void;
}
const activeLocks = new Map<string, LockEntry>();

// iOS can leave the fetch from a lock-holding fn() pending forever after
// a tab is briefly suspended. That permanently blocks every subsequent
// auth-gated query. When the tab transitions hidden → visible, any lock
// that was held across the suspend is almost certainly stuck, so reject
// its gate and drop the entry. A new request can then acquire cleanly.
if (typeof document !== "undefined") {
  let wasHidden = false;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      wasHidden = true;
      return;
    }
    if (document.visibilityState === "visible" && wasHidden) {
      wasHidden = false;
      for (const [name, entry] of activeLocks) {
        entry.reject(new Error("Lock holder suspended across tab hide"));
        activeLocks.delete(name);
      }
    }
  });
}

export const supabase = createBrowserClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder",
  {
    auth: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lock: async (name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
        // Wait for the current holder of this lock name (if any) to finish
        while (activeLocks.has(name)) {
          try {
            await activeLocks.get(name)!.promise;
          } catch {
            // Previous holder threw (or was evicted on tab wake) — we still proceed
          }
        }

        // Now we hold the lock — store our promise so others wait
        let resolve: () => void;
        let reject: (err: unknown) => void;
        const gate = new Promise<void>((res, rej) => {
          resolve = res;
          reject = rej;
        });
        const entry: LockEntry = { promise: gate, reject: reject! };
        activeLocks.set(name, entry);

        try {
          const result = await fn();
          resolve!();
          return result;
        } catch (err) {
          reject!(err);
          throw err;
        } finally {
          // Only delete if we're still the current holder
          if (activeLocks.get(name) === entry) {
            activeLocks.delete(name);
          }
        }
      },
    },
  }
);
