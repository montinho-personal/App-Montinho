// Treinos feitos de todos os alunos (o “feed” do dia do personal): quem treinou,
// o que fez e o que anotou, com filtro de anotações e alertas.
import Link from "next/link";
import { requireTreinadorPage } from "@/lib/auth/session";
import { dataLocal } from "@/lib/aderencia/calcular";
import { treinosFeitosRecentes } from "@/lib/data/treinos-feitos";
import { TreinosFeitosLista } from "@/components/historico/TreinosFeitosLista";

export const metadata = { title: "Treinos feitos" };
export const dynamic = "force-dynamic";

const PERIODOS = [1, 7, 30] as const;

export default async function TreinosFeitosPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  await requireTreinadorPage();
  const { dias: d } = await searchParams;
  const dias = PERIODOS.includes(Number(d) as 1 | 7 | 30) ? Number(d) : 7;
  const hoje = dataLocal(new Date());
  const lista = (await treinosFeitosRecentes(dias).catch(() => [])).filter((t) => dias !== 1 || t.data === hoje);
  const deHoje = lista.filter((t) => t.data === hoje).length;
  const notas = lista.filter((t) => t.anotacoes.length).length;
  const alertas = lista.filter((t) => t.sinais.some((s) => s === "dor" || s === "desconforto" || s === "nao_consegui")).length;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-2xl font-black">📋 Treinos feitos</h1>
        <p className="mt-1 text-sm text-fg-muted">Quem treinou, o que fez e o que anotou. Toque num treino para ver cada série.</p>
      </header>
      <div className="flex gap-2" role="group" aria-label="Período">
        {PERIODOS.map((p) => (
          <Link key={p} href={`/treinador/treinos-feitos?dias=${p}`} aria-current={dias === p ? "true" : undefined} className={`touch inline-flex flex-1 items-center justify-center rounded-full border text-sm font-semibold ${dias === p ? "border-accent bg-accent text-bg" : "border-border text-fg-muted"}`}>
            {p === 1 ? "Hoje" : `${p} dias`}
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl border border-border bg-card px-2 py-3"><p className="text-2xl font-black">{deHoje}</p><p className="text-[11px] text-fg-muted">treinos hoje</p></div>
        <div className="rounded-2xl border border-accent/40 bg-accent/10 px-2 py-3"><p className="text-2xl font-black text-accent">{notas}</p><p className="text-[11px] text-fg-muted">com anotações</p></div>
        <div className={`rounded-2xl border px-2 py-3 ${alertas ? "border-danger/40 bg-danger/10" : "border-border bg-card"}`}><p className={`text-2xl font-black ${alertas ? "text-danger" : ""}`}>{alertas}</p><p className="text-[11px] text-fg-muted">com alerta</p></div>
      </div>
      <TreinosFeitosLista lista={lista} hoje={hoje} comAluno />
    </div>
  );
}
