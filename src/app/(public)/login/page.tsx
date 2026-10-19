"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldHint } from "@/components/ui/Input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { BRAND } from "@/config/brand";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const supabaseConfigured =
    typeof process !== "undefined" && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    if (!email) {
      setError("Digite seu e-mail primeiro");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar link");
    } finally {
      setLoading(false);
    }
  }

  if (!supabaseConfigured) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Plataforma em preparação</CardTitle>
        </CardHeader>
        <CardBody className="text-fg-muted text-sm space-y-3">
          <p>
            A plataforma {BRAND.fullName} está sendo configurada. Em breve será possível acessar
            aqui com seu e-mail.
          </p>
          <p className="text-fg-subtle text-xs">
            (Faltam apenas as credenciais do Supabase para liberar autenticação.)
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <p className="text-sm text-fg-muted mt-1">Acesse sua conta {BRAND.name}</p>
      </CardHeader>
      <CardBody>
        {sent ? (
          <div className="text-center py-6">
            <div className="text-gold text-4xl mb-3">✉</div>
            <p className="font-semibold">Link enviado!</p>
            <p className="text-sm text-fg-muted mt-2">
              Verifique seu e-mail <span className="text-fg">{email}</span> e clique no link
              pra entrar.
            </p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
              />
              <FieldHint>
                Ou{" "}
                <button
                  type="button"
                  onClick={handleMagicLink}
                  className="text-accent hover:underline"
                >
                  receber link no e-mail
                </button>
              </FieldHint>
            </div>
            {error ? <FieldHint error>{error}</FieldHint> : null}
            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              Entrar
            </Button>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
