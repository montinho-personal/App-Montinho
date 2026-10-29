// ============================================================================
// Configuração das técnicas avançadas (PURO, testado).
//
// Cada técnica tem os campos que os treinadores costumam prescrever:
//  • Rest-pause (Prestes 2019; Korak 2018): série até perto da falha, pausas
//    de 10–20 s e mini-séries até bater um total de repetições (ex.: 20).
//  • Drop-set (Schoenfeld & Grgic 2018; Fink 2018): ao chegar perto da falha,
//    tira ~20–25% da carga e continua, sem descanso, por 1 a 3 drops.
//  • Myo-reps (Fagerli): ativação de 12–20 reps, depois 3–5 mini-séries de
//    3–5 reps com 3–5 respirações (~15 s) de pausa, mesma carga.
//  • Cluster (Tufano 2017): a série dividida em blocos curtos com 15–30 s.
//  • 3/7 (Stragier 2019; Laurent 2016): 3, 4, 5, 6 e 7 reps com 15 s entre
//    os blocos, mesma carga.
//  • Super slow / negativo: tempo de cada fase (vira a cadência do exercício).
//
// “Finalização” = séries A MAIS, feitas depois das séries principais
// (ex.: 4 séries + 1 rest-pause de finalização). “Nas séries principais” =
// a técnica acontece dentro das últimas N séries prescritas (modo antigo).
// Nada aqui decide carga pelo aluno: só organiza o que o treinador prescreveu.
// ============================================================================

import type { Tecnica } from "@/lib/volume/calcular";

export type TecnicaConfiguravel = "rest_pause" | "dropset" | "myo_reps" | "cluster" | "tres_sete" | "super_slow" | "negativo";
export const TECNICAS_CONFIGURAVEIS: TecnicaConfiguravel[] = ["rest_pause", "dropset", "myo_reps", "cluster", "tres_sete", "super_slow", "negativo"];
export const ehConfiguravel = (t: Tecnica | string | null | undefined): t is TecnicaConfiguravel => !!t && (TECNICAS_CONFIGURAVEIS as string[]).includes(t);

/** Técnicas que podem virar série(s) de finalização. */
export const TECNICAS_FINALIZACAO = ["rest_pause", "dropset", "myo_reps"] as const;
export type TecnicaFinalizacao = (typeof TECNICAS_FINALIZACAO)[number];
export const podeFinalizar = (t: Tecnica | string | null | undefined): t is TecnicaFinalizacao => !!t && (TECNICAS_FINALIZACAO as readonly string[]).includes(t);

/** Técnicas registradas em blocos (o aluno anota cada pedaço da série). */
export const TECNICAS_BLOCOS = ["rest_pause", "dropset", "myo_reps", "cluster", "tres_sete"] as const;
export type TecnicaBlocos = (typeof TECNICAS_BLOCOS)[number];
export const registraEmBlocos = (t: Tecnica | string | null | undefined): t is TecnicaBlocos => !!t && (TECNICAS_BLOCOS as readonly string[]).includes(t);

export type ConfigTecnica = {
  /** "finalizacao" = séries a mais no fim; "principais" = dentro das séries prescritas. */
  aplicar?: "finalizacao" | "principais";
  /** Quantas séries de finalização (ou quantas das principais usam a técnica). */
  series?: number | null;
  /** Rest-pause: total de repetições a atingir somando os blocos. */
  repsAlvo?: number | null;
  /** Drop-set: reps da série antes dos drops · myo-reps: reps da ativação · cluster: reps por bloco. */
  reps?: number | null;
  /** Drops (drop-set), mini-séries (rest-pause/myo-reps) ou blocos (cluster). */
  blocos?: number | null;
  /** Myo-reps: repetições de cada mini-série. */
  repsBloco?: number | null;
  /** Drop-set: quanto tirar de carga a cada drop (%). */
  reducaoPct?: number | null;
  /** Pausa entre blocos/mini-séries (s). Drop-set: 0 (só trocar o peso). */
  pausaSeg?: number | null;
  /** Descanso entre as séries de finalização (s), quando há mais de uma. */
  descansoSeg?: number | null;
  /** Super slow / negativo: segundos descendo e subindo. */
  descidaSeg?: number | null;
  subidaSeg?: number | null;
};

export type ConfigEfetiva = {
  aplicar: "finalizacao" | "principais";
  series: number;
  repsAlvo: number | null;
  reps: number | null;
  blocos: number;
  repsBloco: number;
  reducaoPct: number;
  pausaSeg: number;
  descansoSeg: number;
  descidaSeg: number;
  subidaSeg: number;
};

