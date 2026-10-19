// ============================================================================
// Retorno dos links de e-mail do Supabase (link mágico, confirmação, senha).
// O Supabase redireciona para cá com `code` (fluxo PKCE, mesmo navegador) ou
// com `token_hash` + `type` (template de e-mail com {{ .TokenHash }}, funciona
// em qualquer aparelho). Em ambos os casos a sessão vira cookie e o usuário
// segue para `next`. Qualquer falha volta ao login com uma mensagem clara.
// ============================================================================
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { appMode } from "@/lib/env";

export const dynamic = "force-dynamic";

const TIPOS: EmailOtpType[] = ["magiclink", "signup", "invite", "recovery", "email_change", "email"];

function destinoSeguro(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = destinoSeguro(url.searchParams.get("next"));
  const erro = (motivo: string) => NextResponse.redirect(new URL(`/login?erro=${motivo}`, url.origin));

  if (appMode() !== "live") return erro("link");

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  try {
    const supabase = await createSupabaseServerClient();
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return erro("link");
      return NextResponse.redirect(new URL(next, url.origin));
    }
    if (tokenHash && type && TIPOS.includes(type)) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) return erro("link");
      return NextResponse.redirect(new URL(type === "recovery" ? "/conta/senha" : next, url.origin));
    }
  } catch {
    return erro("link");
  }
  // Supabase devolveu o erro no fragmento (#error=...), que o servidor não vê:
  // o login lê o fragmento no navegador e explica.
  return erro("link");
}
