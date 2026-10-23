// ============================================================================
// Modo Visitante — monta um plano de treino a partir de poucos dados
// (nível, dias, tempo, foco, local). PURO e testado. É o mesmo motor do
// “Monte com IA” (a IA só entende o pedido) e dos treinos prontos da vitrine.
//
// Base científica (fontes em src/lib/desbloqueia/fontes.ts, conferidas):
//   • ACSM 2026 (posicionamento) e Currier 2023 (meta-análise em rede):
//     várias prescrições funcionam; o que mais pesa é treinar com constância.
//   • Schoenfeld 2016 (frequência): cada músculo ~2× por semana.
//   • Schoenfeld 2017 (cargas): faixas de repetições diferentes geram
//     hipertrofia parecida quando a série vai perto da falha.
//   • Grgic 2022 (falha): até a falha ou perto dela, resultados parecidos.
//   • Schoenfeld 2016 (descanso): intervalos maiores nos multiarticulares.
//   • Haugen 2023 (livre × máquina): hipertrofia parecida; por isso as
//     máquinas vêm primeiro para iniciantes (mais simples de aprender).
// Exercícios só da biblioteca do Montinho (slugs do catálogo). Sem técnica
// avançada. Nada aqui substitui a orientação de um profissional.
// ============================================================================

import type { GrupoMuscular } from "@/lib/supabase/types-extended";

export type Nivel = "iniciante" | "intermediario" | "avancado";
export type Foco = "geral" | "gluteo" | "pernas" | "peito" | "costas" | "bracos" | "ombros" | "abdomen" | "superiores";
export type Local = "academia" | "casa";
export type ParametrosPlano = { nivel: Nivel; dias: number; minutos: number; foco: Foco; local: Local };

export const FONTES_DO_PLANO = ["acsm2026", "currier2023", "schoenfeld2016frequencia", "schoenfeld2017cargas", "grgic2022falha", "schoenfeld2016descanso", "haugen2023"] as const;

export const AVISO_RESPONSABILIDADE =
  "Treinos montados com base em estudos científicos sobre treinamento de força e nos exercícios da biblioteca do Montinho. São sugestões gerais, não uma prescrição individual: não substituem a avaliação e o acompanhamento feitos por um profissional, que é o mais importante. Respeite seus limites; com dor, lesão, gestação ou alguma condição de saúde, procure um profissional antes de começar. Quer um treino feito para você? Fale com o Montinho.";

export const LIMITES_PLANO = { diasMin: 2, diasMax: 6, minutosMin: 25, minutosMax: 90, exerciciosMin: 4, exerciciosMax: 9 };

export const ROTULO_FOCO: Record<Foco, string> = {
  geral: "Corpo todo", gluteo: "Glúteo", pernas: "Pernas", peito: "Peito", costas: "Costas", bracos: "Braços", ombros: "Ombros", abdomen: "Abdômen", superiores: "Parte de cima",
};
export const ROTULO_NIVEL: Record<Nivel, string> = { iniciante: "Iniciante", intermediario: "Intermediário", avancado: "Avançado" };

type Pool = { grupo: GrupoMuscular; multi: boolean; academia: string[]; casa: string[] };
const P = (grupo: GrupoMuscular, multi: boolean, academia: string[], casa: string[]): Pool => ({ grupo, multi, academia, casa });

