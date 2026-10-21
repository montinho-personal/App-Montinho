// ============================================================================
// ARMAZENAMENTO DO MODO DEMONSTRAÇÃO — dados fictícios em memória.
//
// Só é usado quando appMode() === "demo" (sem Supabase + NEXT_PUBLIC_DEMO_MODE).
// Vive em globalThis porque o Turbopack isola módulos entre Server Components e
// Route Handlers; isso é aceitável APENAS para demonstração e está identificado
// na UI com o banner "modo demonstração". Nunca é usado com dados reais.
// ============================================================================

import { mockAlunos, mockEvolucao, mockExercicios, mockProfiles, mockTreinos } from "@/lib/mock/db";
import { mockBiblioteca, mockCheckIns } from "@/lib/mock/db-extended";
import type { Evolucao, Treino } from "@/lib/supabase/types";
import type { CheckIn } from "@/lib/supabase/types-extended";
import type {
  Adaptacao,
  BibliotecaPrograma,
  ExercicioPrescrito,
  GrupoCorrecao,
  Intervencao,
  Programa,
  ProgramaVersao,
  SessionExercise,
  SessionSet,
  TrainingSession,
} from "@/lib/supabase/types-sessoes";
import { montarLookupBiblioteca, resolverGrupo, normalizarNome } from "@/lib/grupos";

export type DemoStore = {
  alunos: typeof mockAlunos;
  treinos: Array<Treino & { versao: number; programa_id: string | null }>;
  exercicios: ExercicioPrescrito[];
  programas: Programa[];
  versoes: ProgramaVersao[];
  sessions: TrainingSession[];
  sessionExercises: SessionExercise[];
  sessionSets: SessionSet[];
  adaptacoes: Adaptacao[];
  intervencoes: Intervencao[];
  memoria: BibliotecaPrograma[];
  correcoes: GrupoCorrecao[];
  checkIns: CheckIn[];
  evolucao: Evolucao[];
};

export function uid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function agoraMenos(dias: number, hora = 19): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(hora, 0, 0, 0);
  return d.toISOString();
}

