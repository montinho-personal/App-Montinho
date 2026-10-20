// ============================================================================
// Central de aderência — cálculo puro a partir de dados persistidos.
//
// ADERÊNCIA = pontos das sessões planejadas válidas ÷ meta das semanas × 100
//
// Regras (documentadas em ADERENCIA.md):
//  • Semana de segunda a domingo, no fuso do Brasil (America/Sao_Paulo).
//  • Meta da semana = meta vigente na SEGUNDA-FEIRA (mudanças no meio da
//    semana valem a partir da seguinte). Meta do personal tem prioridade; sem
//    ela, usa a frequência do programa daquela época (versões do plano).
//    Se o plano começou no meio da semana, usa o primeiro valor da semana.
//  • Sessão concluída (≥ 50% das séries) = 1 ponto; parcial (alguma série,
//    < 50%, ou encerrada com séries) = 0,5; sem séries não conta.
//  • Sessão extra não conta para a meta; pontos da semana nunca passam da meta.
//  • Pausa justificada cobrindo ≥ 4 dias da semana: semana fora do cálculo
//    (não conta como falta nem quebra a sequência). Semana sem prescrição idem.
//  • Índices usam semanas completas; a semana atual aparece à parte.
// ============================================================================

import type { Calendario } from "@/lib/volume/calcular";

export const FUSO = "America/Sao_Paulo";
export const FRACAO_CONCLUSAO = 0.5;
export const DIAS_PAUSA_PARA_EXCLUIR = 4;

export type SessaoAderencia = {
  id: string;
  iniciado_em: string;
  status: "em_andamento" | "concluida" | "abandonada";
  modo?: "normal" | "reduzido" | "extra" | null;
  /** "treinador" = aula presencial registrada pelo personal. */
  origem?: string | null;
  series_planejadas: number;
  series_concluidas: number;
  treino_id?: string | null;
  letra?: string | null;
  nome_treino?: string | null;
  duracao_seg?: number | null;
};

export type MetaVigente = { desde: string; meta: number; origem: "personal" | "programa" };
export type PausaAluno = { inicio: string; fim: string | null; tipo?: string; motivo?: string | null };
export type CalendarioVigente = { desde: string; calendario: Calendario | null };

export type EntradaAderencia = {
  sessoes: SessaoAderencia[];
  metas: MetaVigente[];
  pausas?: PausaAluno[];
  calendarios?: CalendarioVigente[];
  /** Início do acompanhamento (YYYY-MM-DD). */
  inicio: string;
  /** Hoje (YYYY-MM-DD, no fuso do Brasil). */
  hoje: string;
};

export type ClasseSessao = "concluida" | "parcial" | "extra" | "nao_conta" | "em_andamento";

export type StatusSemana = "cumprida" | "parcial" | "sem_treino" | "pausada" | "sem_prescricao" | "em_andamento";

export type Semana = {
  inicio: string;
  meta: number | null;
  /** Pontos válidos (concluídas + 0,5 × parciais), limitados à meta. */
  pontos: number;
  concluidas: number;
  parciais: number;
  extras: number;
  pausada: boolean;
  atual: boolean;
  status: StatusSemana;
};

export type Indice = { pct: number | null; pontos: number; meta: number; semanas: number };

export type TipoDia = "concluido" | "parcial" | "extra" | "remanejado" | "descanso_planejado" | "pausa" | "previsto" | "em_andamento";
export type Dia = { data: string; tipos: TipoDia[]; sessoes: string[] };

export type ResultadoAderencia = {
  semanas: Semana[];
  semanaAtual: Semana | null;
  indices: { semanaAtual: Indice; d28: Indice; s12: Indice; total: Indice };
  sequencia: { atual: number; melhor: number; semanasParticipando: number; semanasCumpridas: number };
  dias: Record<string, Dia>;
};

// ---------------------------------------------------------------------------
// Datas (strings YYYY-MM-DD, aritmética em UTC para não sofrer com fuso/horário de verão)
// ---------------------------------------------------------------------------
const fmtData = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" });

