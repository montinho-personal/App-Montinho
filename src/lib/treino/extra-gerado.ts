// ============================================================================
// Treino extra montado pelo app (PURO, testado).
//
// Estratégia combinada com o Montinho em 22/10/2026:
//   1. Extra só depois da semana cumprida: fez TODOS os treinos programados
//      da semana (ex.: 4 de 4). Antes disso, o app manda de volta para a
//      sequência.
//   2. Três perguntas de um toque: tempo (15–60 min), foco (músculos
//      prioridade, full body leve, músculos pequenos) e como está o corpo.
//   3. O app monta com exercícios do PRÓPRIO plano (carga anterior, vídeo e
//      recado do Montinho já vêm junto) e o extra sai liberado direto.
//
// Segurança (não depende da escolha do aluno):
//   • músculo treinado nas últimas 48 h fica de fora;
//   • músculo do próximo treino da sequência fica de fora quando ele é
//     amanhã (não atrapalhar o treino seguinte);
//   • séries longe da falha (RIR 2–3), sem técnica avançada, sem aquecimento
//     extra, 1 faixa de repetições;
//   • teto de séries extras da semana (o do personal, padrão 12);
//   • cansado = menos séries; dor = nada de extra.
// ============================================================================

import type { ExercicioPrescrito } from "@/lib/supabase/types-sessoes";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import { GRUPO_LABEL } from "@/lib/grupos";
import { estimarPrescricao } from "@/lib/tempo/prescricao";
import type { ParametrosTempo } from "@/lib/tempo/estimar";

export const TEMPOS_EXTRA_MIN = [15, 20, 30, 45, 60] as const;
export type TempoExtra = (typeof TEMPOS_EXTRA_MIN)[number];

export const FOCOS_EXTRA = {
  prioridade: { rotulo: "Meus músculos prioridade", detalhe: "Os músculos que o Montinho marcou como foco do seu plano." },
  full_body: { rotulo: "Full body leve", detalhe: "Um exercício de empurrar, um de puxar, um de perna e um de core." },
  pequenos: { rotulo: "Músculos pequenos", detalhe: "Braços, ombros, panturrilha e abdômen: recuperam mais rápido." },
} as const;
export type FocoExtra = keyof typeof FOCOS_EXTRA;

export type CorpoExtra = "bem" | "cansado" | "dor";

export const REGRAS_EXTRA_GERADO = {
  horasRecuperacao: 48,
  seriesPorExercicio: 3,
  seriesPorExercicioCansado: 2,
  rir: 2,
  ieMax: 7,
  maxExercicios: 6,
};

/** Grupos que recuperam rápido (para o foco "músculos pequenos"). */
export const GRUPOS_PEQUENOS: GrupoMuscular[] = ["biceps", "triceps", "antebraco", "ombro_lateral", "ombro_posterior", "ombro_anterior", "ombros", "panturrilha", "abdomen", "core"];

/** Full body: um padrão por vez, nesta ordem. */
const PADROES_FULL_BODY: Array<{ nome: string; grupos: GrupoMuscular[] }> = [
  { nome: "perna", grupos: ["quadriceps", "gluteo", "posteriores", "pernas"] },
  { nome: "empurrar", grupos: ["peito", "ombros", "ombro_anterior", "triceps"] },
  { nome: "puxar", grupos: ["costas", "ombro_posterior", "biceps", "trapezio"] },
  { nome: "core", grupos: ["abdomen", "core"] },
];

export type EntradaExtraGerado = {
  /** Exercícios ativos de todos os treinos do plano, na ordem do plano. */
  exercicios: ExercicioPrescrito[];
  prioridades: string[];
  foco: FocoExtra;
  tempoMin: number;
  corpo: CorpoExtra;
  /** Grupos treinados nas últimas 48 h. */
  recentes48h: GrupoMuscular[];
  /** Grupos do próximo treino da sequência. */
  proximoTreino: GrupoMuscular[];
  /** Séries extras ainda permitidas nesta semana (limite do personal − já feitas). */
  seriesDisponiveis: number;
  tempos?: Partial<ParametrosTempo> | null;
};

export type ExtraGerado = {
  titulo: string;
  exercicios: ExercicioPrescrito[];
  series: number;
  duracaoMin: number;
  grupos: GrupoMuscular[];
  /** Por que alguns grupos ficaram de fora (para o aluno entender). */
  avisos: string[];
};

export type ResultadoExtraGerado = { ok: true; extra: ExtraGerado } | { ok: false; motivo: string; sugerirFoco?: FocoExtra };

const rotulo = (g: GrupoMuscular) => (GRUPO_LABEL[g] ?? g).toLowerCase();
const lista = (gs: GrupoMuscular[]) => {
  const r = [...new Set(gs)].map(rotulo);
  return r.length <= 1 ? (r[0] ?? "") : `${r.slice(0, -1).join(", ")} e ${r.at(-1)}`;
};

/** Só a primeira faixa ("10-12/8-10/6-8" → "10-12"); "45s/60s" → "45s". */
export function primeiraFaixa(reps: string | null | undefined): string {
  const r = (reps ?? "").split("/")[0]?.trim();
  return r || "10-12";
}

