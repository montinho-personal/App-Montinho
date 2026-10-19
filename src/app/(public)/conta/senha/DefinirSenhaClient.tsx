"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldHint } from "@/components/ui/Input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const MINIMO = 8;

export function DefinirSenhaClient({ destino }: { destino: string }) {
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (senha.length < MINIMO) return setError(`Use pelo menos ${MINIMO} caracteres.`);
    if (senha !== confirma) return setError("As duas senhas não são iguais.");
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw error;
      setOk(true);
    } catch {
      setError("Não foi possível salvar a senha agora. Tente de novo em instantes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Definir senha</CardTitle>
        <p className="text-sm text-fg-muted mt-1">Com uma senha você entra sem precisar do link por e-mail.</p>
      </CardHeader>
      <CardBody>
        {ok ? (
          <div className="text-center py-4 space-y-4" role="status">
            <p className="font-semibold">Senha salva!</p>
            <p className="text-sm text-fg-muted">Da próxima vez, entre com e-mail e senha.</p>
            <Button variant="primary" size="lg" className="w-full" onClick={() => window.location.assign(destino)}>
              Continuar
            </Button>
          </div>
        ) : (
          <form onSubmit={salvar} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="senha">Nova senha</Label>
              <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" minLength={MINIMO} required autoFocus />
              <FieldHint>Mínimo de {MINIMO} caracteres.</FieldHint>
            </div>
            <div>
              <Label htmlFor="confirma">Repita a senha</Label>
              <Input id="confirma" type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} autoComplete="new-password" required />
            </div>
            {error ? (
              <p role="alert" className="text-xs text-danger">
                {error}
              </p>
            ) : null}
            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              Salvar senha
            </Button>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