/** Data local (Brasil) de um instante ISO. */
export function dataLocal(iso: string | Date): string {
  return fmtData.format(typeof iso === "string" ? new Date(iso) : iso);
}
const paraUTC = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
const deUTC = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const somarDias = (d: string, n: number) => deUTC(paraUTC(d) + n * 86_400_000);
/** 0 = domingo … 6 = sábado. */
export const diaDaSemana = (d: string) => new Date(paraUTC(d)).getUTCDay();
/** Segunda-feira da semana de `d`. */
export const inicioDaSemana = (d: string) => somarDias(d, -((diaDaSemana(d) + 6) % 7));

// ---------------------------------------------------------------------------
export function classificarSessao(s: SessaoAderencia): ClasseSessao {
  if (s.status === "em_andamento") return "em_andamento";
  const feitas = Math.max(0, s.series_concluidas || 0);
  // Extra de atividade (cardio, mobilidade…) não tem séries: vale a duração registrada.
  if (s.modo === "extra") return feitas > 0 || (s.duracao_seg ?? 0) > 0 ? "extra" : "nao_conta";
  if (feitas === 0) return "nao_conta";
  if (s.status === "abandonada") return "parcial";
  const plan = Math.max(0, s.series_planejadas || 0);
  return plan === 0 || feitas / plan >= FRACAO_CONCLUSAO ? "concluida" : "parcial";
}

/** Meta vigente na segunda-feira `semana` (ou a primeira definida dentro dela). */
export function metaDaSemana(metas: MetaVigente[], semana: string): number | null {
  const fim = somarDias(semana, 6);
  const escolher = (origem: MetaVigente["origem"]) => {
    const lista = metas.filter((m) => m.origem === origem && m.meta > 0).sort((a, b) => (a.desde < b.desde ? -1 : 1));
    const antes = lista.filter((m) => m.desde <= semana).at(-1);
    if (antes) return antes.meta;
    const dentro = lista.find((m) => m.desde > semana && m.desde <= fim);
    return dentro ? dentro.meta : null;
  };
  return escolher("personal") ?? escolher("programa");
}

function diasPausados(pausas: PausaAluno[], semana: string, hoje: string): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const d = somarDias(semana, i);
    if (pausas.some((p) => p.inicio <= d && (p.fim ?? hoje) >= d)) out.add(d);
  }
  return out;
}

function calendarioDoDia(cals: CalendarioVigente[], d: string): Calendario | null {
  const ord = [...cals].sort((a, b) => (a.desde < b.desde ? -1 : 1));
  return ord.filter((c) => c.desde <= d).at(-1)?.calendario ?? ord[0]?.calendario ?? null;
}

/** Letra planejada para o dia na semana fixa; null = descanso planejado; undefined = sem calendário fixo. */
function planejadoNoDia(cal: Calendario | null, d: string): string | null | undefined {
  if (!cal || cal.modo !== "fixa" || !cal.dias?.length) return undefined;
  const dia = cal.dias.find((x) => x.dia === diaDaSemana(d));
  return dia ? dia.letra : null;
}

function indice(semanas: Semana[]): Indice {
  const validas = semanas.filter((s) => s.meta && !s.pausada);
  const meta = validas.reduce((n, s) => n + (s.meta ?? 0), 0);
  const pontos = validas.reduce((n, s) => n + s.pontos, 0);
  return { pct: meta > 0 ? Math.round((pontos / meta) * 100) : null, pontos, meta, semanas: validas.length };
}

