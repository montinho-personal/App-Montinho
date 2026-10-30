// ============================================================================
// Blocos do treino (Cross Training, HYROX, funcional, híbrido) — regras PURAS.
// O bloco de FORÇA usa as linhas de exercício de sempre (séries × reps × carga);
// os outros guardam só o que o formato pede. Nada aqui mexe na musculação.
// ============================================================================
import { FORMATOS, LIMITES_BLOCOS, TIPOS_BLOCO, type BlocoTreino, type Formato, type ModalidadeTreino, type MovimentoBloco, type TipoBloco } from "./tipos";

let seq = 0;
/** Id curto do bloco (estável dentro do treino; o resultado do aluno aponta para ele). */
export function novoIdBloco(existentes: Array<{ id: string }> = []): string {
  const usados = new Set(existentes.map((b) => b.id));
  for (let i = existentes.length + 1; i < 1000; i++) if (!usados.has(`b${i}`)) return `b${i}`;
  return `b${Date.now().toString(36)}${(seq++).toString(36)}`;
}

/** Padrões de cada formato (o coach ajusta). */
export const PADRAO_FORMATO: Record<Formato, Partial<BlocoTreino>> = {
  amrap: { minutos: 12 },
  emom: { minutos: 10, intervalo_seg: 60 },
  intervalo: { rounds: 5, trabalho_seg: 120, descanso_seg: 0 },
  for_time: { time_cap_seg: 600 },
  rounds_for_time: { rounds: 3, time_cap_seg: 900 },
  chipper: { time_cap_seg: 1200 },
  tabata: { rounds: 8, trabalho_seg: 20, descanso_seg: 10 },
  death_by: {},
  ladder: { time_cap_seg: 600 },
  livre: {},
  hyrox: {},
  circuito: { rounds: 3, trabalho_seg: 40, descanso_seg: 20 },
};

export function novoBloco(tipo: TipoBloco, existentes: Array<{ id: string }> = [], formato?: Formato | null): BlocoTreino {
  const f: Formato | null = formato ?? (tipo === "metcon" ? "amrap" : tipo === "circuito" ? "circuito" : null);
  return { id: novoIdBloco(existentes), tipo, formato: f, movimentos: [], texto: null, ...(f ? PADRAO_FORMATO[f] : {}) };
}

/** As 8 estações da prova, na ordem, com 1 km de corrida antes de cada uma. Cargas variam por categoria: o coach preenche. */
export const ESTACOES_HYROX: Array<MovimentoBloco & { slug: string }> = [
  { slug: "ski-erg", nome: "Ski Erg (ergômetro de esqui)", distancia_m: 1000 },
  { slug: "sled-push", nome: "Sled Push", distancia_m: 50 },
  { slug: "sled-pull", nome: "Sled Pull", distancia_m: 50 },
  { slug: "burpee-broad-jump", nome: "Burpee Broad Jump", distancia_m: 80 },
  { slug: "remo-ergometro", nome: "Rower", distancia_m: 1000 },
  { slug: "caminhada-fazendeiro", nome: "Farmers Carry", distancia_m: 200 },
  { slug: "sandbag-lunges", nome: "Sandbag Lunges", distancia_m: 100 },
  { slug: "wall-ball", nome: "Wall Ball", reps: "100" },
];

/** Simulado: completo = 8 × (1 km + estação); parcial = as N primeiras. */
export function simuladoHyrox(estacoes = ESTACOES_HYROX.length, idPorSlug: (slug: string) => string | null = () => null): BlocoTreino[] {
  const out: BlocoTreino[] = [];
  for (const est of ESTACOES_HYROX.slice(0, Math.max(1, Math.min(ESTACOES_HYROX.length, estacoes)))) {
    out.push({ id: novoIdBloco(out), tipo: "corrida", formato: null, titulo: "Corrida", movimentos: [{ nome: "Corrida", distancia_m: 1000 }] });
    const { slug, ...mov } = est;
    out.push({ id: novoIdBloco(out), tipo: "estacao", formato: null, titulo: est.nome, movimentos: [{ ...mov, biblioteca_id: idPorSlug(slug) }] });
  }
  return out;
}

