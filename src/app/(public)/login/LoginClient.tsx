"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldHint } from "@/components/ui/Input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { BRAND } from "@/config/brand";

export function LoginClient({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

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
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/` } });
      if (error) throw error;
      setSent(true);
    } catch {
      setError("Não foi possível enviar o link agora. Tente de novo em instantes.");
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
            <p className="font-semibold">Link enviado!</p>
            <p className="text-sm text-fg-muted mt-2">
              Confira o e-mail <span className="text-fg">{email}</span> e toque no link para entrar.
            </p>
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
                <button type="button" onClick={handleMagicLink} className="text-accent underline-offset-2 hover:underline">
                  receber link no e-mail
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
          </form>
        )}
      </CardBody>
    </Card>
  );
}
