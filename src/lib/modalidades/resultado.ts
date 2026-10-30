// ============================================================================
// Resultado de cada bloco (Multimodalidade, fase 3) — regras PURAS.
// Cada formato guarda só o que faz sentido para ele; a comparação é JUSTA:
// RX só com RX, Scaled só com Scaled, a mesma versão do benchmark, e o
// simulado HYROX parcial nunca com o completo. Adaptado não entra em ranking.
// ============================================================================
import { relogioTexto } from "./relogio";
import type { Condicao, Formato, TipoBloco } from "./tipos";

export type ResultadoBloco = {
  bloco_id: string;
  tipo: TipoBloco;
  formato?: Formato | null;
  condicao?: Condicao | null;
  concluido: boolean;
  tempo_seg?: number | null;
  time_cap_seg?: number | null;
  rounds?: number | null;
  reps?: number | null;
  carga_kg?: number | null;
  distancia_m?: number | null;
  calorias?: number | null;
  /** EMOM/Tabata: o que saiu em cada intervalo (reps) ou se completou (1/0). */
  intervalos?: number[] | null;
  modificacoes?: string | null;
  esforco?: number | null;
  benchmark?: string | null;
  benchmark_versao?: number | null;
  /** HYROX: simulado completo (8 estações) ou parcial. */
  completo?: boolean | null;
};

/** Blocos que pedem resultado (os outros só são marcados como feitos). */
export const TIPOS_COM_RESULTADO: ReadonlySet<TipoBloco> = new Set(["metcon", "circuito", "corrida", "estacao"]);
export const pedeResultado = (tipo: TipoBloco) => TIPOS_COM_RESULTADO.has(tipo);