/** Grupos de exercícios intercambiáveis (ordem = preferência; máquinas primeiro). */
export const POOLS = {
  quad_multi: P("quadriceps", true, ["leg-press-45", "agachamento-smith", "hack-machine", "agachamento-goblet", "agachamento-livre"], ["agachamento-goblet", "agachamento-bulgaro", "afundo-halteres"]),
  quad_mono: P("quadriceps", false, ["cadeira-extensora", "cadeira-extensora-unilateral"], ["afundo-halteres", "subida-no-banco"]),
  gluteo_multi: P("gluteo", true, ["hip-thrust-maquina", "hip-thrust-barra", "elevacao-pelvica-solo"], ["elevacao-pelvica-solo", "elevacao-pelvica-unilateral"]),
  gluteo_extra: P("gluteo", true, ["agachamento-sumo", "agachamento-bulgaro"], ["agachamento-sumo", "agachamento-bulgaro"]),
  gluteo_mono: P("gluteo", false, ["cadeira-abdutora", "gluteo-maquina", "abducao-polia", "gluteo-coice-polia"], ["coice-quatro-apoios", "caminhada-lateral-elastico"]),
  post_hinge: P("posteriores", true, ["stiff-halteres", "terra-romeno", "stiff-barra"], ["stiff-halteres", "stiff-unilateral"]),
  post_mono: P("posteriores", false, ["cadeira-flexora", "mesa-flexora"], ["stiff-unilateral"]),
  adutor: P("adutores", false, ["cadeira-adutora"], []),
  panturrilha: P("panturrilha", false, ["panturrilha-em-pe-maquina", "panturrilha-sentado", "panturrilha-leg-press"], ["panturrilha-unilateral-degrau"]),
  peito_multi: P("peito", true, ["supino-reto-maquina", "supino-reto-halteres", "supino-reto-barra"], ["flexao-de-bracos", "supino-reto-halteres"]),
  peito_inc: P("peito", true, ["supino-inclinado-halteres", "supino-inclinado-maquina", "supino-inclinado-smith"], ["supino-inclinado-halteres"]),
  peito_mono: P("peito", false, ["crucifixo-maquina", "crossover-polia-media", "crucifixo-reto-halteres"], ["crucifixo-reto-halteres"]),
  costas_vert: P("costas", true, ["puxada-frontal-aberta", "puxada-triangulo", "puxada-frontal-supinada", "barra-fixa-graviton"], ["pullover-halter"]),
  costas_rem: P("costas", true, ["remada-baixa-triangulo", "remada-maquina-articulada", "remada-unilateral-halter", "remada-curvada-barra"], ["remada-unilateral-halter", "remada-apoiada-banco"]),
  ombro_multi: P("ombro_anterior", true, ["desenvolvimento-maquina", "desenvolvimento-halteres-sentado"], ["desenvolvimento-halteres-sentado", "desenvolvimento-arnold"]),
  ombro_lat: P("ombro_lateral", false, ["elevacao-lateral-halteres", "elevacao-lateral-maquina", "elevacao-lateral-polia"], ["elevacao-lateral-halteres"]),
  ombro_post: P("ombro_posterior", false, ["crucifixo-invertido-maquina", "face-pull", "crucifixo-invertido-halteres"], ["crucifixo-invertido-halteres"]),
  biceps: P("biceps", false, ["rosca-direta-barra-w", "rosca-alternada-halteres", "rosca-martelo", "rosca-scott-maquina"], ["rosca-alternada-halteres", "rosca-martelo", "rosca-concentrada"]),
  triceps: P("triceps", false, ["triceps-corda", "triceps-barra-polia", "triceps-frances-halter", "triceps-testa-barra-w"], ["triceps-frances-halter", "triceps-coice-halter", "mergulho-banco"]),
  abdomen: P("abdomen", false, ["abdominal-supra", "abdominal-infra", "abdominal-polia"], ["abdominal-supra", "abdominal-infra"]),
  core: P("core", false, ["dead-bug", "perdigueiro", "pallof-press"], ["dead-bug", "perdigueiro"]),
} satisfies Record<string, Pool>;
export type ChavePool = keyof typeof POOLS;