const BASE: ConfigEfetiva = { aplicar: "principais", series: 1, repsAlvo: null, reps: null, blocos: 0, repsBloco: 0, reducaoPct: 0, pausaSeg: 0, descansoSeg: 0, descidaSeg: 0, subidaSeg: 0 };

/** Valores sugeridos (o que a maioria dos estudos e treinadores usa). */
export const PADRAO_TECNICA: Record<TecnicaConfiguravel, ConfigEfetiva> = {
  rest_pause: { ...BASE, aplicar: "finalizacao", series: 1, repsAlvo: 20, blocos: 2, pausaSeg: 15, descansoSeg: 90 },
  dropset: { ...BASE, aplicar: "finalizacao", series: 1, reps: 12, blocos: 2, reducaoPct: 20, pausaSeg: 0, descansoSeg: 90 },
  myo_reps: { ...BASE, aplicar: "finalizacao", series: 1, reps: 15, blocos: 4, repsBloco: 5, pausaSeg: 15, descansoSeg: 90 },
  cluster: { ...BASE, aplicar: "principais", series: 0, reps: 4, blocos: 3, pausaSeg: 20 },
  tres_sete: { ...BASE, aplicar: "principais", series: 0, blocos: 5, pausaSeg: 15 },
  super_slow: { ...BASE, aplicar: "principais", series: 0, descidaSeg: 5, subidaSeg: 5 },
  negativo: { ...BASE, aplicar: "principais", series: 0, descidaSeg: 4, subidaSeg: 1 },
};

/** Limites aceitos (iguais na tela e na validação do servidor). */
export const LIMITES_TECNICA = { series: [0, 6], repsAlvo: [1, 100], reps: [1, 60], blocos: [0, 10], repsBloco: [1, 20], reducaoPct: [5, 50], pausaSeg: [0, 120], descansoSeg: [0, 600], descidaSeg: [1, 15], subidaSeg: [1, 15] } as const;

const limitar = (v: unknown, [min, max]: readonly [number, number]): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
};

/**
 * Configuração salva + padrões da técnica. null quando a técnica não é configurável.
 * Sem nada salvo (null) = prescrição antiga: técnica dentro das séries principais.
 * Ao escolher a técnica no montador, salvamos `{}` (= padrões, com finalização).
 */
export function configEfetiva(tecnica: Tecnica | string | null | undefined, salvo: unknown): ConfigEfetiva | null {
  if (!ehConfiguravel(tecnica)) return null;
  const p = PADRAO_TECNICA[tecnica];
  const c = (salvo && typeof salvo === "object" ? salvo : {}) as ConfigTecnica;
  const out: ConfigEfetiva = { ...p };
  for (const k of Object.keys(LIMITES_TECNICA) as Array<keyof typeof LIMITES_TECNICA>) {
    const v = limitar(c[k], LIMITES_TECNICA[k]);
    if (v !== null) (out as Record<string, unknown>)[k] = v;
  }
  if (c.repsAlvo === null && "repsAlvo" in c) out.repsAlvo = null; // “até a falha / sem total”
  if (c.reps === null && "reps" in c && tecnica === "dropset") out.reps = null;
  // Sem configuração salva (prescrições antigas): a técnica fica nas séries principais, como antes.
  out.aplicar = !salvo ? "principais" : podeFinalizar(tecnica) && (c.aplicar === "finalizacao" || c.aplicar === "principais") ? c.aplicar : p.aplicar;
  if (out.aplicar === "finalizacao") out.series = Math.max(1, out.series);
  return out;
}

/** Séries de finalização (a mais) que o aluno faz depois das principais. */
export function seriesDeFinalizacao(tecnica: Tecnica | string | null | undefined, salvo: unknown): number {
  const c = salvo ? configEfetiva(tecnica, salvo) : null;
  return c && podeFinalizar(tecnica) && c.aplicar === "finalizacao" ? c.series : 0;
}

/**
 * Campos antigos (tecnica_extras / tecnica_series) derivados da configuração,
 * para o volume e o tempo continuarem com a mesma regra declarada.
 * Finalização: as séries com técnica são as de finalização (contadas à parte).
 */
export function camposLegados(tecnica: Tecnica | string | null | undefined, salvo: unknown, validas: number): { tecnicaExtras: number | null; tecnicaSeries: number | null } | null {
  const c = configEfetiva(tecnica, salvo);
  if (!c || !salvo) return null;
  if (!podeFinalizar(tecnica)) return null;
  const extras = tecnica === "rest_pause" && c.repsAlvo != null && !blocosEscolhidos(salvo) ? minisPrevistasRestPause(c.repsAlvo) : c.blocos;
  return { tecnicaExtras: extras, tecnicaSeries: c.aplicar === "finalizacao" ? 0 : Math.min(validas, Math.max(1, c.series)) };
}

