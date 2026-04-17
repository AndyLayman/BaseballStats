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

export const supabase = createBrowserClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder",
  {
    auth: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lock: async (name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
        while (activeLocks.has(name)) {
          try {
            await activeLocks.get(name)!.promise;
          } catch {
            // Previous holder threw — we still proceed
          }
        }

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
          if (activeLocks.get(name) === entry) {
            activeLocks.delete(name);
          }
        }
      },
    },
  }
);

// A backgrounded tab on iOS can leave an in-flight fetch permanently
// pending, which poisons auth-js internally — no amount of lock poking
// or even client recreation recovers cleanly (the fresh client's first
// fetch hangs the same way on iOS's post-wake network state). A full
// page reload is the only reliable fix: fresh JS context, fresh network
// pool. Everything that matters is already persisted to Supabase or
// localStorage, so nothing user-visible is lost.
const RELOAD_AFTER_HIDDEN_MS = 2_000;

let lastHiddenAt: number | null = null;
let lastVisibleAt: number | null = null;
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      lastHiddenAt = Date.now();
      return;
    }
    if (document.visibilityState === "visible") {
      lastVisibleAt = Date.now();
      if (lastHiddenAt !== null && Date.now() - lastHiddenAt >= RELOAD_AFTER_HIDDEN_MS) {
        window.location.reload();
      }
    }
  });
}

export interface SupabaseDebugInfo {
  outerLocks: string[];
  authLockAcquired: boolean;
  pendingInLockLength: number;
  lastHiddenAt: number | null;
  lastVisibleAt: number | null;
}

export function getSupabaseDebugInfo(): SupabaseDebugInfo {
  const a = (supabase.auth as unknown as { lockAcquired?: boolean; pendingInLock?: unknown[] });
  return {
    outerLocks: [...activeLocks.keys()],
    authLockAcquired: !!a.lockAcquired,
    pendingInLockLength: Array.isArray(a.pendingInLock) ? a.pendingInLock.length : 0,
    lastHiddenAt,
    lastVisibleAt,
  };
}