export function calcularAderencia(e: EntradaAderencia): ResultadoAderencia {
  const pausas = e.pausas ?? [];
  const cals = e.calendarios ?? [];
  // Dedupe por id (requisições repetidas não contam duas vezes).
  const sessoes = [...new Map(e.sessoes.map((s) => [s.id, s])).values()];
  const porData = new Map<string, Array<{ s: SessaoAderencia; c: ClasseSessao }>>();
  for (const s of sessoes) {
    const d = dataLocal(s.iniciado_em);
    if (d < e.inicio || d > e.hoje) continue;
    porData.set(d, [...(porData.get(d) ?? []), { s, c: classificarSessao(s) }]);
  }

  // Semanas
  const semanaHoje = inicioDaSemana(e.hoje);
  const semanas: Semana[] = [];
  for (let w = inicioDaSemana(e.inicio); w <= semanaHoje; w = somarDias(w, 7)) {
    const meta = metaDaSemana(e.metas, w);
    const pausados = diasPausados(pausas, w, e.hoje);
    let concluidas = 0, parciais = 0, extras = 0;
    for (let i = 0; i < 7; i++) {
      for (const { c } of porData.get(somarDias(w, i)) ?? []) {
        if (c === "concluida") concluidas++;
        else if (c === "parcial") parciais++;
        else if (c === "extra") extras++;
      }
    }
    const pausada = pausados.size >= DIAS_PAUSA_PARA_EXCLUIR;
    const atual = w === semanaHoje;
    const bruto = concluidas + parciais * 0.5;
    const pontos = meta ? Math.min(meta, bruto) : 0;
    let status: StatusSemana;
    if (!meta) status = "sem_prescricao";
    else if (pausada) status = "pausada";
    else if (pontos >= meta) status = "cumprida";
    else if (atual) status = "em_andamento";
    else status = pontos > 0 ? "parcial" : "sem_treino";
    semanas.push({ inicio: w, meta, pontos, concluidas, parciais, extras, pausada, atual, status });
  }

  const completas = semanas.filter((s) => !s.atual);
  const semanaAtual = semanas.find((s) => s.atual) ?? null;

  // Sequência de semanas com meta cumprida (pausas e semanas sem prescrição não quebram).
  let corrente = 0, melhor = 0, participando = 0, cumpridas = 0;
  for (const s of completas) {
    if (s.status === "pausada" || s.status === "sem_prescricao") continue;
    participando++;
    if (s.status === "cumprida") {
      cumpridas++;
      corrente++;
      melhor = Math.max(melhor, corrente);
    } else corrente = 0;
  }
  let atual = corrente;
  if (semanaAtual?.status === "cumprida") {
    atual = corrente + 1;
    melhor = Math.max(melhor, atual);
  }

  // Calendário
  const dias: Record<string, Dia> = {};
  const fimCal = somarDias(semanaHoje, 13);
  for (let d = e.inicio; d <= fimCal; d = somarDias(d, 1)) {
    const tipos: TipoDia[] = [];
    const ss = porData.get(d) ?? [];
    const plan = planejadoNoDia(calendarioDoDia(cals, d), d);
    for (const { c } of ss) {
      if (c === "extra") tipos.push("extra");
      else if (c === "em_andamento") tipos.push("em_andamento");
      else if (c === "parcial") tipos.push("parcial");
      else if (c === "concluida") tipos.push(plan === null ? "remanejado" : "concluido");
    }
    const emPausa = pausas.some((p) => p.inicio <= d && (p.fim ?? (d > e.hoje ? p.inicio : e.hoje)) >= d);
    if (!ss.length) {
      if (emPausa) tipos.push("pausa");
      else if (plan === null) tipos.push("descanso_planejado");
      else if (plan && d >= e.hoje) tipos.push("previsto");
    }
    if (tipos.length || ss.length) dias[d] = { data: d, tipos, sessoes: ss.map((x) => x.s.id) };
  }

  return {
    semanas,
    semanaAtual,
    indices: {
      semanaAtual: semanaAtual ? indice([{ ...semanaAtual, pausada: false }]) : { pct: null, pontos: 0, meta: 0, semanas: 0 },
      d28: indice(completas.slice(-4)),
      s12: indice(completas.slice(-12)),
      total: indice(completas),
    },
    sequencia: { atual, melhor, semanasParticipando: participando, semanasCumpridas: cumpridas },
    dias,
  };
}

/** Tendência (pontos percentuais): últimas 4 semanas completas × as 4 anteriores. */
export function tendencia(r: ResultadoAderencia): number | null {
  const completas = r.semanas.filter((s) => !s.atual);
  const a = indice(completas.slice(-4)).pct;
  const b = indice(completas.slice(-8, -4)).pct;
  return a === null || b === null ? null : a - b;
}