type TipoSessao = "FULL" | "INF" | "SUP" | "PUSH" | "PULL" | "GLUTEO" | "QUAD";
const SESSOES: Record<TipoSessao, { nome: string; slots: ChavePool[] }> = {
  FULL: { nome: "Corpo todo", slots: ["quad_multi", "peito_multi", "costas_rem", "gluteo_multi", "ombro_multi", "post_mono", "costas_vert", "ombro_lat", "core"] },
  INF: { nome: "Inferiores", slots: ["quad_multi", "gluteo_multi", "post_hinge", "quad_mono", "post_mono", "gluteo_mono", "panturrilha", "abdomen"] },
  SUP: { nome: "Superiores", slots: ["peito_multi", "costas_vert", "ombro_multi", "costas_rem", "peito_inc", "ombro_lat", "biceps", "triceps"] },
  PUSH: { nome: "Peito, ombros e tríceps", slots: ["peito_multi", "peito_inc", "ombro_multi", "ombro_lat", "peito_mono", "triceps", "triceps"] },
  PULL: { nome: "Costas e bíceps", slots: ["costas_vert", "costas_rem", "costas_vert", "ombro_post", "biceps", "biceps", "abdomen"] },
  GLUTEO: { nome: "Glúteo e posteriores", slots: ["gluteo_multi", "gluteo_extra", "post_hinge", "gluteo_mono", "post_mono", "gluteo_mono", "adutor", "abdomen"] },
  QUAD: { nome: "Quadríceps e panturrilha", slots: ["quad_multi", "quad_multi", "quad_mono", "post_mono", "panturrilha", "core"] },
};

/** Exercício a mais (variação) no dia que já trabalha a região do foco. */
const EXTRA: Record<Foco, ChavePool | null> = {
  geral: null, gluteo: "gluteo_extra", pernas: "quad_mono", peito: "peito_mono", costas: "ombro_post", bracos: "biceps", ombros: "ombro_post", abdomen: "core", superiores: "costas_rem",
};

/** Pools que ganham prioridade (vão para o início do treino) por foco. */
const PRIORIDADE: Record<Foco, ChavePool[]> = {
  geral: [], gluteo: ["gluteo_multi", "gluteo_mono"], pernas: ["quad_multi", "post_mono"], peito: ["peito_multi", "peito_inc"], costas: ["costas_vert", "costas_rem"],
  bracos: ["biceps", "triceps"], ombros: ["ombro_multi", "ombro_lat"], abdomen: ["abdomen", "core"], superiores: ["peito_multi", "costas_vert"],
};

type Divisao = { titulo: string; sessoes: TipoSessao[] };
/** Duas divisões por número de dias: A (mais simples) e B (alternativa). */
function divisoes(dias: number, foco: Foco): [Divisao, Divisao] {
  const inferiorFoco: TipoSessao = foco === "gluteo" ? "GLUTEO" : foco === "pernas" ? "QUAD" : "INF";
  switch (dias) {
    case 2:
      return [{ titulo: "Corpo todo 2× na semana", sessoes: ["FULL", "FULL"] }, { titulo: "Superiores e inferiores", sessoes: ["SUP", "INF"] }];
    case 3:
      return [
        { titulo: "Corpo todo 3× na semana", sessoes: ["FULL", "FULL", "FULL"] },
        foco === "gluteo" || foco === "pernas"
          ? { titulo: "Inferiores, superiores e inferiores", sessoes: [inferiorFoco, "SUP", "INF"] }
          : { titulo: "Inferiores, superiores e corpo todo", sessoes: ["INF", "SUP", "FULL"] },
      ];
    case 4:
      return [
        { titulo: "Superiores e inferiores 2× na semana", sessoes: ["SUP", "INF", "SUP", inferiorFoco] },
        { titulo: "Quatro treinos diferentes (A, B, C e D)", sessoes: ["PUSH", "QUAD", "PULL", "GLUTEO"] },
      ];
    case 5:
      return [
        { titulo: "Superiores e inferiores + corpo todo", sessoes: ["SUP", "INF", "SUP", inferiorFoco, "FULL"] },
        { titulo: "Empurrar, puxar e pernas + superiores e inferiores", sessoes: ["PUSH", "PULL", "INF", "SUP", inferiorFoco] },
      ];
    default:
      return [
        { titulo: "Empurrar, puxar e pernas 2× na semana", sessoes: ["PUSH", "PULL", "INF", "PUSH", "PULL", inferiorFoco] },
        { titulo: "Superiores e inferiores 3× na semana", sessoes: ["SUP", "INF", "SUP", inferiorFoco, "SUP", "INF"] },
      ];
  }
}

