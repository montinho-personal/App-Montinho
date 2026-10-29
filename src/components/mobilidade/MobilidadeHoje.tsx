// “🧘 Sua mobilidade de hoje” (pedido do Montinho, 29/10/2026): para quem tem
// mobilidade indicada (anamnese ou personal). Aparece todo dia até fazer; cita
// o troféu em jogo e o porquê (saúde e desempenho). Feita hoje → ✅ curto.
import Link from "next/link";
import type { MobilidadeIndicada } from "@/lib/data/mobilidade-indicada";
import { beneficioDoDia, lembrarHoje, nomeCurto, textoDias } from "@/lib/mobilidade/indicacao";
import { PROTOCOLOS } from "@/lib/mobilidade/protocolos";
import { trofeuEmJogo } from "@/lib/push/mobilidade";

export function MobilidadeHoje({ dados, hoje, trofeus, compacto = false }: { dados: MobilidadeIndicada; hoje: string; trofeus: string[]; compacto?: boolean }) {
  const { m, s } = dados;
  const p = PROTOCOLOS[s.hoje];
  const trofeu = trofeuEmJogo({ protocolo: s.hoje, protocolos: m.protocolos, trofeus });
  if (!lembrarHoje(s)) {
    if (compacto) return null;
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-success/40 bg-card px-4 py-3">
        <p className="text-sm"><span aria-hidden>✅</span> <span className="font-bold">{s.feitaHoje ? "Mobilidade feita hoje." : "Mobilidade da semana cumprida!"}</span> <span className="text-fg-muted">{s.diasNaSemana} de {m.diasSemana >= 7 ? 7 : m.diasSemana} nesta semana.</span></p>
        <Link href="/aluno/mobilidade" className="shrink-0 text-xs font-semibold text-accent">Ver →</Link>
      </div>
    );
  }
  return (
    <section aria-label="Sua mobilidade de hoje" className="space-y-2 rounded-2xl border border-accent/50 bg-grain-strong p-4">
      <div className="flex items-start gap-3">
        <span aria-hidden className="text-3xl">🧘</span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Sua mobilidade de hoje</p>
          <h2 className="font-black leading-tight">{p.nome} · ~{p.minutos} min</h2>
          <p className="text-xs text-fg-muted">{m.motivo} · {textoDias(m.diasSemana)}{m.diasSemana < 7 ? ` · ${s.diasNaSemana} de ${m.diasSemana} nesta semana` : ""}</p>
        </div>
      </div>
      <p className="text-sm leading-relaxed">{beneficioDoDia(hoje)}</p>
      {trofeu ? <p className="rounded-lg border border-accent/40 bg-bg/50 px-3 py-2 text-xs"><span aria-hidden>🏆</span> Concluindo pelo app você ganha o troféu <span className="font-bold text-accent">“{trofeu}”</span>.</p> : null}
      <Link href={`/aluno/mobilidade/${s.hoje}`} className="touch flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-black text-bg">▶ Fazer a mobilidade agora</Link>
      {m.protocolos.length > 1 ? <p className="text-center text-[11px] text-fg-subtle">Indicadas para você: {m.protocolos.map(nomeCurto).join(" e ")}. Hoje é a vez de {nomeCurto(s.hoje).toLowerCase()}.</p> : null}
    </section>
  );
}
