// Topo do Ranking (0138): faixa no Ranking. Chegar ao 1º lugar não dá troféu
// (só avisa o personal no Celebrar); troféu é para quem SEGURA o topo.
// Aluno no 1º lugar vê há quantos dias está lá e quanto falta para o próximo
// troféu; quem não está vê o convite. O personal vê quem lidera + Celebrar.
import Link from "next/link";
import { MARCOS_TOPO, proximoDoTopo } from "@/lib/conquistas/topo-ranking";

const diasTxt = (n: number) => (n === 1 ? "desde hoje" : `há ${n} dias seguidos`);

export function TopoDoRanking({ modo, dias, nome, ganhos }: { modo: "aluno" | "personal"; dias: number | null; nome?: string | null; ganhos?: ReadonlySet<string> }) {
  if (modo === "personal") {
    if (!dias || !nome) return null;
    const prox = proximoDoTopo(dias, new Set());
    return (
      <section aria-label="Topo do ranking" className="flex items-center gap-3 rounded-2xl border border-amber-400/50 bg-amber-400/10 p-3">
        <span className="text-3xl" aria-hidden>👑</span>
        <span className="min-w-0 flex-1 text-sm">
          <b>{nome}</b> está em 1º lugar {diasTxt(dias)}.
          <span className="block text-xs text-fg-muted">{prox ? `Com mais ${prox.faltam} ${prox.faltam === 1 ? "dia" : "dias"} no topo ganha o “${prox.titulo}”.` : "Já tem todos os troféus do topo."} Toda chegada ao 1º lugar aparece no Celebrar para você mandar os parabéns.</span>
        </span>
        <Link href="/treinador/conquistas" className="alvo shrink-0 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-bg">🎉 Celebrar</Link>
      </section>
    );
  }
  if (dias) {
    const prox = proximoDoTopo(dias, ganhos ?? new Set());
    return (
      <section aria-label="Você está no topo" className="rounded-2xl border border-amber-400/50 bg-amber-400/10 p-3 text-sm">
        <p className="font-black">👑 Você está em 1º lugar {diasTxt(dias)}!</p>
        <p className="text-xs text-fg-muted">{prox ? `Segure o topo por mais ${prox.faltam} ${prox.faltam === 1 ? "dia" : "dias"} e ganhe o troféu “${prox.titulo}”.` : "Você já tem todos os troféus do topo. Lenda!"}</p>
      </section>
    );
  }
  return (
    <p className="rounded-xl border border-border bg-card px-3 py-2 text-xs text-fg-muted">
      👑 Chegue ao 1º lugar e segure: dias seguidos no topo valem troféu — {MARCOS_TOPO.map((m) => `${m.dias} dias = ${m.titulo}`).join(" · ")}.
    </p>
  );
}
