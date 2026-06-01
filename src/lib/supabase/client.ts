import { createBrowserClient } from "@supabase/ssr";

function getEnvVars() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase environment variables. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local",
    );
  }

  return { url, anonKey };
}

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (!browserClient) {
    const { url, anonKey } = getEnvVars();
    browserClient = createBrowserClient(url, anonKey);
  }

  return browserClient;
}