/** Cadência derivada do super slow / negativo (ex.: "5-0-5"). */
export function cadenciaDaConfig(tecnica: Tecnica | string | null | undefined, salvo: unknown): string | null {
  if (tecnica !== "super_slow" && tecnica !== "negativo") return null;
  const c = configEfetiva(tecnica, salvo)!;
  return `${c.descidaSeg}-0-${c.subidaSeg}`;
}

// ---------------------------------------------------------------------------
// Rest-pause: exemplo de divisão do total (≈60% na ativação, depois metade).
// ---------------------------------------------------------------------------
export function exemploRestPause(alvo: number, partes?: number): number[] {
  const total = Math.max(1, Math.round(alvo));
  if (partes && partes >= 1) return dividirEmPartes(total, Math.min(partes, total));
  const out = [Math.max(1, Math.round(total * 0.6))];
  let falta = total - out[0];
  while (falta > 0 && out.length < 8) {
    const prox = Math.max(1, Math.min(falta, Math.round(out[out.length - 1] * 0.45)));
    out.push(prox);
    falta -= prox;
  }
  return out;
}
/** Total dividido em `n` pedaços decrescentes (~60% no 1º, o resto cada vez menor). */
function dividirEmPartes(total: number, n: number): number[] {
  if (n <= 1) return [total];
  const primeiro = Math.min(total - (n - 1), Math.max(1, Math.round(total * 0.6)));
  const resto = total - primeiro;
  const pesos = Array.from({ length: n - 1 }, (_, i) => n - 1 - i);
  const soma = pesos.reduce((a, b) => a + b, 0);
  const out = [primeiro, ...pesos.map((w) => Math.max(1, Math.round((resto * w) / soma)))];
  let dif = total - out.reduce((a, b) => a + b, 0);
  for (let i = 1; dif !== 0 && i < out.length * 4; i++) {
    const k = 1 + ((i - 1) % (n - 1));
    if (dif > 0) { out[k]++; dif--; } else if (out[k] > 1) { out[k]--; dif++; }
  }
  return out;
}

/** O treinador escolheu o nº de blocos do rest-pause? (prescrições antigas só têm o total.) */
const blocosEscolhidos = (salvo: unknown) => !!salvo && typeof salvo === "object" && (salvo as ConfigTecnica).blocos != null;

/** Mini-séries (depois da ativação) que o exemplo usa para chegar no total. */
export const minisPrevistasRestPause = (alvo: number) => Math.max(1, exemploRestPause(alvo).length - 1);

