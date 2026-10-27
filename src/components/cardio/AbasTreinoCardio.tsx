// Duas portas para montar o treino do aluno (pedido do Montinho, 28/10/2026):
// 🏋️ Musculação (montador) e ❤️ Cardio (prescrição de cardio). Aparecem na
// ficha e no topo das duas telas, para trocar de uma para a outra.
import Link from "next/link";

export function AbasTreinoCardio({ alunoId, ativo, resumoCardio }: { alunoId: string; ativo?: "musculacao" | "cardio"; /** Ex.: “2 cardios · 150 min/semana” ou “Sem cardio prescrito”. */ resumoCardio?: string | null }) {
  const caixa = (on: boolean) =>
    `touch flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-3 py-3 text-center font-bold ${on ? "border-accent bg-accent text-bg" : "border-accent/70 text-accent hover:bg-accent/10"}`;
  return (
    <nav className="grid grid-cols-2 gap-2" aria-label="Montar treino do aluno">
      <Link href={`/treinador/alunos/${alunoId}/treinos`} className={caixa(ativo === "musculacao")} aria-current={ativo === "musculacao" ? "page" : undefined}>
        <span aria-hidden className="text-xl">🏋️</span>
        <span className="text-sm">Treino de musculação</span>
      </Link>
      <Link href={`/treinador/alunos/${alunoId}/cardio`} className={caixa(ativo === "cardio")} aria-current={ativo === "cardio" ? "page" : undefined}>
        <span aria-hidden className="text-xl">❤️</span>
        <span className="text-sm">Treino de cardio</span>
        {resumoCardio ? <span className={`text-[11px] font-normal ${ativo === "cardio" ? "text-bg/80" : "text-fg-muted"}`}>{resumoCardio}</span> : null}
      </Link>
    </nav>
  );
}
