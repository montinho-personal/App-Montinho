// “Hora de revisar”: perguntas do Mito ou verdade que a pessoa errou e que
// voltaram (3, 7 e 14 dias depois). Regras em src/lib/desbloqueia/revisao.ts.
import Link from "next/link";

export function RevisarConhecimento({ agora, primeira, aprendidas, compacto = false }: { agora: number; primeira: string | null; aprendidas: number; compacto?: boolean }) {
  if (!agora || !primeira) {
    if (compacto || !aprendidas) return null;
    return <p className="text-xs text-fg-muted">✅ {aprendidas} {aprendidas === 1 ? "pergunta aprendida" : "perguntas aprendidas"} na revisão.</p>;
  }
  return (
    <Link href={`/aluno/descobertas/${primeira}`} className="flex items-center justify-between gap-3 rounded-xl border border-accent/50 bg-accent-soft/30 px-4 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-bold">🔁 Hora de revisar: {agora} {agora === 1 ? "pergunta" : "perguntas"}</span>
        <span className="block text-xs text-fg-muted">Do Mito ou verdade que não saíram da última vez. Bora acertar agora?</span>
      </span>
      <span className="shrink-0 text-sm font-semibold text-accent">Revisar →</span>
    </Link>
  );
}