/** O que o aluno preenche em cada formato (nada além disso). */
export function camposDoResultado(tipo: TipoBloco, formato?: Formato | null): Array<"tempo" | "rounds" | "reps" | "carga" | "intervalos" | "distancia" | "calorias"> {
  if (tipo === "corrida") return ["tempo", "distancia"];
  if (tipo === "estacao") return ["tempo", "carga"];
  switch (formato) {
    case "amrap":
      return ["rounds", "reps", "carga"];
    case "emom":
      return ["intervalos", "carga"];
    case "for_time":
    case "rounds_for_time":
    case "chipper":
    case "ladder":
      return ["tempo", "reps", "carga"];
    case "tabata":
    case "intervalo":
      return ["reps", "carga"];
    case "death_by":
      return ["rounds"];
    case "circuito":
      return ["rounds"];
    default:
      return ["tempo", "reps", "carga"];
  }
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** “7 rounds + 5 reps”, “8:32”, “Time cap (10:00) · 95 reps”, “9 de 10 intervalos”. */
export function textoResultado(r: ResultadoBloco): string {
  if (r.tipo === "corrida" || r.tipo === "estacao") {
    const partes = [r.tempo_seg ? relogioTexto(r.tempo_seg) : "Feito"];
    if (r.distancia_m) partes.push(r.distancia_m >= 1000 ? `${String(r.distancia_m / 1000).replace(".", ",")} km` : `${r.distancia_m} m`);
    if (r.carga_kg) partes.push(`${String(r.carga_kg).replace(".", ",")} kg`);
    return partes.join(" · ");
  }
  if (!pedeResultado(r.tipo)) return "Feito";
  switch (r.formato) {
    case "amrap": {
      const base = `${plural(r.rounds ?? 0, "round", "rounds")}${r.reps ? ` + ${r.reps} reps` : ""}`;
      return r.carga_kg ? `${base} · ${String(r.carga_kg).replace(".", ",")} kg` : base;
    }
    case "emom": {
      const feitos = (r.intervalos ?? []).filter((x) => x > 0).length;
      return r.intervalos?.length ? `${feitos} de ${r.intervalos.length} intervalos` : r.concluido ? "Todos os intervalos" : "Feito";
    }
    case "for_time":
    case "rounds_for_time":
    case "chipper":
    case "ladder":
      if (r.concluido && r.tempo_seg) return relogioTexto(r.tempo_seg);
      return `Time cap${r.time_cap_seg ? ` (${relogioTexto(r.time_cap_seg)})` : ""}${r.reps ? ` · ${r.reps} reps` : ""}`;
    case "tabata":
    case "intervalo": {
      const v = r.intervalos?.filter((x) => x >= 0) ?? [];
      if (v.length) return `${v.reduce((t, x) => t + x, 0)} reps · menor round ${Math.min(...v)}`;
      return r.reps ? `${r.reps} reps` : "Feito";
    }
    case "death_by":
      return r.rounds ? `Chegou ao minuto ${r.rounds}` : "Feito";
    case "circuito":
      return r.rounds ? plural(r.rounds, "round", "rounds") : "Feito";
    default:
      return r.tempo_seg ? relogioTexto(r.tempo_seg) : r.reps ? `${r.reps} reps` : "Feito";
  }
}

/** Dá para comparar os dois? Mesmo formato, mesma condição (RX × RX), mesmo benchmark e versão; HYROX completo só com completo. */
export function comparaveis(a: ResultadoBloco, b: ResultadoBloco): boolean {
  if (!a.condicao || !b.condicao || a.condicao !== b.condicao || a.condicao === "adaptado") return false;
  if ((a.formato ?? null) !== (b.formato ?? null)) return false;
  if ((a.benchmark ?? null) !== (b.benchmark ?? null)) return false;
  if (a.benchmark && (a.benchmark_versao ?? 1) !== (b.benchmark_versao ?? 1)) return false;
  if (a.completo != null || b.completo != null) return !!a.completo === !!b.completo;
  return true;
}

/** Pontuação para ordenar (maior = melhor). null = sem como comparar. */
export function pontuacao(r: ResultadoBloco): number | null {
  switch (r.formato) {
    case "amrap":
      return (r.rounds ?? 0) * 10000 + (r.reps ?? 0);
    case "emom":
      return (r.intervalos ?? []).filter((x) => x > 0).length || null;
    case "for_time":
    case "rounds_for_time":
    case "chipper":
    case "ladder":
      // Terminou: menor tempo é melhor; não terminou fica atrás de todos que terminaram, por reps.
      if (r.concluido && r.tempo_seg) return 1_000_000 - r.tempo_seg;
      return r.reps ?? 0;
    case "tabata":
    case "intervalo": {
      const v = r.intervalos ?? [];
      return v.length ? v.reduce((t, x) => t + x, 0) : (r.reps ?? null);
    }
    case "death_by":
    case "circuito":
      return r.rounds ?? null;
  }
  if ((r.tipo === "corrida" || r.tipo === "estacao") && r.tempo_seg) return 1_000_000 - r.tempo_seg;
  return null;
}

/** O novo é melhor que o anterior? Só quando são comparáveis. */
export function melhorou(novo: ResultadoBloco, anterior: ResultadoBloco): boolean {
  if (!comparaveis(novo, anterior)) return false;
  const a = pontuacao(novo);
  const b = pontuacao(anterior);
  return a != null && b != null && a > b;
}

/** Diferença legível: “−0:42” no tempo, “+2 rounds”… (só entre comparáveis). */
export function diferenca(novo: ResultadoBloco, anterior: ResultadoBloco): string | null {
  if (!comparaveis(novo, anterior)) return null;
  if (novo.formato === "amrap") {
    const d = ((novo.rounds ?? 0) - (anterior.rounds ?? 0)) * 1000 + ((novo.reps ?? 0) - (anterior.reps ?? 0));
    if (!d) return "igual";
    const r = (novo.rounds ?? 0) - (anterior.rounds ?? 0);
    return r ? `${r > 0 ? "+" : ""}${plural(r, "round", "rounds")}` : `${d > 0 ? "+" : ""}${d} reps`;
  }
  if (novo.tempo_seg && anterior.tempo_seg && novo.concluido && anterior.concluido) {
    const d = novo.tempo_seg - anterior.tempo_seg;
    return d === 0 ? "igual" : `${d < 0 ? "−" : "+"}${relogioTexto(Math.abs(d))}`;
  }
  return null;
}

/** Ranking do dia de um WOD: separado por condição, só comparáveis, melhor primeiro. Adaptado fica fora. */
export function rankingDoWod<T extends ResultadoBloco>(resultados: T[]): Record<"rx" | "scaled", T[]> {
  const por = (c: "rx" | "scaled") =>
    resultados
      .filter((r) => r.condicao === c && pontuacao(r) != null)
      .sort((a, b) => (pontuacao(b) ?? 0) - (pontuacao(a) ?? 0));
  return { rx: por("rx"), scaled: por("scaled") };
}

/**
 * Corrida do HYROX como cardio (decisão 4 da auditoria): soma SÓ os trechos de
 * corrida da sessão e vira 1 cardio ligado a ela (nunca as estações, nunca duas
 * vezes). Menos de 1 minuto não gera nada.
 */
export function corridaDaSessao(resultados: Array<Pick<ResultadoBloco, "tipo" | "tempo_seg" | "distancia_m">>): { minutos: number; km: number | null } | null {
  const corridas = resultados.filter((r) => r.tipo === "corrida" && (r.tempo_seg ?? 0) > 0);
  const seg = corridas.reduce((t, r) => t + (r.tempo_seg ?? 0), 0);
  if (seg < 60) return null;
  const metros = corridas.reduce((t, r) => t + (r.distancia_m ?? 0), 0);
  return { minutos: Math.max(1, Math.round(seg / 60)), km: metros > 0 ? Math.round(metros / 10) / 100 : null };
}
