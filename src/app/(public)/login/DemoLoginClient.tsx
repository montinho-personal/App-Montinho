"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Persona = { chave: string; nome: string; role: "treinador" | "aluno" };

export function DemoLoginClient({ personas }: { personas: Persona[] }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar(chave: string) {
    setLoading(chave);
    setErro(null);
    try {
      const res = await fetch("/api/auth/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ persona: chave }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Falha ao entrar");
      window.location.assign(data.destino ?? "/");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao entrar");
      setLoading(null);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Modo demonstração</CardTitle>
        <p className="text-sm text-fg-muted mt-1">Sem banco configurado. Escolha com quem quer navegar — os dados são fictícios.</p>
      </CardHeader>
      <CardBody className="space-y-3">
        {personas.map((p) => (
          <Button key={p.chave} variant={p.role === "treinador" ? "primary" : "secondary"} size="lg" className="w-full justify-between" loading={loading === p.chave} onClick={() => entrar(p.chave)}>
            <span>{p.nome}</span>
            <span className="text-xs uppercase tracking-wider opacity-70">{p.role === "treinador" ? "painel" : "app do aluno"}</span>
          </Button>
        ))}
        {erro ? (
          <p role="alert" className="text-xs text-danger">
            {erro}
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
