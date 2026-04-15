import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createBrowserClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder",
  {
    auth: {
      // Bypass the Web Locks API for auth token reads.
      // The default lock causes every parallel Supabase request to serialize
      // (each .from().select() internally acquires the lock to read the token),
      // resulting in 30s+ page loads. Safe to disable for single-user mobile apps.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
        return fn();
      },
    },
  }
);