// ---------------------------------------------------------------------------
// Drop-set: cargas sugeridas de cada drop.
// ---------------------------------------------------------------------------
/** Arredonda para 0,5 kg abaixo de 20 kg e para 1 kg acima (anilhas comuns). */
export function arredondarCarga(kg: number): number {
  if (!Number.isFinite(kg) || kg <= 0) return 0;
  return kg < 20 ? Math.round(kg * 2) / 2 : Math.round(kg);
}
/** Cargas de cada drop a partir da carga inicial (cada um ~X% mais leve que o anterior). */
export function cargasDosDrops(cargaInicial: number, drops: number, reducaoPct: number): number[] {
  const out: number[] = [];
  let atual = cargaInicial;
  for (let i = 0; i < Math.max(0, drops); i++) {
    atual = atual * (1 - reducaoPct / 100);
    out.push(arredondarCarga(atual));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Blocos planejados (o que o aluno vê para preencher)
// ---------------------------------------------------------------------------
export type BlocoPlanejado = {
  rotulo: string;
  /** Meta de repetições do bloco (texto: "12", "até a falha", "5"). */
  meta: string;
  /** Pausa ANTES deste bloco (s); 0 = sem pausa (troca de peso no drop-set). */
  pausaAntesSeg: number;
  /** Fração da carga inicial sugerida (drop-set); 1 = mesma carga. */
  fracaoCarga: number;
};

export function blocosPlanejados(tecnica: Tecnica | string | null | undefined, salvo: unknown, repsPrescritas?: string | null): BlocoPlanejado[] {
  const c = configEfetiva(tecnica, salvo);
  if (!c || !registraEmBlocos(tecnica)) return [];
  if (tecnica === "rest_pause") {
    // Blocos escolhidos (ex.: 3 = 1ª até perto da falha + 2 minis) mandam; sem escolha, o total define.
    const escolhidos = blocosEscolhidos(salvo);
    const ex = c.repsAlvo != null ? exemploRestPause(c.repsAlvo, escolhidos ? c.blocos + 1 : undefined) : [];
    const n = c.repsAlvo != null && !escolhidos ? ex.length : c.blocos + 1;
    return Array.from({ length: n }, (_, i) => ({ rotulo: i === 0 ? "Até perto da falha" : `Mini ${i}`, meta: i === 0 ? (ex[0] ? `~${ex[0]}` : "falha") : ex[i] ? `~${ex[i]}` : "o máx.", pausaAntesSeg: i === 0 ? 0 : c.pausaSeg, fracaoCarga: 1 }));
  }
  if (tecnica === "dropset") {
    const out: BlocoPlanejado[] = [{ rotulo: "Carga inicial", meta: c.reps != null ? String(c.reps) : repsPrescritas || "falha", pausaAntesSeg: 0, fracaoCarga: 1 }];
    let f = 1;
    for (let i = 1; i <= c.blocos; i++) {
      f *= 1 - c.reducaoPct / 100;
      out.push({ rotulo: `Drop ${i} (−${c.reducaoPct}%)`, meta: "falha", pausaAntesSeg: c.pausaSeg, fracaoCarga: f });
    }
    return out;
  }
  if (tecnica === "myo_reps") {
    return [{ rotulo: "Ativação", meta: String(c.reps ?? 15), pausaAntesSeg: 0, fracaoCarga: 1 }, ...Array.from({ length: c.blocos }, (_, i) => ({ rotulo: `Mini ${i + 1}`, meta: String(c.repsBloco), pausaAntesSeg: c.pausaSeg, fracaoCarga: 1 }))];
  }
  if (tecnica === "cluster") {
    return Array.from({ length: Math.max(1, c.blocos) }, (_, i) => ({ rotulo: `Bloco ${i + 1}`, meta: String(c.reps ?? 4), pausaAntesSeg: i === 0 ? 0 : c.pausaSeg, fracaoCarga: 1 }));
  }
  // 3/7
  return [3, 4, 5, 6, 7].map((r, i) => ({ rotulo: `${r} reps`, meta: String(r), pausaAntesSeg: i === 0 ? 0 : c.pausaSeg, fracaoCarga: 1 }));
}

/**
 * Quantos pedaços o aluno pode ter numa série em blocos: na tela ele põe ou
 * tira um drop, uma mini-série ou um bloco (pedido do Montinho, 29/10/2026).
 * O máximo respeita o limite da configuração (10) e o do servidor (12 pedaços).
 */
export function ajusteDeBlocos(tecnica: Tecnica | string | null | undefined): { unidade: string; minimo: number; maximo: number } | null {
  if (!registraEmBlocos(tecnica)) return null;
  if (tecnica === "dropset") return { unidade: "drop", minimo: 2, maximo: LIMITES_TECNICA.blocos[1] + 1 };
  if (tecnica === "rest_pause" || tecnica === "myo_reps") return { unidade: "mini-série", minimo: 2, maximo: LIMITES_TECNICA.blocos[1] + 1 };
  if (tecnica === "cluster") return { unidade: "bloco", minimo: 1, maximo: LIMITES_TECNICA.blocos[1] };
  return { unidade: "bloco", minimo: 1, maximo: 12 };
}

/** Os pedaços planejados com outra quantidade (o aluno pôs ou tirou um drop, uma mini-série, um bloco). */
export function blocosComQuantidade(tecnica: Tecnica | string | null | undefined, salvo: unknown, repsPrescritas: string | null | undefined, n: number): BlocoPlanejado[] {
  const base = blocosPlanejados(tecnica, salvo, repsPrescritas);
  const aj = ajusteDeBlocos(tecnica);
  if (!base.length || !aj) return base;
  const q = Math.min(aj.maximo, Math.max(aj.minimo, Math.round(n)));
  if (q === base.length) return base;
  if (tecnica === "tres_sete") {
    // 3, 4, 5, 6, 7 é o protocolo; o que passar disso vira bloco extra.
    const pausa = base.at(-1)?.pausaAntesSeg ?? 15;
    return Array.from({ length: q }, (_, i) => base[i] ?? { rotulo: `Extra ${i - base.length + 1}`, meta: "o máx.", pausaAntesSeg: pausa, fracaoCarga: 1 });
  }
  const c = salvo && typeof salvo === "object" ? (salvo as ConfigTecnica) : {};
  return blocosPlanejados(tecnica, { ...c, blocos: tecnica === "cluster" ? q : q - 1 }, repsPrescritas);
}

/** Total de repetições somando os blocos preenchidos. */
export const somaBlocos = (reps: Array<string | number | null | undefined>) => reps.reduce<number>((s, r) => s + (Number(String(r ?? "").replace(",", ".")) || 0), 0);

// ---------------------------------------------------------------------------
// Textos (montador e aluno)
// ---------------------------------------------------------------------------
const seg = (s: number) => `${s} s`;
const vezes = (n: number) => `${n}×`;

/** Resumo curto mostrado embaixo do método no montador e no treino do aluno. */
export function resumoTecnica(tecnica: Tecnica | string | null | undefined, salvo: unknown): string | null {
  const c = configEfetiva(tecnica, salvo);
  if (!c) return null;
  const onde = c.aplicar === "finalizacao" ? `${vezes(c.series)} no final` : c.series > 0 ? `nas últimas ${c.series === 1 ? "série" : `${c.series} séries`}` : "em todas as séries";
  switch (tecnica) {
    case "rest_pause":
      return `${onde} · ${blocosEscolhidos(salvo) ? `${c.blocos + 1} blocos${c.repsAlvo != null ? ` · meta ${c.repsAlvo} reps` : ""}` : c.repsAlvo != null ? `meta ${c.repsAlvo} reps` : `${c.blocos} mini-séries`} · pausas de ${seg(c.pausaSeg)}`;
    case "dropset":
      return `${onde} · ${c.reps != null ? `${c.reps} reps + ` : ""}${c.blocos} ${c.blocos === 1 ? "drop" : "drops"} de −${c.reducaoPct}%${c.pausaSeg ? ` · ${seg(c.pausaSeg)} entre drops` : " · sem descanso"}`;
    case "myo_reps":
      return `${onde} · ativação ${c.reps} + ${c.blocos}×${c.repsBloco} · pausas de ${seg(c.pausaSeg)}`;
    case "cluster":
      return `${c.blocos} blocos de ${c.reps} reps · pausas de ${seg(c.pausaSeg)}`;
    case "tres_sete":
      return `3-4-5-6-7 reps · pausas de ${seg(c.pausaSeg)} · mesma carga`;
    case "super_slow":
    case "negativo":
      return `${c.descidaSeg} s descendo · ${c.subidaSeg} s subindo`;
  }
  return null;
}

/** Explicação para o aluno (o que fazer, passo a passo). */
export function instrucaoTecnica(tecnica: Tecnica | string | null | undefined, salvo: unknown): string | null {
  const c = configEfetiva(tecnica, salvo);
  if (!c) return null;
  const fim = c.aplicar === "finalizacao" ? (c.series === 1 ? "Depois das séries principais, faça 1 série de finalização: " : `Depois das séries principais, faça ${c.series} séries de finalização (descanse ${seg(c.descansoSeg)} entre elas): `) : "";
  switch (tecnica) {
    case "rest_pause":
      return `${fim}vá até perto da falha, descanse ${seg(c.pausaSeg)} e continue com a mesma carga${blocosEscolhidos(salvo) ? ` — ${c.blocos + 1} blocos no total` : ""}${c.repsAlvo != null ? ` até somar ${c.repsAlvo} repetições` : ""}. Anote cada pedaço.`;
    case "dropset":
      return `${fim}${c.reps != null ? `faça ${c.reps} repetições` : "vá até perto da falha"}, tire ${c.reducaoPct}% da carga${c.pausaSeg ? ` (${seg(c.pausaSeg)} para trocar)` : " sem descansar"} e continue até a falha. Repita ${c.blocos === 1 ? "1 vez" : `${c.blocos} vezes`}.`;
    case "myo_reps":
      return `${fim}faça ${c.reps} repetições perto da falha, respire ${seg(c.pausaSeg)} (3 a 5 respirações) e faça ${c.blocos} mini-séries de ${c.repsBloco} com a mesma carga. Se não sair ${c.repsBloco}, pare.`;
    case "cluster":
      return `Cada série é dividida em ${c.blocos} blocos de ${c.reps} repetições, com ${seg(c.pausaSeg)} de pausa entre eles. Mesma carga.`;
    case "tres_sete":
      return `Faça 3 repetições, pausa de ${seg(c.pausaSeg)}, depois 4, 5, 6 e 7, sempre com ${seg(c.pausaSeg)} de pausa e a mesma carga.`;
    case "super_slow":
      return `Bem devagar: ${c.descidaSeg} s descendo e ${c.subidaSeg} s subindo, sem embalo.`;
    case "negativo":
      return `Capriche na descida: ${c.descidaSeg} s descendo, controlando; a subida pode ser em ${c.subidaSeg} s.`;
  }
  return null;
}
