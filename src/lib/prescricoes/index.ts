// Prescrições prontas (ficha do personal transcrita e auditada) para cadastro
// com um clique, pelo mesmo caminho do montador (validação, versão, RLS).
import type { SalvarPlanoInput } from "@/lib/data/programas";
import type { ExtraInput } from "@/lib/data/extras";
import { normalizarNome } from "@/lib/grupos";
import * as missTerracos from "./miss-terracos-tambore";
import * as mrBellagio from "./missao-mr-bellagio";
import * as exMerendeira from "./projeto-ex-merendeira";
import * as corpoEsculpido from "./missao-corpo-esculpido";
import * as shapeLutador from "./operacao-shape-lutador";
import * as dublinHybrid from "./operacao-dublin-hybrid-queen";
import * as mrArena from "./operacao-mr-arena-18";
import * as pernasPoderosas from "./operacao-pernas-poderosas";
import * as galloMaromba from "./operacao-gallo-maromba";
import * as musaGreenValley from "./missao-musa-green-valley";

export type PrescricaoPronta = { id: string; titulo: string; alunoNome: string; plano: SalvarPlanoInput; pendencias: string[]; /** Treinos extras liberados criados junto no cadastro (sem duplicar pelo título). */ extras?: ExtraInput[] };

export const PRESCRICOES: PrescricaoPronta[] = [
  { id: missTerracos.ID_PRESCRICAO, titulo: `${missTerracos.ROTULO} — Upper/Lower 4×/semana`, alunoNome: missTerracos.NOME_ALUNA, plano: missTerracos.PRESCRICAO, pendencias: missTerracos.PENDENCIAS },
  { id: mrBellagio.ID_PRESCRICAO, titulo: `${mrBellagio.ROTULO} — Push/Pull/Legs/Push/Pull 5×/semana`, alunoNome: mrBellagio.NOME_ALUNO, plano: mrBellagio.PRESCRICAO, pendencias: mrBellagio.PENDENCIAS },
  { id: exMerendeira.ID_PRESCRICAO, titulo: `${exMerendeira.ROTULO} — Upper/Lower em sequência`, alunoNome: exMerendeira.NOME_ALUNA, plano: exMerendeira.PRESCRICAO, pendencias: exMerendeira.PENDENCIAS },
  { id: corpoEsculpido.ID_PRESCRICAO, titulo: `${corpoEsculpido.ROTULO} — 6 treinos (Seg a Sáb) + cardio no domingo`, alunoNome: corpoEsculpido.NOME_ALUNA, plano: corpoEsculpido.PRESCRICAO, pendencias: corpoEsculpido.PENDENCIAS },
  { id: shapeLutador.ID_PRESCRICAO, titulo: `${shapeLutador.ROTULO} — 5 treinos em sequência (A → E)`, alunoNome: shapeLutador.NOME_ALUNO, plano: shapeLutador.PRESCRICAO, pendencias: shapeLutador.PENDENCIAS },
  { id: dublinHybrid.ID_PRESCRICAO, titulo: `${dublinHybrid.ROTULO} — Inferiores/Superiores 4×/semana, com HYROX em bi-set`, alunoNome: dublinHybrid.NOME_ALUNA, plano: dublinHybrid.PRESCRICAO, pendencias: dublinHybrid.PENDENCIAS },
  { id: mrArena.ID_PRESCRICAO, titulo: `${mrArena.ROTULO} — Push/Legs/Pull em sequência (A → C)`, alunoNome: mrArena.NOME_ALUNO, plano: mrArena.PRESCRICAO, pendencias: mrArena.PENDENCIAS },
  { id: pernasPoderosas.ID_PRESCRICAO, titulo: `${pernasPoderosas.ROTULO} — 3 treinos em sequência (A → C) + Treino D (abdômen) como extra`, alunoNome: pernasPoderosas.NOME_ALUNA, plano: pernasPoderosas.PRESCRICAO, pendencias: pernasPoderosas.PENDENCIAS, extras: pernasPoderosas.EXTRAS },
  { id: galloMaromba.ID_PRESCRICAO, titulo: `${galloMaromba.ROTULO} — Push/Pull/Legs/Superiores em sequência (A → D)`, alunoNome: galloMaromba.NOME_ALUNO, plano: galloMaromba.PRESCRICAO, pendencias: galloMaromba.PENDENCIAS },
  { id: musaGreenValley.ID_PRESCRICAO, titulo: `${musaGreenValley.ROTULO} — Lower/Upper/Lower/Full Body em sequência (A → D)`, alunoNome: musaGreenValley.NOME_ALUNA, plano: musaGreenValley.PRESCRICAO, pendencias: musaGreenValley.PENDENCIAS },
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
