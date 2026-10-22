"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldHint, Input, Label } from "@/components/ui/Input";

type DesafioVisao = { id: string; nome: string; periodo: string; meta: number | null; participantes: number; concluidos: number };

export function DesafiosClient({ desafios, hoje }: { desafios: DesafioVisao[]; hoje: string }) {
  const router = useRouter();
  const [nome, setNome] = useState("Desafio 7 Dias Chalalá");
  const [descricao, setDescricao] = useState("");
  const [inicio, setInicio] = useState(hoje);
  const [fim, setFim] = useState("");
  const [meta, setMeta] = useState("3");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!fim) return setErro("Escolha a data final do desafio.");
    setEnviando(true);
    const r = await fetch("/api/treinador/desafios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, descricao: descricao || null, inicio, fim, meta_treinos: Number(meta) }),
    }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
    setEnviando(false);
    if (!r?.ok) return setErro(j?.error ?? "Não foi possível criar o desafio.");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desafios</CardTitle>
        <p className="text-sm text-fg-muted mt-1">Um desafio tem período e quantidade de treinos. Ligue um convite a ele: quem entrar pelo convite vê o progresso no app e ganha a medalha “Desafio concluído” ao cumprir.</p>
      </CardHeader>
      <CardBody>
        <form onSubmit={criar} className="grid gap-4 md:grid-cols-3" noValidate>
          <div className="md:col-span-2">
            <Label htmlFor="d-nome">Nome do desafio</Label>
            <Input id="d-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} />
          </div>
          <div>
            <Label htmlFor="d-meta">Treinos para concluir</Label>
            <Input id="d-meta" type="number" inputMode="numeric" min={1} max={100} value={meta} onChange={(e) => setMeta(e.target.value)} />
          </div>
          <div className="md:col-span-3">
            <Label htmlFor="d-desc">Descrição (aparece para o visitante, opcional)</Label>
            <Input id="d-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Três treinos em sete dias para começar com o pé direito." maxLength={500} />
          </div>
          <div>
            <Label htmlFor="d-inicio">Começa em</Label>
            <Input id="d-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="d-fim">Termina em</Label>
            <Input id="d-fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            <FieldHint>Contam os treinos concluídos entre as duas datas.</FieldHint>
          </div>
          <div className="md:col-span-3 flex flex-col gap-2">
            {erro ? <p className="text-sm text-danger" role="alert">{erro}</p> : null}
            <Button type="submit" disabled={enviando} className="md:w-fit">
              {enviando ? "Criando…" : "Criar desafio"}
            </Button>
          </div>
        </form>
        {desafios.length ? (
          <ul className="mt-6 divide-y divide-border">
            {desafios.map((d) => (
              <li key={d.id} className="py-3">
                <p className="font-semibold">{d.nome}</p>
                <p className="text-xs text-fg-muted">
                  {d.periodo}
                  {d.meta ? ` · meta: ${d.meta} treinos` : ""} · {d.participantes} {d.participantes === 1 ? "participante" : "participantes"} · {d.concluidos} {d.concluidos === 1 ? "concluiu" : "concluíram"}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </CardBody>
    </Card>
  );
}
