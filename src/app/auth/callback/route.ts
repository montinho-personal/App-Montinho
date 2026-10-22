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

function destinoDoTipo(type: EmailOtpType, next: string): string {
  // Convite (1º acesso) ou recuperação: direto para criar a senha.
  if (type === "invite" || type === "signup") return "/conta/senha?primeiro=1";
  if (type === "recovery") return next.startsWith("/conta/senha") ? next : "/conta/senha";
  return next;
}

function destinoSeguro(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = destinoSeguro(url.searchParams.get("next"));
  const erro = (motivo: string, detalhe?: string) => {
    // Diagnóstico sem dados pessoais: só o tipo de falha e quais cookies existiam.
    const nomes = request.cookies.getAll().map((c) => c.name.replace(/^sb-[a-z]+-/, "sb-*-"));
    console.warn(`[auth/callback] falha=${detalhe ?? motivo} code=${url.searchParams.has("code")} token_hash=${url.searchParams.has("token_hash")} cookies=${nomes.join(",") || "(nenhum)"}`);
    return NextResponse.redirect(new URL(`/login?erro=${motivo}`, url.origin));
  };

  if (appMode() !== "live") return erro("link");

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  try {
    const supabase = await createSupabaseServerClient();
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        // Sem o “verificador” guardado neste navegador: o link foi aberto em outro
        // app/navegador (ex.: dentro do Gmail/Outlook), não é link vencido.
        const outroNavegador = error.name === "AuthPKCECodeVerifierMissingError" || /code verifier/i.test(error.message);
        return erro(outroNavegador ? "navegador" : "link", `exchange:${error.name}`);
      }
      return NextResponse.redirect(new URL(next, url.origin));
    }
    if (tokenHash && type && TIPOS.includes(type)) {
      // NÃO usa o token num GET: robôs de prévia (WhatsApp, Outlook) abrem o
      // link sozinhos e gastariam o uso único. Vai para a página com o botão.
      const confirmar = new URL("/auth/confirmar", url.origin);
      confirmar.searchParams.set("token_hash", tokenHash);
      confirmar.searchParams.set("type", type);
      if (url.searchParams.get("next")) confirmar.searchParams.set("next", next);
      return NextResponse.redirect(confirmar);
    }
  } catch (e) {
    return erro("link", `excecao:${e instanceof Error ? e.name : "desconhecida"}`);
  }
  // Supabase devolveu o erro no fragmento (#error=...), que o servidor não vê:
  // o login lê o fragmento no navegador e explica.
  return erro("link", "sem_parametros");
}

/**
 * POST — a pessoa tocou no botão da página /auth/confirmar. Só aqui o token
 * de uso único é usado (robôs de prévia não enviam formulários).
 */
export async function POST(request: NextRequest) {
  const origem = request.nextUrl.origin;
  const falha = (detalhe: string) => {
    console.warn(`[auth/callback] falha=${detalhe} metodo=POST`);
    return NextResponse.redirect(new URL("/login?erro=link", origem), 303);
  };
  if (appMode() !== "live") return falha("modo");
  const form = await request.formData().catch(() => null);
  const tokenHash = String(form?.get("token_hash") ?? "");
  const type = String(form?.get("type") ?? "") as EmailOtpType;
  const next = destinoSeguro(form?.get("next") ? String(form.get("next")) : null);
  if (!tokenHash || !TIPOS.includes(type)) return falha("sem_parametros");
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return falha(`verify:${error.name}`);
    return NextResponse.redirect(new URL(destinoDoTipo(type, next), origem), 303);
  } catch (e) {
    return falha(`excecao:${e instanceof Error ? e.name : "desconhecida"}`);
  }
}