function seed(): DemoStore {
  const biblioteca = montarLookupBiblioteca(mockBiblioteca);
  const agora = new Date().toISOString();

  const exercicios: ExercicioPrescrito[] = mockExercicios.map((e) => {
    const r = resolverGrupo({ nome: e.nome }, biblioteca);
    return {
      ...e,
      biblioteca_id: mockBiblioteca.find((b) => normalizarNome(b.nome) === normalizarNome(e.nome))?.id ?? null,
      grupo_muscular: r.grupo,
      grupos_secundarios: r.secundarios,
      grupo_origem: r.origem,
      grupo_confianca: r.confianca,
      series_aquecimento: 0,
      tecnica: "normal",
      bloco: null,
      unilateral: /unilateral|cada perna|cada lado/i.test(`${e.nome} ${e.reps}`),
      carga_alvo: null,
      rir: null,
      cadencia: null,
      conta_volume: r.grupo !== "cardio",
      removido_em: null,
      updated_at: agora,
    };
  });

  const programaAline: Programa = {
    id: "prog-aline",
    aluno_id: "aline",
    nome: "Preparação Wellness — bloco 2",
    objetivo: "hipertrofia",
    nivel: "intermediario",
    split: "ABCDE",
    modo_semana: "fixa",
    frequencia: { A: 1, B: 1, C: 1, D: 1, E: 1 },
    calendario: {
      modo: "fixa",
      dias: [
        { dia: 1, letra: "A" },
        { dia: 2, letra: "B" },
        { dia: 3, letra: "C" },
        { dia: 4, letra: "D" },
        { dia: 5, letra: "E" },
        { dia: 6, letra: null },
        { dia: 0, letra: null },
      ],
    },
    metas_volume: {
      gluteo: { min: 12, max: 18 },
      quadriceps: { min: 8, max: 12 },
      posteriores: { min: 6, max: 10 },
      peito: { min: 8, max: 12 },
      costas: { min: 10, max: 16 },
      ombros: { min: 8, max: 14 },
    },
    prioridades: ["gluteo", "posteriores"],
    equipamentos: ["barra", "halter", "maquina", "polia", "cabo", "smith", "banco"],
    duracao_min: 60,
    permite_versao_reduzida: true,
    observacoes: "Joelho direito: amplitude controlada no agachamento.",
    versao: 3,
    ativo: true,
    created_at: "2026-04-13T00:00:00Z",
    updated_at: "2026-05-10T00:00:00Z",
  };

  const treinos = mockTreinos.map((t) => ({ ...t, versao: 3, programa_id: t.aluno_id === "aline" ? "prog-aline" : null }));

  // Sessões passadas da Aline (últimas 5 semanas) para relatórios reais.
  const sessions: TrainingSession[] = [];
  const sessionExercises: SessionExercise[] = [];
  const sessionSets: SessionSet[] = [];
  const planoAline = treinos.filter((t) => t.aluno_id === "aline");
  const cargaBase: Record<string, number> = { "ex-a1": 30, "ex-a2": 14, "ex-a3": 35, "ex-a4": 20, "ex-a5": 25, "ex-b1": 40, "ex-b2": 45, "ex-b3": 16, "ex-b4": 30, "ex-b5": 18, "ex-b6": 10, "ex-c1": 80, "ex-c2": 140, "ex-c3": 45, "ex-c4": 40, "ex-c5": 50, "ex-c6": 20, "ex-c7": 60, "ex-d1": 14, "ex-d2": 8, "ex-d3": 8, "ex-d4": 35, "ex-d5": 20 };
  // dias atrás em que houve treino (A..E girando), pulando alguns (sessões perdidas)
  const diasTreinados = [1, 2, 4, 5, 7, 8, 9, 11, 12, 15, 16, 18, 19, 22, 23, 25, 26, 29, 30, 32, 33];
  diasTreinados.forEach((dias, i) => {
    const treino = planoAline[i % planoAline.length];
    if (treino.letra === "E") return; // cardio/core: sessão curta sem séries registradas na demo
    const sid = `sess-demo-${i}`;
    const exs = exercicios.filter((e) => e.treino_id === treino.id);
    const progresso = Math.max(0, 4 - Math.floor(dias / 7)); // cargas sobem ao longo das semanas
    let planejadas = 0;
    let concluidas = 0;
    exs.forEach((e, ordem) => {
      const seid = `${sid}-ex-${ordem}`;
      const feitas = i % 5 === 3 && ordem === exs.length - 1 ? Math.max(1, e.series - 1) : e.series; // às vezes falta 1 série
      planejadas += e.series;
      sessionExercises.push({
        id: seid,
        session_id: sid,
        exercicio_id: e.id,
        biblioteca_id: e.biblioteca_id ?? null,
        client_key: `demo:${seid}`,
        ordem,
        nome: e.nome,
        nome_normalizado: normalizarNome(e.nome),
        grupo_muscular: e.grupo_muscular,
        series_planejadas: e.series,
        prescricao: { series: e.series, reps: e.reps, descanso_seg: e.descanso_seg },
        status: "concluido",
        observacao_aluno: null,
        created_at: agoraMenos(dias),
      });
      for (let s = 1; s <= feitas; s++) {
        concluidas += 1;
        const base = cargaBase[e.id] ?? 20;
        sessionSets.push({
          id: `${seid}-set-${s}`,
          session_id: sid,
          session_exercise_id: seid,
          client_key: `demo:${seid}:${s}`,
          serie: s,
          tipo: "valida",
          carga_kg: Math.round((base + progresso * (base >= 60 ? 5 : 2)) * 2) / 2,
          reps: Math.max(6, 12 - s),
          rir: 2,
          rpe: null,
          tempo_seg: null,
          lado: null,
          desconforto: null,
          observacoes: null,
          concluida_em: agoraMenos(dias, 19 + Math.floor(s / 4)),
          created_at: agoraMenos(dias),
        });
      }
    });
    sessions.push({
      id: sid,
      aluno_id: "aline",
      treino_id: treino.id,
      programa_versao_id: null,
      letra: treino.letra,
      nome_treino: treino.nome,
      client_key: `demo:${sid}`,
      status: "concluida",
      iniciado_em: agoraMenos(dias, 19),
      finalizado_em: agoraMenos(dias, 20),
      duracao_seg: 3300 + (i % 4) * 300,
      snapshot: { treino_id: treino.id, letra: treino.letra, fase: dias > 18 ? "adaptacao" : "intensificacao" },
      series_planejadas: planejadas,
      series_concluidas: concluidas,
      feedback_percepcao: i % 4 === 0 ? "pesado" : "ok",
      feedback_comentario: null,
      origem: "app",
      created_at: agoraMenos(dias),
      updated_at: agoraMenos(dias),
    });
  });

  const versoes: ProgramaVersao[] = [
    {
      id: "ver-aline-2",
      aluno_id: "aline",
      programa_id: "prog-aline",
      versao: 2,
      autor_id: "trainer-montinho",
      motivo: "Aumentar volume de glúteo e trocar agachamento livre por hack (joelho).",
      snapshot: {
        programa: { ...programaAline, nome: "Preparação Wellness — bloco 1" },
        treinos: planoAline.map((t) => ({
          id: t.id,
          letra: t.letra,
          nome: t.nome,
          observacoes: t.observacoes,
          ativo: true,
          exercicios: exercicios
            .filter((e) => e.treino_id === t.id)
            .map((e) => ({
              id: e.id,
              ordem: e.ordem,
              nome: e.id === "ex-c1" ? "Agachamento livre" : e.nome,
              series: e.id === "ex-c6" ? 2 : e.series,
              reps: e.reps,
              ie: e.ie,
              rir: null,
              descanso_seg: e.descanso_seg,
              observacoes: e.observacoes,
              grupo_muscular: e.grupo_muscular,
              grupos_secundarios: e.grupos_secundarios,
              series_aquecimento: 0,
              tecnica: "normal",
              bloco: null,
              unilateral: e.unilateral,
              carga_alvo: null,
            })),
        })),
      },
      volume: null,
      diff_resumo: "Versão anterior (bloco 1).",
      created_at: "2026-04-13T00:00:00Z",
    },
  ];

  const memoria: BibliotecaPrograma[] = [
    {
      id: "mem-1",
      origem_versao_id: null,
      hash_estrutura: "demo-upper-lower-gluteo",
      nome: "Upper/Lower 4 dias · foco em glúteos · 60 min",
      resumo: "Upper/Lower 4 dias • foco em glúteos • 60 min • academia completa",
      metadados: {
        objetivo: "hipertrofia",
        nivel: "intermediario",
        split: "Upper/Lower",
        dias: 4,
        sessoes_semana: 4,
        duracao_min: 60,
        equipamentos: ["barra", "halter", "maquina", "polia", "banco"],
        prioridades: ["gluteo"],
        tecnicas: ["normal"],
        restricoes: [],
        grupos_principais: ["gluteo", "quadriceps", "costas", "peito"],
        total_series: 68,
        exercicios_por_dia: 6,
      },
      estrutura: {
        programa: { nome: "Upper/Lower 4 dias", objetivo: "hipertrofia", nivel: "intermediario", split: "Upper/Lower", modo_semana: "fixa", frequencia: { A: 1, B: 1, C: 1, D: 1 }, calendario: {}, metas_volume: { gluteo: { min: 12, max: 18 } }, prioridades: ["gluteo"], equipamentos: ["barra", "halter", "maquina", "polia", "banco"], duracao_min: 60, observacoes: null },
        treinos: [
          { id: "m1-A", letra: "A", nome: "Upper 1", observacoes: null, ativo: true, exercicios: [
            { id: "m1-A1", ordem: 0, nome: "Supino reto barra", series: 4, reps: "8-10", ie: 8, rir: 2, descanso_seg: 90, observacoes: null, grupo_muscular: "peito", grupos_secundarios: ["triceps"], series_aquecimento: 1, tecnica: "normal", bloco: null, unilateral: false, carga_alvo: null },
            { id: "m1-A2", ordem: 1, nome: "Remada baixa triângulo", series: 4, reps: "10-12", ie: 8, rir: 2, descanso_seg: 75, observacoes: null, grupo_muscular: "costas", grupos_secundarios: ["biceps"], series_aquecimento: 0, tecnica: "normal", bloco: null, unilateral: false, carga_alvo: null },
            { id: "m1-A3", ordem: 2, nome: "Elevação lateral", series: 3, reps: "12-15", ie: 8, rir: 1, descanso_seg: 60, observacoes: null, grupo_muscular: "ombros", grupos_secundarios: [], series_aquecimento: 0, tecnica: "normal", bloco: null, unilateral: false, carga_alvo: null },
            { id: "m1-A4", ordem: 3, nome: "Tríceps corda polia", series: 3, reps: "12-15", ie: 8, rir: 1, descanso_seg: 60, observacoes: null, grupo_muscular: "triceps", grupos_secundarios: [], series_aquecimento: 0, tecnica: "normal", bloco: null, unilateral: false, carga_alvo: null },
          ] },
          { id: "m1-B", letra: "B", nome: "Lower 1 (glúteo)", observacoes: null, ativo: true, exercicios: [
            { id: "m1-B1", ordem: 0, nome: "Hip thrust", series: 4, reps: "8-10", ie: 8, rir: 2, descanso_seg: 120, observacoes: null, grupo_muscular: "gluteo", grupos_secundarios: ["posteriores"], series_aquecimento: 1, tecnica: "normal", bloco: null, unilateral: false, carga_alvo: null },
            { id: "m1-B2", ordem: 1, nome: "Hack machine", series: 4, reps: "10-12", ie: 8, rir: 2, descanso_seg: 120, observacoes: null, grupo_muscular: "quadriceps", grupos_secundarios: ["gluteo"], series_aquecimento: 1, tecnica: "normal", bloco: null, unilateral: false, carga_alvo: null },
            { id: "m1-B3", ordem: 2, nome: "Mesa flexora", series: 3, reps: "10-12", ie: 8, rir: 1, descanso_seg: 60, observacoes: null, grupo_muscular: "posteriores", grupos_secundarios: [], series_aquecimento: 0, tecnica: "normal", bloco: null, unilateral: false, carga_alvo: null },
            { id: "m1-B4", ordem: 3, nome: "Abdutora", series: 3, reps: "15-20", ie: 8, rir: 1, descanso_seg: 45, observacoes: null, grupo_muscular: "gluteo", grupos_secundarios: [], series_aquecimento: 0, tecnica: "normal", bloco: null, unilateral: false, carga_alvo: null },
            { id: "m1-B5", ordem: 4, nome: "Panturrilha em pé", series: 4, reps: "12-15", ie: 8, rir: 1, descanso_seg: 45, observacoes: null, grupo_muscular: "panturrilha", grupos_secundarios: [], series_aquecimento: 0, tecnica: "normal", bloco: null, unilateral: false, carga_alvo: null },
          ] },
          { id: "m1-C", letra: "C", nome: "Upper 2", observacoes: null, ativo: true, exercicios: [
            { id: "m1-C1", ordem: 0, nome: "Puxada frontal aberta", series: 4, reps: "8-10", ie: 8, rir: 2, descanso_seg: 90, observacoes: null, grupo_muscular: "costas", grupos_secundarios: ["biceps"], series_aquecimento: 1, tecnica: "normal", bloco: null, unilateral: false, carga_alvo: null },
            { id: "m1-C2", ordem: 1, nome: "Supino inclinado halter", series: 3, reps: "10-12", ie: 8, rir: 2, descanso_seg: 75, observacoes: null, grupo_muscular: "peito", grupos_secundarios: ["triceps"], series_aquecimento: 0, tecnica: "normal", bloco: null, unilateral: false, carga_alvo: null },
            { id: "m1-C3", ordem: 2, nome: "Crucifixo invertido máquina", series: 3, reps: "12-15", ie: 8, rir: 1, descanso_seg: 60, observacoes: null, grupo_muscular: "ombros", grupos_secundarios: [], series_aquecimento: 0, tecnica: "normal", bloco: null, unilateral: false, carga_alvo: null },
            { id: "m1-C4", ordem: 3, nome: "Rosca direta barra W", series: 3, reps: "10-12", ie: 8, rir: 1, descanso_seg: 60, observacoes: null, grupo_muscular: "biceps", grupos_secundarios: [], series_aquecimento: 0, tecnica: "normal", bloco: null, unilateral: false, carga_alvo: null },
          ] },
          { id: "m1-D", letra: "D", nome: "Lower 2 (glúteo/posterior)", observacoes: null, ativo: true, exercicios: [
            { id: "m1-D1", ordem: 0, nome: "Elevação pélvica", series: 4, reps: "10-12", ie: 8, rir: 2, descanso_seg: 90, observacoes: null, grupo_muscular: "gluteo", grupos_secundarios: [], series_aquecimento: 1, tecnica: "normal", bloco: null, unilateral: false, carga_alvo: null },
            { id: "m1-D2", ordem: 1, nome: "Stiff barra", series: 3, reps: "10-12", ie: 8, rir: 2, descanso_seg: 90, observacoes: null, grupo_muscular: "posteriores", grupos_secundarios: ["gluteo"], series_aquecimento: 0, tecnica: "normal", bloco: null, unilateral: false, carga_alvo: null },
            { id: "m1-D3", ordem: 2, nome: "Afundo búlgaro", series: 3, reps: "10 cada", ie: 8, rir: 2, descanso_seg: 75, observacoes: null, grupo_muscular: "quadriceps", grupos_secundarios: ["gluteo"], series_aquecimento: 0, tecnica: "unilateral", bloco: null, unilateral: true, carga_alvo: null },
            { id: "m1-D4", ordem: 3, nome: "Glúteo coice polia", series: 3, reps: "15 cada", ie: 8, rir: 1, descanso_seg: 45, observacoes: null, grupo_muscular: "gluteo", grupos_secundarios: [], series_aquecimento: 0, tecnica: "unilateral", bloco: null, unilateral: true, carga_alvo: null },
          ] },
        ],
      },
      volume: null,
      tags: ["upper/lower", "gluteo", "4 dias", "academia"],
      status: "utilizado",
      favorito: true,
      uso_count: 3,
      feedback: { util: 2, nao_util: 0, usei_adaptei: 2 },
      justificativa: "Base boa pra alunas intermediárias com prioridade de glúteo e 4 dias.",
      autor_id: "trainer-montinho",
      excluido_em: null,
      created_at: "2026-02-10T00:00:00Z",
      updated_at: "2026-04-02T00:00:00Z",
    },
    {
      id: "mem-2",
      origem_versao_id: null,
      hash_estrutura: "demo-fullbody-3d",
      nome: "Full Body 3 dias · iniciante · 45 min",
      resumo: "Full Body 3 dias • iniciante • pouca disponibilidade • 45 min",
      metadados: {
        objetivo: "condicionamento",
        nivel: "iniciante",
        split: "Full Body",
        dias: 3,
        sessoes_semana: 3,
        duracao_min: 45,
        equipamentos: ["maquina", "halter", "polia"],
        prioridades: [],
        tecnicas: ["normal"],
        restricoes: [],
        grupos_principais: ["quadriceps", "costas", "peito", "gluteo"],
        total_series: 42,
        exercicios_por_dia: 6,
      },
      estrutura: {
        programa: { nome: "Full Body 3 dias", objetivo: "condicionamento", nivel: "iniciante", split: "Full Body", modo_semana: "fixa", frequencia: { A: 1, B: 1, C: 1 }, calendario: {}, metas_volume: {}, prioridades: [], equipamentos: ["maquina", "halter", "polia"], duracao_min: 45, observacoes: null },
        treinos: ["A", "B", "C"].map((letra, i) => ({
          id: `m2-${letra}`,
          letra: letra as "A" | "B" | "C",
          nome: `Full Body ${letra}`,
          observacoes: null,
          ativo: true,
          exercicios: [
            { id: `m2-${letra}1`, ordem: 0, nome: i === 1 ? "Hack machine" : "Leg press 45º", series: 3, reps: "10-12", ie: 7, rir: 3, descanso_seg: 90, observacoes: null, grupo_muscular: "quadriceps" as const, grupos_secundarios: ["gluteo" as const], series_aquecimento: 1, tecnica: "normal" as const, bloco: null, unilateral: false, carga_alvo: null },
            { id: `m2-${letra}2`, ordem: 1, nome: i === 2 ? "Supino inclinado halter" : "Supino reto barra", series: 3, reps: "10-12", ie: 7, rir: 3, descanso_seg: 90, observacoes: null, grupo_muscular: "peito" as const, grupos_secundarios: ["triceps" as const], series_aquecimento: 0, tecnica: "normal" as const, bloco: null, unilateral: false, carga_alvo: null },
            { id: `m2-${letra}3`, ordem: 2, nome: i === 0 ? "Puxada frontal aberta" : "Remada baixa triângulo", series: 3, reps: "10-12", ie: 7, rir: 3, descanso_seg: 90, observacoes: null, grupo_muscular: "costas" as const, grupos_secundarios: ["biceps" as const], series_aquecimento: 0, tecnica: "normal" as const, bloco: null, unilateral: false, carga_alvo: null },
            { id: `m2-${letra}4`, ordem: 3, nome: "Mesa flexora", series: 2, reps: "12-15", ie: 7, rir: 3, descanso_seg: 60, observacoes: null, grupo_muscular: "posteriores" as const, grupos_secundarios: [], series_aquecimento: 0, tecnica: "normal" as const, bloco: null, unilateral: false, carga_alvo: null },
            { id: `m2-${letra}5`, ordem: 4, nome: "Elevação lateral", series: 2, reps: "12-15", ie: 7, rir: 3, descanso_seg: 60, observacoes: null, grupo_muscular: "ombros" as const, grupos_secundarios: [], series_aquecimento: 0, tecnica: "normal" as const, bloco: null, unilateral: false, carga_alvo: null },
            { id: `m2-${letra}6`, ordem: 5, nome: "Prancha frontal", series: 2, reps: "40s", ie: 7, rir: null, descanso_seg: 45, observacoes: null, grupo_muscular: "abdomen" as const, grupos_secundarios: [], series_aquecimento: 0, tecnica: "isometria" as const, bloco: null, unilateral: false, carga_alvo: null },
          ],
        })),
      },
      volume: null,
      tags: ["full body", "iniciante", "3 dias", "45 min"],
      status: "revisado",
      favorito: false,
      uso_count: 1,
      feedback: { util: 1, nao_util: 0, usei_adaptei: 1 },
      justificativa: null,
      autor_id: "trainer-montinho",
      excluido_em: null,
      created_at: "2026-03-01T00:00:00Z",
      updated_at: "2026-03-01T00:00:00Z",
    },
  ];

  const adaptacoes: Adaptacao[] = [
    {
      id: "adap-1",
      aluno_id: "aline",
      session_id: "sess-demo-2",
      session_exercise_id: null,
      exercicio_id: "ex-d1",
      exercicio_nome: "Desenvolvimento halter",
      motivo: "desconforto",
      descricao: "Ombro direito incomodou acima do paralelo.",
      status: "aberta",
      resposta: null,
      respondido_por: null,
      respondido_em: null,
      created_at: agoraMenos(4, 20),
    },
  ];

  const intervencoes: Intervencao[] = [
    {
      id: "int-1",
      aluno_id: "aline",
      autor_id: "trainer-montinho",
      tipo: "revisao_treino",
      titulo: "Revisão do bloco 2",
      descricao: "Subi o volume de glúteo para 14 séries e troquei o agachamento livre pelo hack por causa do joelho.",
      referencia: { versao: "ver-aline-2" },
      visivel_aluno: true,
      created_at: "2026-05-10T12:00:00Z",
      autor: { nome: "Montinho" },
    },
  ];

  return {
    alunos: mockAlunos.map((a) => ({ ...a })),
    treinos,
    exercicios,
    programas: [programaAline],
    versoes,
    sessions,
    sessionExercises,
    sessionSets,
    adaptacoes,
    intervencoes,
    memoria,
    correcoes: [],
    checkIns: mockCheckIns.map((c) => ({ ...c })),
    evolucao: mockEvolucao.map((e) => ({ ...e })),
  };
}

export function demoStore(): DemoStore {
  const g = globalThis as unknown as { __montinhoDemo?: DemoStore };
  if (!g.__montinhoDemo) g.__montinhoDemo = seed();
  return g.__montinhoDemo;
}

export { mockProfiles };
