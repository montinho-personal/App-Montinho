// Topo do Ranking (0138): faixa no Ranking. Chegar ao 1º lugar não dá troféu
// (só avisa o personal no Celebrar); troféu é para quem SEGURA o topo.
// Aluno no 1º lugar vê há quantos dias está lá e quanto falta para o próximo
// troféu; quem não está vê o convite. O personal vê quem lidera + Celebrar.
import Link from "next/link";
import { lembreteDoTopo, MARCOS_TOPO, proximoDoTopo } from "@/lib/conquistas/topo-ranking";

const diasTxt = (n: number) => (n === 1 ? "desde hoje" : `há ${n} dias seguidos`);

export function TopoDoRanking({ modo, dias, nome, ganhos, link }: { modo: "aluno" | "personal"; dias: number | null; nome?: string | null; ganhos?: ReadonlySet<string>; link?: boolean }) {
  if (modo === "personal") {
    if (!dias || !nome) return null;
    const prox = proximoDoTopo(dias, new Set());
    return (
      <section aria-label="Topo do ranking" className="flex items-center gap-3 rounded-2xl border border-amber-400/50 bg-amber-400/10 p-3">
        <span className="text-3xl" aria-hidden>👑</span>
        <span className="min-w-0 flex-1 text-sm">
          <b>{nome}</b> está em 1º lugar {diasTxt(dias)}.
          <span className="block text-xs text-fg-muted">{prox ? `Com mais ${prox.faltam} ${prox.faltam === 1 ? "dia" : "dias"} no topo ganha o “${prox.titulo}”.` : "Já tem todos os troféus do topo."} A liderança só muda no fim do dia (23h50): quem passar à frente durante o dia assume amanhã. Toda chegada ao 1º lugar aparece no Celebrar para você mandar os parabéns.</span>
        </span>
        <Link href="/treinador/conquistas" className="alvo shrink-0 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-bg">🎉 Celebrar</Link>
      </section>
    );
  }
  if (dias) {
    const g = ganhos ?? new Set<string>();
    const prox = proximoDoTopo(dias, g);
    const recado = lembreteDoTopo(dias, g);
    return (
      <section aria-label="Você está no topo" className="space-y-2 rounded-2xl border border-amber-400/50 bg-amber-400/10 p-3 text-sm">
        <p className="font-black">{recado?.titulo ?? `👑 Você está em 1º lugar ${diasTxt(dias)}!`}</p>
        <p className="text-xs text-fg-muted">{recado?.corpo ?? (prox ? `Segure o topo por mais ${prox.faltam} ${prox.faltam === 1 ? "dia" : "dias"} e ganhe o troféu “${prox.titulo}”.` : "Você já tem todos os troféus do topo. Lenda!")} A liderança só muda no fim do dia: termine o dia na frente!</p>
        {prox ? (
          <div aria-label={`${dias} de ${dias + prox.faltam} dias para o ${prox.titulo}`}>
            <div className="h-2 overflow-hidden rounded-full bg-border"><div className="h-full bg-amber-400" style={{ width: `${Math.round((dias / (dias + prox.faltam)) * 100)}%` }} /></div>
            <p className="mt-1 text-[11px] text-fg-subtle">{dias} de {dias + prox.faltam} dias para o {prox.titulo}</p>
          </div>
        ) : null}
        {link ? <a href="/aluno/ranking" className="alvo inline-block text-xs font-semibold text-accent underline-offset-2 hover:underline">Ver o ranking →</a> : null}
      </section>
    );
  }
  return (
    <p className="rounded-xl border border-border bg-card px-3 py-2 text-xs text-fg-muted">
      👑 Chegue ao 1º lugar e segure: a liderança é decidida no fim de cada dia, e dias seguidos no topo valem troféu — {MARCOS_TOPO.map((m) => `${m.dias} dias = ${m.titulo}`).join(" · ")}.
    </p>
  );
}
