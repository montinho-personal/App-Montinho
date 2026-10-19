import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

/**
 * Cliente Supabase pra Server Components, Route Handlers e Server Actions.
 * Lê cookies do Next 16 (async) e mantém sessão sincronizada.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet
              // Nunca apagar o segredo do link de e-mail (PKCE) por falta de sessão.
              .filter(({ name, value }) => !(name.endsWith("-code-verifier") && value === ""))
              .forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Em Server Components puros não dá pra setar cookie — ignore.
          }
        },
      },
    }
  );
}
