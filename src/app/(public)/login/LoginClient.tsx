"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldHint } from "@/components/ui/Input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { BRAND } from "@/config/brand";

const MSG_LINK = "Esse link não vale mais: ele já foi usado ou passou do prazo. Digite seu e-mail e peça um novo link.";
const MSG_NAVEGADOR = "O link abriu em um navegador diferente do que você usou para pedir (por exemplo, dentro do app do Gmail ou do Outlook). Peça um novo link aqui e, no e-mail, toque e segure o link e escolha abrir no mesmo navegador (Safari ou Chrome).";

/** Explica o limite de envio de e-mails do Supabase em vez de uma mensagem genérica. */
function msgEnvio(e: unknown, padrao: string): string {
  const err = e as { status?: number; code?: string; message?: string } | null;
  if (err?.status !== 429 && err?.code !== "over_email_send_rate_limit") return padrao;
  const seg = err?.message?.match(/after (\d+) seconds?/)?.[1];
  if (seg) return `Aguarde ${seg} segundos antes de pedir outro e-mail.`;
  return "Muitos e-mails pedidos em pouco tempo. Use o e-mail mais recente que você recebeu ou tente de novo daqui a 1 hora.";
}

export function LoginClient({ next, erroInicial = null }: { next: string; erroInicial?: "link" | "navegador" | null }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(erroInicial === "link" ? MSG_LINK : erroInicial === "navegador" ? MSG_NAVEGADOR : null);
  const [sent, setSent] = useState<"link" | "senha" | "primeiro" | false>(false);

  // Link do convite (padrão do Supabase) chega com a sessão no fragmento
  // (#access_token=…): entra e vai direto criar a senha.
  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash.includes("access_token=")) return;
    const p = new URLSearchParams(window.location.hash.slice(1));
    const access_token = p.get("access_token");
    const refresh_token = p.get("refresh_token");
    if (!access_token || !refresh_token) return;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    void createSupabaseBrowserClient()
      .auth.setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) return setError(MSG_LINK);
        const tipo = p.get("type");
        window.location.href = tipo === "invite" || tipo === "recovery" || tipo === "signup" ? "/conta/senha?primeiro=1" : next || "/";
      });
  }, [next]);

  // O Supabase devolve erros de link no fragmento (#error=...), invisível ao servidor.
  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash.includes("error=")) return;
    const t = setTimeout(() => {
      setError(MSG_LINK);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
      window.location.href = next || "/";
    } catch {
      // mensagem genérica: não revela se o e-mail existe
      setError("E-mail ou senha incorretos. Se você usa link por e-mail, toque em “receber link no e-mail”.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    if (!email) {
      setError("Digite seu e-mail primeiro.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const redirect = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next || "/")}`;
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
      if (error) throw error;
      setSent("link");
    } catch (e) {
      setError(msgEnvio(e, "Não foi possível enviar o link agora. Tente de novo em instantes."));
    } finally {
      setLoading(false);
    }
  }

  async function handleEsqueciSenha(primeiro = false) {
    if (!email) {
      setError("Digite seu e-mail primeiro.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const redirect = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/conta/senha")}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect });
      if (error) throw error;
      setSent(primeiro ? "primeiro" : "senha");
    } catch (e) {
      setError(msgEnvio(e, "Não foi possível enviar o e-mail agora. Tente de novo em instantes."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <p className="text-sm text-fg-muted mt-1">Acesse o app {BRAND.name} com o e-mail cadastrado.</p>
      </CardHeader>
      <CardBody>
        {sent ? (
          <div className="text-center py-6" role="status">
            <div className="text-accent text-4xl mb-3" aria-hidden>✉</div>
            <p className="font-semibold">{sent === "link" ? "Link enviado!" : "E-mail enviado!"}</p>
            <p className="text-sm text-fg-muted mt-2">
              Confira o e-mail <span className="text-fg">{email}</span> e toque no link {sent === "primeiro" ? "para criar a sua senha" : sent === "senha" ? "para definir uma nova senha" : "para entrar"}.
            </p>
            <p className="text-xs text-fg-subtle mt-3">Abra o link neste mesmo aparelho e navegador, uma vez só. Cada link vale por 1 hora; se não chegar, veja a caixa de spam.</p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email" required autoFocus inputMode="email" />
            </div>
            <div>
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
              <FieldHint>
                Ou{" "}
                <button type="button" onClick={handleMagicLink} className="alvo text-accent underline-offset-2 hover:underline">
                  receber link no e-mail
                </button>
                {" · "}
                <button type="button" onClick={() => void handleEsqueciSenha()} className="alvo text-accent underline-offset-2 hover:underline">
                  esqueci a senha
                </button>
              </FieldHint>
            </div>
            {error ? (
              <p role="alert" className="text-xs text-danger">
                {error}
              </p>
            ) : null}
            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              Entrar
            </Button>
            <button type="button" onClick={() => void handleEsqueciSenha(true)} disabled={loading} className="touch w-full rounded-xl border border-accent/60 px-4 py-3 text-sm font-bold text-accent hover:bg-accent/10 disabled:opacity-60">
              Primeiro acesso? Criar minha senha
            </button>
            <p className="text-center text-[11px] text-fg-subtle">Digite o e-mail que o Montinho cadastrou e toque acima: chega um e-mail para você criar a senha.</p>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