export type ExercicioPlano = { slug: string; grupo: GrupoMuscular; series: number; reps: string; descansoSeg: number; multi: boolean; prioridade: boolean };
export type TreinoPlano = { letra: string; nome: string; exercicios: ExercicioPlano[]; minutos: number };
export type OpcaoPlano = { id: "A" | "B"; titulo: string; treinos: TreinoPlano[]; seriesPorGrupo: Array<{ grupo: GrupoMuscular; series: number }>; dicas: string[] };

const LETRAS = ["A", "B", "C", "D", "E", "F"];

function prescricao(nivel: Nivel, multi: boolean): { series: number; reps: string; descansoSeg: number } {
  if (nivel === "iniciante") return multi ? { series: 3, reps: "10-12", descansoSeg: 90 } : { series: 2, reps: "12-15", descansoSeg: 60 };
  if (nivel === "avancado") return multi ? { series: 4, reps: "6-10", descansoSeg: 120 } : { series: 3, reps: "10-15", descansoSeg: 90 };
  return multi ? { series: 3, reps: "8-12", descansoSeg: 120 } : { series: 3, reps: "10-15", descansoSeg: 60 };
}

/** Minutos estimados: preparo + (execução ~40 s + descanso) por série + troca de aparelho. */
export function minutosDoTreino(ex: Array<Pick<ExercicioPlano, "series" | "descansoSeg">>): number {
  const seg = 5 * 60 + ex.reduce((n, e) => n + e.series * (40 + e.descansoSeg) + 60, 0);
  return Math.round(seg / 60);
}

export function normalizarParametros(p: Partial<ParametrosPlano>): ParametrosPlano {
  const dias = Math.min(LIMITES_PLANO.diasMax, Math.max(LIMITES_PLANO.diasMin, Math.round(p.dias ?? 3)));
  const minutos = Math.min(LIMITES_PLANO.minutosMax, Math.max(LIMITES_PLANO.minutosMin, Math.round(p.minutos ?? 50)));
  return { nivel: p.nivel ?? "iniciante", dias, minutos, foco: p.foco ?? "geral", local: p.local ?? "academia" };
}

