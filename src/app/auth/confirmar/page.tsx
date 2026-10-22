// ============================================================================
// Página intermediária dos links de acesso (criar senha, entrar, convite).
// Por quê: WhatsApp, Outlook/Hotmail e outros abrem o link sozinhos para
// montar a prévia ou checar segurança. Se o link usasse o token na hora, o
// robô gastaria o link de uso único antes da pessoa. Aqui o token só é usado
// quando a PESSOA toca no botão (formulário POST para /auth/callback) — robôs
// de prévia não enviam formulários.
// ============================================================================
import type { Metadata } from "next";
import { BRAND } from "@/config/brand";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Seu acesso ao app",
  description: "Toque no botão para entrar no app do Montinho Personal Trainer.",
  robots: { index: false, follow: false },
};

const TIPOS = ["magiclink", "signup", "invite", "recovery", "email_change", "email"];

export default async function ConfirmarAcessoPage({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string; next?: string }> }) {
  const { token_hash, type, next } = await searchParams;
  const valido = !!token_hash && !!type && TIPOS.includes(type);
  const senha = type === "recovery" || type === "invite" || type === "signup";
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10 text-fg">
      <div className="w-full max-w-sm space-y-6 rounded-3xl border border-accent/40 bg-card p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.svg" alt={BRAND.fullName} className="mx-auto h-auto w-48" />
        {valido ? (
          <form method="post" action="/auth/callback" className="space-y-4">
            <input type="hidden" name="token_hash" value={token_hash} />
            <input type="hidden" name="type" value={type} />
            {next ? <input type="hidden" name="next" value={next} /> : null}
            <div className="space-y-1">
              <h1 className="text-xl font-black">{senha ? "Vamos criar a sua senha" : "Entrar no app"}</h1>
              <p className="text-sm text-fg-muted">{senha ? "Toque no botão abaixo. Na próxima tela você escolhe a sua senha." : "Toque no botão abaixo para entrar."}</p>
            </div>
            <button type="submit" className="touch w-full rounded-xl bg-accent px-4 py-3.5 text-base font-black text-bg">
              {senha ? "Criar minha senha" : "Entrar no app"}
            </button>
            <p className="text-[11px] text-fg-subtle">O link vale por 1 hora e funciona uma vez só.</p>
          </form>
        ) : (
          <div className="space-y-3">
            <h1 className="text-xl font-black">Link incompleto</h1>
            <p className="text-sm text-fg-muted">Peça um novo link ao Montinho ou entre pela tela de login.</p>
            <a href="/login" className="touch inline-flex w-full items-center justify-center rounded-xl border border-accent/60 px-4 py-3 font-bold text-accent">Ir para o login</a>
          </div>
        )}
        <p className="text-xs italic text-fg-subtle">“Não é só sobre começar. É sobre conseguir continuar.”</p>
      </div>
    </main>
  );
}
