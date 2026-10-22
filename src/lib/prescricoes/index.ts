// Prescrições prontas (ficha do personal transcrita e auditada) para cadastro
// com um clique, pelo mesmo caminho do montador (validação, versão, RLS).
import type { SalvarPlanoInput } from "@/lib/data/programas";
import { normalizarNome } from "@/lib/grupos";
import * as missTerracos from "./miss-terracos-tambore";
import * as mrBellagio from "./missao-mr-bellagio";
import * as exMerendeira from "./projeto-ex-merendeira";

export type PrescricaoPronta = { id: string; titulo: string; alunoNome: string; plano: SalvarPlanoInput; pendencias: string[] };

export const PRESCRICOES: PrescricaoPronta[] = [
  { id: missTerracos.ID_PRESCRICAO, titulo: `${missTerracos.ROTULO} — Upper/Lower 4×/semana`, alunoNome: missTerracos.NOME_ALUNA, plano: missTerracos.PRESCRICAO, pendencias: missTerracos.PENDENCIAS },
  { id: mrBellagio.ID_PRESCRICAO, titulo: `${mrBellagio.ROTULO} — Push/Pull/Legs/Push/Pull 5×/semana`, alunoNome: mrBellagio.NOME_ALUNO, plano: mrBellagio.PRESCRICAO, pendencias: mrBellagio.PENDENCIAS },
  { id: exMerendeira.ID_PRESCRICAO, titulo: `${exMerendeira.ROTULO} — Upper/Lower em sequência`, alunoNome: exMerendeira.NOME_ALUNA, plano: exMerendeira.PRESCRICAO, pendencias: exMerendeira.PENDENCIAS },
];

export function prescricoesParaAluno(nome: string | null | undefined): PrescricaoPronta[] {
  const n = normalizarNome(nome ?? "");
  return n ? PRESCRICOES.filter((p) => normalizarNome(p.alunoNome) === n) : [];
}

/** Assinatura do conteúdo (letra, nome, séries/reps/descanso/RIR/técnica/bloco) — para não cadastrar duas vezes. */
export function assinaturaTreinos(treinos: Array<{ letra: string; ativo?: boolean; exercicios: Array<{ nome: string; reps: string; series: number; rir: number | null; tecnica: string; bloco: string | null; descanso_seg: number | null; series_config?: unknown }> }>): string {
  return JSON.stringify(
    treinos
      .filter((t) => t.ativo !== false)
      .sort((a, b) => (a.letra < b.letra ? -1 : 1))
      .map((t) => [t.letra, t.exercicios.map((e) => [normalizarNome(e.nome), e.series, e.reps, e.rir ?? null, e.tecnica, e.bloco ?? null, e.descanso_seg ?? null, JSON.stringify(e.series_config ?? null)])])
  );
}