function montarOpcao(id: "A" | "B", d: Divisao, p: ParametrosPlano, disponiveis: Set<string>): OpcaoPlano {
  const prioridade = PRIORIDADE[p.foco];
  const usos = new Map<string, number>(); // rodízio de exercícios entre os dias
  const escolher = (chave: ChavePool, usadosNoDia: Set<string>): string | null => {
    const lista = POOLS[chave][p.local].filter((s) => disponiveis.has(s));
    const candidatos = (p.nivel === "iniciante" ? lista.slice(0, 3) : lista).filter((s) => !usadosNoDia.has(s));
    if (!candidatos.length) return null;
    const n = usos.get(chave) ?? 0;
    usos.set(chave, n + 1);
    return candidatos[n % candidatos.length];
  };
  const treinos: TreinoPlano[] = d.sessoes.map((tipo, i) => {
    let slots = [...SESSOES[tipo].slots];
    // Foco: o que é prioridade vem primeiro; e ganha um exercício a mais quando o dia já trabalha a região.
    if (prioridade.length) {
      const tem = prioridade.filter((c) => slots.includes(c));
      if (tem.length) {
        slots = [...tem, ...slots.filter((c) => !tem.includes(c))];
        const extra = EXTRA[p.foco];
        if (extra && !slots.includes(extra)) slots.splice(Math.min(2, slots.length), 0, extra);
      }
    }
    const usados = new Set<string>();
    let ex: ExercicioPlano[] = [];
    for (const chave of slots) {
      if (ex.length >= LIMITES_PLANO.exerciciosMax) break;
      const slug = escolher(chave, usados);
      if (!slug) continue;
      usados.add(slug);
      const pool = POOLS[chave];
      ex.push({ slug, grupo: pool.grupo, multi: pool.multi, prioridade: prioridade.includes(chave), ...prescricao(p.nivel, pool.multi) });
    }
    // Cabe no tempo: primeiro corta exercícios do fim (menos prioritários); depois uma série dos isolados.
    while (minutosDoTreino(ex) > p.minutos && ex.length > LIMITES_PLANO.exerciciosMin) {
      const idx = [...ex.keys()].reverse().find((k) => !ex[k].prioridade) ?? ex.length - 1;
      ex = ex.filter((_, k) => k !== idx);
    }
    const passos: Array<(e: ExercicioPlano) => ExercicioPlano | null> = [
      (e) => (!e.multi && e.series > 2 ? { ...e, series: e.series - 1 } : null), // isolados: 1 série a menos
      (e) => (e.multi && e.descansoSeg > 90 ? { ...e, descansoSeg: 90 } : null), // descanso dos grandes: 90 s
      (e) => (e.multi && e.series > 2 ? { ...e, series: e.series - 1 } : null), // multiarticulares: 1 série a menos
    ];
    for (const passo of passos) {
      for (let k = ex.length - 1; k >= 0 && minutosDoTreino(ex) > p.minutos; k--) ex[k] = passo(ex[k]) ?? ex[k];
    }
    // Treino bem curto: fica com 3 exercícios (os primeiros, que são os principais).
    while (minutosDoTreino(ex) > p.minutos && ex.length > 3) ex = ex.slice(0, -1);
    const nome = SESSOES[tipo].nome;
    return { letra: LETRAS[i], nome, exercicios: ex, minutos: minutosDoTreino(ex) };
  });
  // Nomes repetidos ganham sufixo (Superiores 1, Superiores 2).
  const contagem = new Map<string, number>();
  for (const t of treinos) contagem.set(t.nome, (contagem.get(t.nome) ?? 0) + 1);
  const vistos = new Map<string, number>();
  for (const t of treinos) if ((contagem.get(t.nome) ?? 0) > 1) {
    const n = (vistos.get(t.nome) ?? 0) + 1;
    vistos.set(t.nome, n);
    t.nome = `${t.nome} ${n}`;
  }
  const porGrupo = new Map<GrupoMuscular, number>();
  for (const t of treinos) for (const e of t.exercicios) porGrupo.set(e.grupo, (porGrupo.get(e.grupo) ?? 0) + e.series);
  const seriesPorGrupo = [...porGrupo.entries()].map(([grupo, series]) => ({ grupo, series })).sort((a, b) => b.series - a.series);
  const dicas = [
    "No 1º exercício de cada treino, faça antes 1 série leve de aquecimento.",
    p.nivel === "iniciante"
      ? "Escolha uma carga que deixe as últimas repetições difíceis, mas com a técnica perfeita. Se a técnica piorar, pare a série."
      : "Leve cada série até a falha ou bem perto dela (sobrando 1 ou 2 repetições), sempre com boa técnica.",
    "Tente aumentar um pouco a carga ou as repetições ao longo das semanas, anotando tudo no app.",
  ];
  return { id, titulo: d.titulo, treinos, seriesPorGrupo, dicas };
}

/** As duas opções (A e B) para os parâmetros. `disponiveis` = slugs que existem na biblioteca. */
export function gerarOpcoes(parametros: Partial<ParametrosPlano>, disponiveis: Iterable<string>): OpcaoPlano[] {
  const p = normalizarParametros(parametros);
  const set = new Set(disponiveis);
  const [a, b] = divisoes(p.dias, p.foco);
  return [montarOpcao("A", a, p, set), montarOpcao("B", b, p, set)].filter((o) => o.treinos.every((t) => t.exercicios.length >= 3));
}