/** O exercício do plano na versão extra: simples, longe da falha. */
export function versaoExtra(e: ExercicioPrescrito, series: number): ExercicioPrescrito {
  return {
    ...e,
    series,
    reps: primeiraFaixa(e.reps),
    series_aquecimento: 0,
    tecnica: "normal" as ExercicioPrescrito["tecnica"],
    tecnica_extras: null,
    tecnica_series: null,
    tecnica_config: null,
    series_config: null,
    bloco: null,
    rir: REGRAS_EXTRA_GERADO.rir,
    ie: Math.min(e.ie ?? REGRAS_EXTRA_GERADO.ieMax, REGRAS_EXTRA_GERADO.ieMax),
    carga_alvo: null,
  };
}

export function montarExtraGerado(e: EntradaExtraGerado): ResultadoExtraGerado {
  const R = REGRAS_EXTRA_GERADO;
  if (e.corpo === "dor") return { ok: false, motivo: "Com dor ou desconforto, hoje não tem extra. Conte para o Montinho o que está sentindo: ele ajusta com você." };
  if (e.seriesDisponiveis <= 0) return { ok: false, motivo: "Você já fez todas as séries extras combinadas para esta semana. Recuperação também faz parte do treino." };

  const fora = new Set<GrupoMuscular>([...e.recentes48h, ...e.proximoTreino]);
  const avisos: string[] = [];
  const recentes = [...new Set(e.recentes48h)];
  const doProximo = [...new Set(e.proximoTreino.filter((g) => !e.recentes48h.includes(g)))];

  // Candidatos: exercícios do plano que contam volume, um por nome.
  const vistos = new Set<string>();
  const candidatos = e.exercicios.filter((x) => {
    if (!x.grupo_muscular || x.conta_volume === false || x.removido_em) return false;
    if (["cardio", "nao_classificado", "outro", "full_body"].includes(x.grupo_muscular)) return false;
    const k = x.nome.trim().toLowerCase();
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
  const livre = (x: ExercicioPrescrito) => !fora.has(x.grupo_muscular!) && !(x.grupos_secundarios ?? []).some((g) => recentes.includes(g) && ["quadriceps", "gluteo", "posteriores", "peito", "costas"].includes(g));

  const escolhidos: ExercicioPrescrito[] = [];
  if (e.foco === "prioridade") {
    const prio = e.prioridades.filter(Boolean) as GrupoMuscular[];
    if (!prio.length) return { ok: false, motivo: "Seu plano ainda não tem músculos prioridade marcados. Escolha full body leve ou músculos pequenos.", sugerirFoco: "pequenos" };
    const descansando = prio.filter((g) => fora.has(g));
    if (descansando.length === prio.length) {
      return { ok: false, motivo: `Seus músculos prioridade (${lista(prio)}) ${recentes.some((g) => prio.includes(g)) ? "foram treinados há menos de 48 h" : "estão no seu próximo treino"}. Hoje é melhor deixar eles recuperarem: que tal os músculos pequenos?`, sugerirFoco: "pequenos" };
    }
    // Alterna entre os grupos prioridade para não concentrar tudo em um só.
    const porGrupo = prio.filter((g) => !fora.has(g)).map((g) => candidatos.filter((x) => x.grupo_muscular === g && livre(x)));
    for (let i = 0; escolhidos.length < R.maxExercicios && porGrupo.some((l) => l[i]); i++) for (const l of porGrupo) if (l[i]) escolhidos.push(l[i]);
  } else if (e.foco === "full_body") {
    for (const p of PADROES_FULL_BODY) {
      const x = candidatos.find((c) => p.grupos.includes(c.grupo_muscular!) && livre(c) && !escolhidos.includes(c));
      if (x) escolhidos.push(x);
    }
    const faltam = PADROES_FULL_BODY.filter((p) => !escolhidos.some((x) => p.grupos.includes(x.grupo_muscular!))).map((p) => p.nome);
    if (faltam.length) avisos.push(`Sem ${faltam.join(", ")} hoje: esses músculos ainda estão recuperando ou estão no seu próximo treino.`);
  } else {
    const porGrupo = GRUPOS_PEQUENOS.filter((g) => !fora.has(g)).map((g) => candidatos.filter((x) => x.grupo_muscular === g && livre(x)));
    for (let i = 0; escolhidos.length < R.maxExercicios && porGrupo.some((l) => l[i]); i++) for (const l of porGrupo) if (l[i] && escolhidos.length < R.maxExercicios) escolhidos.push(l[i]);
  }
  if (!escolhidos.length) {
    return { ok: false, motivo: "Não sobrou exercício do seu plano para esse foco hoje: os músculos dele ainda estão recuperando ou estão no seu próximo treino. Tente outro foco.", sugerirFoco: e.foco === "pequenos" ? "full_body" : "pequenos" };
  }
  if (recentes.length) avisos.push(`Ficaram de fora: ${lista(recentes)} (treinados há menos de ${R.horasRecuperacao} h).`);
  if (doProximo.length) avisos.push(`Também de fora: ${lista(doProximo)}, que estão no seu próximo treino.`);

  // Séries por exercício e corte pelo tempo e pelo teto da semana.
  const porEx = e.corpo === "cansado" ? R.seriesPorExercicioCansado : R.seriesPorExercicio;
  let restantes = e.seriesDisponiveis;
  let montado: ExercicioPrescrito[] = [];
  for (const x of escolhidos) {
    if (restantes <= 0) break;
    const s = Math.min(porEx, restantes);
    const tentativa = [...montado, versaoExtra(x, s)];
    const seg = estimarPrescricao(tentativa, e.tempos).totalSeg;
    if (seg > e.tempoMin * 60 && montado.length) break;
    montado = tentativa;
    restantes -= s;
  }
  // Até no tempo mínimo cabe pelo menos 1 exercício; se nem ele cabe, encurta as séries.
  while (montado.length === 1 && estimarPrescricao(montado, e.tempos).totalSeg > e.tempoMin * 60 && montado[0].series > 1) montado = [versaoExtra(escolhidos[0], montado[0].series - 1)];
  if (e.corpo === "cansado") avisos.push("Você está um pouco cansado: o extra veio com menos séries.");

  const series = montado.reduce((n, x) => n + x.series, 0);
  const duracaoMin = Math.max(5, Math.round(estimarPrescricao(montado, e.tempos).totalSeg / 60));
  const grupos = [...new Set(montado.map((x) => x.grupo_muscular!))];
  const titulo = `Extra: ${FOCOS_EXTRA[e.foco].rotulo.replace(/^Meus /, "").toLowerCase()}`;
  return { ok: true, extra: { titulo: titulo.charAt(0).toUpperCase() + titulo.slice(1), exercicios: montado, series, duracaoMin, grupos, avisos } };
}

/** Semana cumprida = fez todos os treinos programados (concluídos, não parciais). */
export function semanaCumprida(feitos: number, programados: number | null): boolean {
  return !!programados && programados > 0 && feitos >= programados;
}

// ---------------------------------------------------------------------------
// "Eu monto": o aluno escolhe (tocando ou falando) os exercícios do extra.
// Ele decide o quê; o app só confere a segurança: dor, 48 h por músculo e o
// teto de séries extras da semana. Pedido do Montinho, 22/10/2026.
// ---------------------------------------------------------------------------
export const LIMITES_EXTRA_LIVRE = { maxExercicios: 8, maxSeries: 5, seriesPadrao: 3, repsPadrao: "10-12" };

export type ItemExtraLivre = {
  /** Exercício do plano (traz carga anterior e recado) ou montado a partir da biblioteca. */
  exercicio: ExercicioPrescrito;
  series: number;
  reps: string;
};

export function montarExtraLivre(e: { itens: ItemExtraLivre[]; corpo: CorpoExtra; recentes48h: GrupoMuscular[]; seriesDisponiveis: number; tempos?: Partial<ParametrosTempo> | null }): ResultadoExtraGerado {
  const L = LIMITES_EXTRA_LIVRE;
  if (e.corpo === "dor") return { ok: false, motivo: "Com dor ou desconforto, hoje não tem extra. Conte para o Montinho o que está sentindo: ele ajusta com você." };
  if (!e.itens.length) return { ok: false, motivo: "Escolha pelo menos um exercício." };
  if (e.itens.length > L.maxExercicios) return { ok: false, motivo: `No máximo ${L.maxExercicios} exercícios no extra.` };
  const descansando = e.itens.filter((i) => i.exercicio.grupo_muscular && e.recentes48h.includes(i.exercicio.grupo_muscular));
  if (descansando.length) {
    return { ok: false, motivo: `${descansando.map((i) => `${i.exercicio.nome} (${rotulo(i.exercicio.grupo_muscular!)})`).join(", ")}: ${descansando.length > 1 ? "esses músculos foram treinados" : "esse músculo foi treinado"} há menos de ${REGRAS_EXTRA_GERADO.horasRecuperacao} h. Troque por outro exercício: recuperação também faz parte do treino.` };
  }
  const total = e.itens.reduce((n, i) => n + i.series, 0);
  if (total > e.seriesDisponiveis) return { ok: false, motivo: `Seu extra tem ${total} séries e o limite desta semana é ${e.seriesDisponiveis}. Tire ${total - e.seriesDisponiveis} série${total - e.seriesDisponiveis > 1 ? "s" : ""} ou um exercício.` };
  const exercicios = e.itens.map((i) => ({ ...versaoExtra(i.exercicio, Math.min(L.maxSeries, Math.max(1, Math.round(i.series)))), reps: (i.reps || L.repsPadrao).slice(0, 20) }));
  const avisos = e.corpo === "cansado" ? ["Você marcou que está um pouco cansado: se pesar, faça menos séries. O descanso também conta."] : [];
  const grupos = [...new Set(exercicios.map((x) => x.grupo_muscular).filter(Boolean))] as GrupoMuscular[];
  return { ok: true, extra: { titulo: "Extra: do meu jeito", exercicios, series: total, duracaoMin: Math.max(5, Math.round(estimarPrescricao(exercicios, e.tempos).totalSeg / 60)), grupos, avisos } };
}
