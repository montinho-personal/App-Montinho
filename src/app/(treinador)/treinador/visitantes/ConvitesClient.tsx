"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldHint, Input, Label } from "@/components/ui/Input";
import { BRAND } from "@/config/brand";

type ConviteVisao = { id: string; codigo: string; prazo: string; usos: number; max_usos: number | null; ativo: boolean; valido_ate: string | null; origem: string | null; desafio: string | null };

const PRAZOS = [
  { valor: "7", rotulo: "7 dias" },
  { valor: "14", rotulo: "14 dias" },
  { valor: "21", rotulo: "21 dias" },
  { valor: "30", rotulo: "30 dias" },
  { valor: "ate_data", rotulo: "Até uma data" },
  { valor: "permanente", rotulo: "Sem prazo" },
];

export function ConvitesClient({ convites, sugestao, base, desafios }: { convites: ConviteVisao[]; sugestao: string; base: string; desafios: Array<{ id: string; nome: string }> }) {
  const linkDoConvite = (codigo: string) => `${base}/convite/${codigo}`;
  const mensagem = (codigo: string) => `Oi! Separei um acesso ao app do ${BRAND.name} para você registrar seus treinos, ver sua evolução e ganhar medalhas na Jornada do Chalalá. É só tocar no link e criar sua conta: ${linkDoConvite(codigo)}`;
  const router = useRouter();
  const [codigo, setCodigo] = useState(sugestao);
  const [prazo, setPrazo] = useState("30");
  const [ate, setAte] = useState("");
  const [vagas, setVagas] = useState("");
  const [validoAte, setValidoAte] = useState("");
  const [origem, setOrigem] = useState("");
  const [desafio, setDesafio] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const tipo = prazo === "permanente" ? "permanente" : prazo === "ate_data" ? "ate_data" : "dias";
    const r = await fetch("/api/treinador/convites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        codigo,
        tipo_acesso: tipo,
        dias: tipo === "dias" ? Number(prazo) : null,
        acesso_ate: tipo === "ate_data" ? ate || null : null,
        max_usos: vagas ? Number(vagas) : null,
        valido_ate: validoAte || null,
        origem: origem || null,
        campanha_id: desafio || null,
      }),
    }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
    setEnviando(false);
    if (!r?.ok) return setErro(j?.error ?? "Não foi possível criar o convite.");
    router.refresh();
  }

  async function alternar(c: ConviteVisao) {
    await fetch(`/api/treinador/convites/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ativo: !c.ativo }) }).catch(() => null);
    router.refresh();
  }

  async function copiar(c: ConviteVisao) {
    await navigator.clipboard?.writeText(linkDoConvite(c.codigo)).catch(() => undefined);
    setCopiado(c.id);
    setTimeout(() => setCopiado(null), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Convites</CardTitle>
        <p className="text-sm text-fg-muted mt-1">Cada convite gera um link. Quem toca no link cria a conta sozinho, sem depender de e-mail.</p>
      </CardHeader>
      <CardBody>
        <form onSubmit={criar} className="grid gap-4 md:grid-cols-3" noValidate>
          <div>
            <Label htmlFor="codigo">Código</Label>
            <Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} maxLength={32} />
            <FieldHint>Letras, números e hífen.</FieldHint>
          </div>
          <div>
            <Label htmlFor="prazo">Prazo do acesso</Label>
            <select id="prazo" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg">
              {PRAZOS.map((p) => (
                <option key={p.valor} value={p.valor}>{p.rotulo}</option>
              ))}
            </select>
          </div>
          {prazo === "ate_data" ? (
            <div>
              <Label htmlFor="ate">Acesso até</Label>
              <Input id="ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
            </div>
          ) : null}
          <div>
            <Label htmlFor="vagas">Vagas (opcional)</Label>
            <Input id="vagas" type="number" inputMode="numeric" min={1} value={vagas} onChange={(e) => setVagas(e.target.value)} placeholder="Sem limite" />
          </div>
          <div>
            <Label htmlFor="valido">Aceita cadastros até (opcional)</Label>
            <Input id="valido" type="date" value={validoAte} onChange={(e) => setValidoAte(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="origem">Onde vai divulgar (opcional)</Label>
            <Input id="origem" value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="instagram, academia…" maxLength={60} />
          </div>
          {desafios.length ? (
            <div>
              <Label htmlFor="desafio">Desafio (opcional)</Label>
              <select id="desafio" value={desafio} onChange={(e) => setDesafio(e.target.value)} className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg">
                <option value="">Sem desafio</option>
                {desafios.map((d) => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="md:col-span-3 flex flex-col gap-2">
            {erro ? <p className="text-sm text-danger" role="alert">{erro}</p> : null}
            <Button type="submit" disabled={enviando} className="md:w-fit">
              {enviando ? "Criando…" : "Criar convite"}
            </Button>
          </div>
        </form>

        {convites.length ? (
          <ul className="mt-6 divide-y divide-border">
            {convites.map((c) => (
              <li key={c.id} className="py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className={`font-mono font-semibold ${c.ativo ? "" : "text-fg-subtle line-through"}`}>{c.codigo}</p>
                  <p className="text-xs text-fg-muted">
                    {c.prazo} · {c.usos}
                    {c.max_usos ? ` de ${c.max_usos}` : ""} {c.usos === 1 ? "cadastro" : "cadastros"}
                    {c.valido_ate ? ` · aceita até ${c.valido_ate}` : ""}
                    {c.desafio ? ` · ${c.desafio}` : ""}
                    {c.origem ? ` · ${c.origem}` : ""}
                    {c.ativo ? "" : " · pausado"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a className="alvo inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm hover:border-white/40" href={`https://wa.me/?text=${encodeURIComponent(mensagem(c.codigo))}`} target="_blank" rel="noopener noreferrer">
                    Mandar no WhatsApp
                  </a>
                  <button type="button" onClick={() => void copiar(c)} className="alvo min-h-11 rounded-lg border border-border px-3 text-sm hover:border-white/40">
                    {copiado === c.id ? "Link copiado!" : "Copiar link"}
                  </button>
                  <button type="button" onClick={() => void alternar(c)} className="alvo min-h-11 rounded-lg border border-border px-3 text-sm text-fg-muted hover:border-white/40">
                    {c.ativo ? "Pausar" : "Reativar"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </CardBody>
    </Card>
  );
}