/** Simulado completo tem as 8 estações; com menos é parcial (não se compara com o completo). */
export function ehSimuladoCompleto(blocos: BlocoTreino[]): boolean {
  return blocos.filter((b) => b.tipo === "estacao").length >= ESTACOES_HYROX.length && blocos.filter((b) => b.tipo === "corrida").length >= ESTACOES_HYROX.length;
}

/** Estrutura inicial ao escolher a modalidade (o coach apaga o que não usar). */
export function blocosIniciais(m: ModalidadeTreino, idPorSlug?: (slug: string) => string | null): BlocoTreino[] {
  const b: BlocoTreino[] = [];
  const add = (tipo: TipoBloco, formato?: Formato) => b.push(novoBloco(tipo, b, formato));
  if (m === "cross") {
    add("aquecimento");
    add("forca");
    add("metcon", "amrap");
    add("volta_calma");
  } else if (m === "hyrox") {
    return simuladoHyrox(4, idPorSlug);
  } else if (m === "funcional") {
    add("aquecimento");
    add("circuito", "circuito");
  } else if (m === "hibrido") {
    add("forca");
    b.push({ ...novoBloco("corrida", b), movimentos: [{ nome: "Corrida", distancia_m: 3000 }] });
  }
  return b;
}

const min = (seg: number) => `${Math.round((seg / 60) * 10) / 10}`.replace(".", ",");
const fmtSeg = (s: number) => (s >= 60 && s % 60 === 0 ? `${s / 60} min` : s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`);
const fmtM = (m: number) => (m >= 1000 ? `${String(m / 1000).replace(".", ",")} km` : `${m} m`);

/** “AMRAP 12 min”, “EMOM 10 min”, “Tabata 8 × 20 s / 10 s”, “Corrida 1 km”. */
export function resumoBloco(b: BlocoTreino): string {
  const f = b.formato;
  if (b.tipo === "corrida" || b.tipo === "estacao") {
    const m = b.movimentos[0];
    const partes = [b.titulo || m?.nome || TIPOS_BLOCO[b.tipo].nome];
    if (m?.distancia_m) partes.push(fmtM(m.distancia_m));
    if (m?.reps) partes.push(`${m.reps} reps`);
    if (m?.calorias) partes.push(`${m.calorias} cal`);
    if (m?.carga) partes.push(m.carga);
    return partes.join(" · ");
  }
  if (!f) return b.titulo || TIPOS_BLOCO[b.tipo].nome;
  const nome = FORMATOS[f].nome;
  switch (f) {
    case "amrap":
      return `${nome} ${b.minutos ?? "?"} min`;
    case "emom":
      return b.intervalo_seg && b.intervalo_seg !== 60 ? `E${b.intervalo_seg / 60}MOM ${b.minutos ?? "?"} min` : `${nome} ${b.minutos ?? "?"} min`;
    case "tabata":
    case "intervalo":
    case "circuito":
      return `${nome} ${b.rounds ?? "?"} × ${fmtSeg(b.trabalho_seg ?? 0)}${b.descanso_seg ? ` / ${fmtSeg(b.descanso_seg)}` : ""}`;
    case "rounds_for_time":
      return `${b.rounds ?? "?"} rounds For Time${b.time_cap_seg ? ` · limite ${min(b.time_cap_seg)} min` : ""}`;
    case "for_time":
    case "chipper":
    case "ladder":
      return `${nome}${b.esquema ? ` ${b.esquema}` : ""}${b.time_cap_seg ? ` · limite ${min(b.time_cap_seg)} min` : ""}`;
    default:
      return nome;
  }
}

/** Duração prevista do bloco em segundos (null quando depende do aluno, como no For Time sem limite). */
export function duracaoBlocoSeg(b: BlocoTreino): number | null {
  switch (b.formato) {
    case "amrap":
    case "emom":
      return b.minutos ? b.minutos * 60 : null;
    case "tabata":
    case "intervalo":
    case "circuito":
      return b.rounds && b.trabalho_seg ? b.rounds * (b.trabalho_seg + (b.descanso_seg ?? 0)) * Math.max(1, b.tipo === "circuito" ? b.movimentos.length || 1 : 1) : null;
    case "for_time":
    case "rounds_for_time":
    case "chipper":
    case "ladder":
      return b.time_cap_seg ?? null;
  }
  if (b.tipo === "aquecimento" || b.tipo === "volta_calma") return 600;
  if (b.tipo === "tecnica") return 900;
  return null;
}

/** Limpa o que veio do editor antes de salvar: ids únicos, campos só do formato, limites. */
export function normalizarBlocos(blocos: BlocoTreino[]): BlocoTreino[] {
  const vistos = new Set<string>();
  return blocos.slice(0, LIMITES_BLOCOS.maxBlocos).map((b) => {
    let id = (b.id || "").trim().slice(0, 40);
    if (!id || vistos.has(id)) id = novoIdBloco([...vistos].map((x) => ({ id: x })));
    vistos.add(id);
    const campos = new Set<string>(b.formato ? FORMATOS[b.formato].campos : []);
    const num = (k: keyof BlocoTreino) => (campos.has(k as string) && typeof b[k] === "number" && (b[k] as number) > 0 ? (b[k] as number) : null);
    return {
      id,
      tipo: b.tipo,
      titulo: b.titulo?.trim() || null,
      formato: b.formato ?? null,
      minutos: num("minutos"),
      intervalo_seg: num("intervalo_seg"),
      rounds: num("rounds"),
      time_cap_seg: num("time_cap_seg"),
      trabalho_seg: num("trabalho_seg"),
      descanso_seg: campos.has("descanso_seg") && typeof b.descanso_seg === "number" && b.descanso_seg >= 0 ? b.descanso_seg : null,
      esquema: b.esquema?.trim() || null,
      texto: b.texto?.trim() || null,
      benchmark: b.benchmark || null,
      movimentos: (b.movimentos ?? [])
        .filter((m) => m.nome?.trim())
        .slice(0, LIMITES_BLOCOS.maxMovimentos)
        .map((m) => ({ ...m, nome: m.nome.trim(), reps: m.reps?.trim() || null, carga: m.carga?.trim() || null, scaled: m.scaled?.trim() || null })),
    };
  });
}

/** O treino tem algo para o aluno fazer além da força? (bloco com movimento ou texto). */
export function blocosComConteudo(blocos: BlocoTreino[]): BlocoTreino[] {
  return blocos.filter((b) => b.tipo === "forca" || b.movimentos.length > 0 || !!b.texto?.trim());
}

/** Benchmarks de referência (espelho da migração 0133; a definição completa e versionada fica no banco). */
export const BENCHMARKS_REF: Array<{ slug: string; nome: string; formato: Formato; resumo: string }> = [
  { slug: "fran", nome: "Fran", formato: "for_time", resumo: "21-15-9 Thruster e Pull-Up" },
  { slug: "grace", nome: "Grace", formato: "for_time", resumo: "30 Clean & Jerks" },
  { slug: "cindy", nome: "Cindy", formato: "amrap", resumo: "AMRAP 20 min: 5 Pull-Ups, 10 Push-Ups, 15 Air Squats" },
  { slug: "helen", nome: "Helen", formato: "rounds_for_time", resumo: "3 rounds: 400 m, 21 KB Swings, 12 Pull-Ups" },
  { slug: "murph", nome: "Murph", formato: "chipper", resumo: "1,6 km, 100 Pull-Ups, 200 Push-Ups, 300 Air Squats, 1,6 km" },
];
