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
let activeLocks = new Map<string, LockEntry>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lockFn = async (name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
  while (activeLocks.has(name)) {
    try {
      await activeLocks.get(name)!.promise;
    } catch {
      // Previous holder threw (or was evicted on tab wake) — we still proceed
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
};

function makeClient() {
  return createBrowserClient(
    supabaseUrl || "https://placeholder.supabase.co",
    supabaseAnonKey || "placeholder",
    { auth: { lock: lockFn } }
  );
}

// A backgrounded tab on iOS can leave an in-flight token-refresh fetch
// permanently pending, which poisons the auth-js client's internal state
// (lockAcquired stuck true, pendingInLock growing unbounded). No amount
// of poking internal flags recovers cleanly — the stuck Promise keeps
// re-holding the lock.
//
// Nuclear recovery on hide → visible: throw away the whole client and
// build a new one. All module-level imports reference this wrapper via
// a Proxy, so the next query uses the fresh client transparently. The
// new client reads its session from localStorage so the user stays
// logged in.
let currentClient = makeClient();

function recreateClient() {
  // Release any orphan waiters on the old lock map so they unblock.
  for (const entry of activeLocks.values()) {
    entry.reject(new Error("Supabase client replaced on tab wake"));
  }
  activeLocks = new Map();
  currentClient = makeClient();
}

let lastHiddenAt: number | null = null;
let lastVisibleAt: number | null = null;
if (typeof document !== "undefined") {
  let wasHidden = false;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      lastHiddenAt = Date.now();
      wasHidden = true;
      return;
    }
    if (document.visibilityState === "visible") {
      lastVisibleAt = Date.now();
      if (wasHidden) {
        wasHidden = false;
        recreateClient();
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
  const a = (currentClient?.auth as unknown as { lockAcquired?: boolean; pendingInLock?: unknown[] }) ?? {};
  return {
    outerLocks: [...activeLocks.keys()],
    authLockAcquired: !!a.lockAcquired,
    pendingInLockLength: Array.isArray(a.pendingInLock) ? a.pendingInLock.length : 0,
    lastHiddenAt,
    lastVisibleAt,
  };
}

// Proxy that forwards every property access to the current client. When
// recreateClient() swaps currentClient, all existing imports seamlessly
// use the new one — no call site has to change.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: ReturnType<typeof makeClient> = new Proxy({} as any, {
  get(_target, prop, receiver) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = Reflect.get(currentClient as any, prop, receiver);
    return typeof value === "function" ? value.bind(currentClient) : value;
  },
});
