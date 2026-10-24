"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DURACOES_DESAFIO, TIPOS_DESAFIO, type TipoDesafio } from "@/lib/desafios/regras";

const TIPOS = Object.keys(TIPOS_DESAFIO) as TipoDesafio[];

export function NovoDesafioClient({ hoje, maximo, primeiroNome, pessoas }: { hoje: string; maximo: string; primeiroNome: string; pessoas: Array<{ alunoId: string; nome: string }> }) {
  const router = useRouter();
  const [nome, setNome] = useState(`Desafio de ${primeiroNome}`);
  const [tipo, setTipo] = useState<TipoDesafio>("mais_treinos");
  const [meta, setMeta] = useState<number>(12);
  const [dias, setDias] = useState<number>(14);
  const [inicio, setInicio] = useState(hoje);
  const [convidar, setConvidar] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const info = TIPOS_DESAFIO[tipo];
  const sem = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const lista = pessoas.filter((p) => !busca.trim() || sem(p.nome).includes(sem(busca.trim()))).slice(0, 30);

  function escolherTipo(t: TipoDesafio) {
    setTipo(t);
    if (TIPOS_DESAFIO[t].metaPadrao) setMeta(TIPOS_DESAFIO[t].metaPadrao!);
  }
  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (nome.trim().length < 3) return setErro("Dê um nome ao desafio.");
    setOcupado(true);
    const r = await fetch("/api/desafios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: nome.trim(), tipo, meta: info.pedeMeta ? meta : null, inicio, dias, convidar }) }).catch(() => null);
    const j = ((await r?.json().catch(() => ({}))) ?? {}) as { id?: string; error?: string };
    if (!r?.ok || !j.id) {
      setErro(j.error ?? "Sem conexão. Tente de novo.");
      setOcupado(false);
      return;
    }
    router.push(`/aluno/desafios/${j.id}?novo=1`);
  }

  return (
    <form onSubmit={criar} className="space-y-5" noValidate>
      <div className="space-y-1">
        <label htmlFor="nome" className="text-sm font-semibold">Nome do desafio</label>
        <input id="nome" value={nome} maxLength={60} onChange={(e) => setNome(e.target.value)} className="w-full rounded-lg border border-border bg-bg px-3 py-2.5" />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Tipo</legend>
        {TIPOS.map((t) => {
          const x = TIPOS_DESAFIO[t];
          const on = t === tipo;
          return (
            <button key={t} type="button" aria-pressed={on} onClick={() => escolherTipo(t)} className={`alvo flex w-full flex-col items-start rounded-xl border px-4 py-3 text-left ${on ? "border-accent bg-accent/10" : "border-border bg-card"}`}>
              <span className="block font-bold">{x.emoji} {x.titulo}</span>
              <span className="block text-xs text-fg-muted">{x.descricao}</span>
            </button>
          );
        })}
      </fieldset>
      {info.pedeMeta ? (
        <div className="space-y-1">
          <label htmlFor="meta" className="text-sm font-semibold">Meta</label>
          <div className="flex items-center gap-2">
            <input id="meta" type="number" inputMode="numeric" min={1} max={tipo === "semanas" ? 7 : 60} value={meta} onChange={(e) => setMeta(Math.max(1, Math.min(tipo === "semanas" ? 7 : 60, Number(e.target.value) || 1)))} className="w-20 rounded-lg border border-border bg-bg px-3 py-2.5 text-center font-mono" />
            <span className="text-sm text-fg-muted">{info.rotuloMeta}</span>
          </div>
        </div>
      ) : null}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Duração</legend>
        <div className="flex gap-2">
          {DURACOES_DESAFIO.map((d) => (
            <button key={d} type="button" aria-pressed={dias === d} onClick={() => setDias(d)} className={`alvo flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${dias === d ? "border-accent bg-accent/10 text-accent" : "border-border"}`}>
              {d} dias
            </button>
          ))}
        </div>
      </fieldset>
      <div className="space-y-1">
        <label htmlFor="inicio" className="text-sm font-semibold">Começa em</label>
        <input id="inicio" type="date" min={hoje} max={maximo} value={inicio} onChange={(e) => setInicio(e.target.value || hoje)} className="w-full rounded-lg border border-border bg-bg px-3 py-2.5" />
      </div>
      {pessoas.length ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Convidar quem já treina no app (opcional)</legend>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pelo nome" aria-label="Buscar pelo nome" className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm" />
          <div className="flex flex-wrap gap-2">
            {lista.map((p) => {
              const on = convidar.includes(p.alunoId);
              return (
                <button key={p.alunoId} type="button" aria-pressed={on} onClick={() => setConvidar((c) => (on ? c.filter((x) => x !== p.alunoId) : [...c, p.alunoId]))} className={`alvo rounded-full border px-3 py-1.5 text-sm ${on ? "border-accent bg-accent/15 font-semibold text-accent" : "border-border"}`}>
                  {on ? "✓ " : ""}
                  {p.nome}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-fg-subtle">Depois de criar, você também manda o link pelo WhatsApp para quem quiser, até para quem ainda não usa o app.</p>
        </fieldset>
      ) : null}
      {erro ? <p role="alert" className="text-sm text-red">{erro}</p> : null}
      <button type="submit" disabled={ocupado} className="alvo flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-4 text-base font-bold text-bg disabled:opacity-60">
        {ocupado ? "Criando…" : "⚔️ Criar desafio"}
      </button>
    </form>
  );
}
