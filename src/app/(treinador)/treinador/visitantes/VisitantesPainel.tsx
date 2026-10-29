"use client";

// Visitantes reformulado (pedido do Montinho, 29/10/2026): o que precisa de
// você em cima; depois abas Pessoas · Convites · Desafios · Treinos prontos.
// Pessoas com busca na hora e filtros; o detalhe (WhatsApp, +30 dias, virou
// aluno) abre tocando na pessoa.
import { useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AcoesVisitante } from "./AcoesVisitante";
import { BoasVindasWhatsapp } from "./BoasVindasWhatsapp";

export type PessoaVisitante = {
  id: string;
  nome: string;
  estado: "ativo" | "vencendo" | "vencido" | "permanente";
  prazo: string;
  diasRestantes: number | null;
  detalhes: string[];
  indicacao: string | null;
  questionarioPendente: boolean;
  semWhatsapp: boolean;
  ultimoTreino: string;
  telefone: string | null;
  mensagem: string;
};
export type Pendencia = { chave: string; emoji: string; texto: string; aba?: Aba; filtro?: Filtro; destaque?: boolean };

type Aba = "pessoas" | "convites" | "desafios" | "prontos";
type Filtro = "todos" | "em_dia" | "terminando" | "vencidos" | "pendentes";

const ABAS: Array<{ id: Aba; rotulo: string }> = [
  { id: "pessoas", rotulo: "👥 Pessoas" },
  { id: "convites", rotulo: "🎟️ Convites" },
  { id: "desafios", rotulo: "🏁 Desafios" },
  { id: "prontos", rotulo: "📊 Treinos prontos" },
];
const FILTROS: Array<{ id: Filtro; rotulo: string }> = [
  { id: "todos", rotulo: "Todos" },
  { id: "em_dia", rotulo: "Em dia" },
  { id: "terminando", rotulo: "Terminando" },
  { id: "vencidos", rotulo: "Terminaram" },
  { id: "pendentes", rotulo: "Falta algo" },
];

const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const passa = (p: PessoaVisitante, f: Filtro) =>
  f === "todos" ? true : f === "em_dia" ? p.estado === "ativo" || p.estado === "permanente" : f === "terminando" ? p.estado === "vencendo" : f === "vencidos" ? p.estado === "vencido" : p.questionarioPendente || p.semWhatsapp;
const COR: Record<PessoaVisitante["estado"], string> = { ativo: "bg-success", permanente: "bg-success", vencendo: "bg-gold", vencido: "bg-red" };

