import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase pra Client Components. Reutilizar via hook.
 *
 * IMPORTANTE: o Next só inlina o acesso LITERAL `process.env.NEXT_PUBLIC_X` no
 * bundle do browser. Acesso dinâmico (`process.env[name]`) NÃO é substituído e
 * vira `undefined` no client — por isso lemos as duas vars de forma literal.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Supabase não configurado no client (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)"
    );
  }
  return createBrowserClient(url, anon);
}