export function VisitantesPainel({ pessoas, pendencias, numeros, urgentes, convites, desafios, prontos }: { pessoas: PessoaVisitante[]; pendencias: Pendencia[]; numeros: { emDia: number; terminando: number; vencidos: number }; urgentes: ReactNode; convites: ReactNode; desafios: ReactNode; prontos: ReactNode }) {
  const router = useRouter();
  const params = useSearchParams();
  const abaUrl = params.get("aba") as Aba | null;
  const [aba, setAba] = useState<Aba>(ABAS.some((a) => a.id === abaUrl) ? abaUrl! : "pessoas");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [q, setQ] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);

  const irPara = (a: Aba, f?: Filtro) => {
    setAba(a);
    if (f) setFiltro(f);
    const p = new URLSearchParams(params.toString());
    if (a === "pessoas") p.delete("aba"); else p.set("aba", a);
    router.replace(`?${p.toString()}`, { scroll: false });
  };

  const lista = useMemo(() => {
    const termos = sem(q).split(/\s+/).filter(Boolean);
    const ordem = { vencendo: 0, ativo: 1, permanente: 2, vencido: 3 } as const;
    return pessoas
      .filter((p) => passa(p, filtro) && termos.every((t) => sem(p.nome).includes(t)))
      .sort((a, b) => ordem[a.estado] - ordem[b.estado] || (a.diasRestantes ?? 999) - (b.diasRestantes ?? 999) || a.nome.localeCompare(b.nome, "pt-BR"));
  }, [pessoas, filtro, q]);
  const contar = (f: Filtro) => pessoas.filter((p) => passa(p, f)).length;

  return (
    <div className="space-y-4">
      {/* Números do dia: tocar filtra a lista. */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { n: numeros.emDia, t: "em dia", f: "em_dia" as Filtro, cor: "text-success" },
          { n: numeros.terminando, t: "terminando", f: "terminando" as Filtro, cor: "text-gold" },
          { n: numeros.vencidos, t: "terminaram", f: "vencidos" as Filtro, cor: "text-fg-muted" },
        ].map((k) => (
          <button key={k.t} type="button" onClick={() => irPara("pessoas", k.f)} className="rounded-xl border border-border bg-card px-2 py-3">
            <span className={`block text-2xl font-black ${k.cor}`}>{k.n}</span>
            <span className="text-xs text-fg-muted">{k.t}</span>
          </button>
        ))}
      </div>

      {/* Precisa de você: só o que pede ação agora. */}
      <section className={`rounded-2xl border p-4 ${pendencias.length ? "border-accent/50 bg-accent/5" : "border-border bg-card"}`} aria-label="Precisa de você">
        <h2 className="text-sm font-bold">{pendencias.length ? "🔔 Precisa de você" : "✅ Tudo em dia por aqui"}</h2>
        {pendencias.length ? (
          <ul className="mt-2 space-y-1.5">
            {pendencias.map((p) => (
              <li key={p.chave}>
                <button type="button" onClick={() => (p.aba ? irPara(p.aba, p.filtro) : document.getElementById("urgentes")?.scrollIntoView({ behavior: "smooth" }))} className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm ${p.destaque ? "bg-accent/15 font-semibold" : "bg-bg/40"}`}>
                  <span>{p.emoji} {p.texto}</span>
                  <span aria-hidden className="text-accent">→</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-fg-muted">Nenhum treino para montar, desconto para aplicar ou acesso terminando.</p>
        )}
      </section>

      <div id="urgentes">{urgentes}</div>

      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border">
        {ABAS.map((a) => (
          <button key={a.id} role="tab" type="button" aria-selected={aba === a.id} onClick={() => irPara(a.id)} className={`-mb-px shrink-0 border-b-2 px-3 py-3 text-sm font-semibold ${aba === a.id ? "border-accent text-accent" : "border-transparent text-fg-muted"}`}>
            {a.rotulo}
          </button>
        ))}
      </div>

      {aba === "pessoas" ? (
        <div className="space-y-3">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 Buscar visitante pelo nome" aria-label="Buscar visitante" className="h-12 w-full rounded-xl border border-border bg-card px-4 text-base focus:border-accent focus:outline-none" />
          <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filtrar">
            {FILTROS.map((f) => (
              <button key={f.id} type="button" aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${filtro === f.id ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted"}`}>
                {f.rotulo} ({contar(f.id)})
              </button>
            ))}
          </div>
          {lista.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-fg-muted">{pessoas.length ? "Ninguém com esse filtro." : "Ninguém entrou ainda. Crie um convite na aba 🎟️ Convites e mande o link."}</p>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
              {lista.map((p) => {
                const abre = aberto === p.id;
                return (
                  <li key={p.id}>
                    <button type="button" aria-expanded={abre} onClick={() => setAberto(abre ? null : p.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                      <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${COR[p.estado]}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{p.nome}</span>
                        <span className="block text-xs text-fg-muted">{p.prazo} · último treino {p.ultimoTreino}</span>
                        {p.questionarioPendente || p.semWhatsapp ? <span className="block text-[11px] text-gold">{[p.semWhatsapp ? "sem WhatsApp" : null, p.questionarioPendente ? "questionário pendente" : null].filter(Boolean).join(" · ")}</span> : null}
                      </span>
                      <span aria-hidden className="text-fg-subtle">{abre ? "▲" : "▼"}</span>
                    </button>
                    {abre ? (
                      <div className="space-y-3 border-t border-border bg-bg/40 px-4 py-3">
                        {p.detalhes.length ? <p className="text-xs text-fg-muted">{p.detalhes.join(" · ")}</p> : null}
                        {p.indicacao ? <p className="text-xs font-semibold text-accent">{p.indicacao}</p> : null}
                        <BoasVindasWhatsapp id={p.id} telefone={p.telefone} mensagem={p.mensagem} />
                        <AcoesVisitante id={p.id} vencido={p.estado === "vencido"} />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : aba === "convites" ? (
        convites
      ) : aba === "desafios" ? (
        desafios
      ) : (
        prontos
      )}
    </div>
  );
}
