// ============================================================================
// Relatórios de evolução — fórmulas declaradas, dados faltantes tratados.
//
// Regras (Prompt Mestre §8):
//  • Sessões feitas / planejadas com DENOMINADOR correto (frequência do
//    programa × semanas do período), nunca "7 dias = 7 treinos".
//  • Conquistas só quando VERDADEIRAS nos dados.
//  • e1RM opcional, fórmula declarada (Epley) e faixa de validade (1–12 reps).
//  • Sem dados suficientes → estado "insuficiente", nunca média fictícia.
// Todas as funções são puras e testadas em calcular.test.ts.
// ============================================================================

import { normalizarNome } from "@/lib/grupos";
import type { SessaoCompleta } from "@/lib/data/sessoes";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { Frequencia } from "@/lib/volume/calcular";

export type Periodo = { inicio: Date; fim: Date };

const DIA_MS = 86_400_000;

export function periodoDias(dias: number, fim = new Date()): Periodo {
  const f = new Date(fim);
  f.setHours(23, 59, 59, 999);
  const i = new Date(f.getTime() - (dias - 1) * DIA_MS);
  i.setHours(0, 0, 0, 0);
  return { inicio: i, fim: f };
}

export function periodoAnterior(p: Periodo): Periodo {
  const dur = p.fim.getTime() - p.inicio.getTime();
  return { inicio: new Date(p.inicio.getTime() - dur - 1), fim: new Date(p.inicio.getTime() - 1) };
}

export function sessoesNoPeriodo(sessoes: SessaoCompleta[], p: Periodo): SessaoCompleta[] {
  return sessoes.filter((s) => {
    const t = new Date(s.finalizado_em ?? s.iniciado_em).getTime();
    return t >= p.inicio.getTime() && t <= p.fim.getTime();
  });
}

export function sessoesSemanaPlanejadas(frequencia: Frequencia | null | undefined): number {
  if (!frequencia) return 0;
  return Object.values(frequencia).reduce((n, v) => n + (Number(v) || 0), 0);
}

/** Número esperado de sessões no período (frequência semanal × dias/7), arredondado. */
export function sessoesPlanejadasNoPeriodo(frequencia: Frequencia | null | undefined, p: Periodo): number {
  const porSemana = sessoesSemanaPlanejadas(frequencia);
  if (!porSemana) return 0;
  const dias = Math.max(1, Math.round((p.fim.getTime() - p.inicio.getTime() + 1) / DIA_MS));
  return Math.round((porSemana * dias) / 7);
}

// ---------------------------------------------------------------------------
// Resumo (nível 1)
// ---------------------------------------------------------------------------
export type ResumoPeriodo = {
  dias: number;
  sessoesFeitas: number;
  sessoesPlanejadas: number;
  aderencia: number | null;        // %
  aderenciaAnterior: number | null;
  tendencia: "melhor" | "igual" | "pior" | "sem_comparacao";
  seriesFeitas: number;
  seriesPlanejadas: number;
  duracaoMediaMin: number | null;
  dadosSuficientes: boolean;
  conquistas: Conquista[];
};

export type Conquista = { tipo: "consistencia" | "carga" | "reps" | "volume" | "frequencia" | "retomada"; titulo: string; detalhe: string };

export function resumoPeriodo(sessoes: SessaoCompleta[], frequencia: Frequencia | null | undefined, dias: number, agora = new Date()): ResumoPeriodo {
  const p = periodoDias(dias, agora);
  const ant = periodoAnterior(p);
  const feitas = sessoesNoPeriodo(sessoes, p).filter((s) => s.status === "concluida");
  const feitasAnt = sessoesNoPeriodo(sessoes, ant).filter((s) => s.status === "concluida");
  const planejadas = sessoesPlanejadasNoPeriodo(frequencia, p);
  const planejadasAnt = sessoesPlanejadasNoPeriodo(frequencia, ant);
  const aderencia = planejadas > 0 ? Math.min(100, Math.round((feitas.length / planejadas) * 100)) : null;
  const aderenciaAnterior = planejadasAnt > 0 && feitasAnt.length > 0 ? Math.min(100, Math.round((feitasAnt.length / planejadasAnt) * 100)) : null;
  let tendencia: ResumoPeriodo["tendencia"] = "sem_comparacao";
  if (aderencia !== null && aderenciaAnterior !== null) {
    tendencia = aderencia > aderenciaAnterior + 5 ? "melhor" : aderencia < aderenciaAnterior - 5 ? "pior" : "igual";
  }
  const seriesFeitas = feitas.reduce((n, s) => n + s.series_concluidas, 0);
  const seriesPlanejadas = feitas.reduce((n, s) => n + s.series_planejadas, 0);
  const duracoes = feitas.map((s) => s.duracao_seg).filter((d): d is number => typeof d === "number" && d > 0);
  const duracaoMediaMin = duracoes.length ? Math.round(duracoes.reduce((a, b) => a + b, 0) / duracoes.length / 60) : null;

  const conquistas: Conquista[] = [];
  if (planejadas > 0 && feitas.length >= planejadas) {
    conquistas.push({ tipo: "consistencia", titulo: "Semana(s) completa(s)", detalhe: `${feitas.length} de ${planejadas} sessões planejadas no período.` });
  } else if (aderenciaAnterior !== null && aderencia !== null && aderencia > aderenciaAnterior) {
    conquistas.push({ tipo: "frequencia", titulo: "Mais constante que no período anterior", detalhe: `Aderência ${aderencia}% contra ${aderenciaAnterior}% antes.` });
  }
  const prs = recordesNoPeriodo(sessoes, p);
  for (const pr of prs.slice(0, 2)) {
    conquistas.push({
      tipo: pr.tipo,
      titulo: pr.tipo === "carga" ? `Melhor carga em ${pr.exercicio}` : `Melhor marca de repetições em ${pr.exercicio}`,
      detalhe: pr.tipo === "carga" ? `${pr.valor} kg × ${pr.reps} reps (antes: ${pr.anterior ?? "—"} kg).` : `${pr.valor} reps com ${pr.carga} kg (antes: ${pr.anterior ?? "—"}).`,
    });
  }
  const volAtual = tonelagem(feitas);
  const volAnt = tonelagem(feitasAnt);
  if (volAnt > 0 && volAtual > volAnt * 1.05 && conquistas.length < 3) {
    conquistas.push({ tipo: "volume", titulo: "Mais trabalho total que no período anterior", detalhe: `${Math.round(volAtual)} kg movimentados contra ${Math.round(volAnt)} kg.` });
  }

  return {
    dias,
    sessoesFeitas: feitas.length,
    sessoesPlanejadas: planejadas,
    aderencia,
    aderenciaAnterior,
    tendencia,
    seriesFeitas,
    seriesPlanejadas,
    duracaoMediaMin,
    dadosSuficientes: feitas.length >= 2,
    conquistas: conquistas.slice(0, 3),
  };
}

// ---------------------------------------------------------------------------
// Força / performance
// ---------------------------------------------------------------------------
/** e1RM por Epley: carga × (1 + reps/30). Válido para 1–12 reps; fora disso retorna null. */
export function e1rmEpley(carga: number | null | undefined, reps: number | null | undefined): number | null {
  if (!carga || !reps || carga <= 0 || reps < 1 || reps > 12) return null;
  return Math.round(carga * (1 + reps / 30) * 10) / 10;
}

export type SerieHistorica = { data: string; sessaoId: string; serie: number; carga_kg: number | null; reps: number | null; e1rm: number | null; grupo: GrupoMuscular | null };

export function seriesPorExercicio(sessoes: SessaoCompleta[]): Map<string, { nome: string; series: SerieHistorica[] }> {
  const out = new Map<string, { nome: string; series: SerieHistorica[] }>();
  for (const s of sessoes) {
    if (s.status !== "concluida") continue;
    const data = (s.finalizado_em ?? s.iniciado_em).slice(0, 10);
    for (const e of s.exercicios) {
      const k = normalizarNome(e.nome);
      if (!k) continue;
      const bucket = out.get(k) ?? { nome: e.nome, series: [] };
      for (const x of e.series) {
        if (x.tipo === "aquecimento") continue;
        bucket.series.push({ data, sessaoId: s.id, serie: x.serie, carga_kg: x.carga_kg, reps: x.reps, e1rm: e1rmEpley(x.carga_kg, x.reps), grupo: e.grupo_muscular });
      }
      out.set(k, bucket);
    }
  }
  return out;
}

export type MelhorMarca = { exercicio: string; chave: string; melhorCarga: { carga: number; reps: number; data: string } | null; melhorReps: { reps: number; carga: number; data: string } | null; melhorE1rm: { valor: number; data: string } | null; ultimaData: string | null; sessoes: number };

export function melhoresMarcas(sessoes: SessaoCompleta[]): MelhorMarca[] {
  const mapa = seriesPorExercicio(sessoes);
  const out: MelhorMarca[] = [];
  for (const [chave, { nome, series }] of mapa) {
    let melhorCarga: MelhorMarca["melhorCarga"] = null;
    let melhorReps: MelhorMarca["melhorReps"] = null;
    let melhorE1rm: MelhorMarca["melhorE1rm"] = null;
    const datas = new Set<string>();
    for (const s of series) {
      datas.add(s.data);
      if (s.carga_kg != null && s.reps != null && s.reps > 0) {
        if (!melhorCarga || s.carga_kg > melhorCarga.carga || (s.carga_kg === melhorCarga.carga && s.reps > melhorCarga.reps)) melhorCarga = { carga: s.carga_kg, reps: s.reps, data: s.data };
        if (!melhorReps || s.reps > melhorReps.reps || (s.reps === melhorReps.reps && s.carga_kg > melhorReps.carga)) melhorReps = { reps: s.reps, carga: s.carga_kg, data: s.data };
      }
      if (s.e1rm != null && (!melhorE1rm || s.e1rm > melhorE1rm.valor)) melhorE1rm = { valor: s.e1rm, data: s.data };
    }
    const ultimaData = [...datas].sort().at(-1) ?? null;
    out.push({ exercicio: nome, chave, melhorCarga, melhorReps, melhorE1rm, ultimaData, sessoes: datas.size });
  }
  return out.sort((a, b) => b.sessoes - a.sessoes);
}

export type Recorde = { tipo: "carga" | "reps"; exercicio: string; valor: number; reps?: number; carga?: number; anterior: number | null; data: string };

/** Recordes REAIS alcançados dentro do período, comparados com todo o histórico anterior. */
export function recordesNoPeriodo(sessoes: SessaoCompleta[], p: Periodo): Recorde[] {
  const mapa = seriesPorExercicio(sessoes);
  const out: Recorde[] = [];
  for (const [, { nome, series }] of mapa) {
    const antes = series.filter((s) => new Date(s.data).getTime() < p.inicio.getTime());
    const dentro = series.filter((s) => {
      const t = new Date(s.data).getTime();
      return t >= p.inicio.getTime() && t <= p.fim.getTime();
    });
    if (!antes.length || !dentro.length) continue; // sem histórico anterior não é "recorde", é primeira execução
    const maxCargaAntes = Math.max(...antes.map((s) => s.carga_kg ?? 0));
    const melhorDentro = dentro.filter((s) => s.carga_kg != null && s.reps).sort((a, b) => (b.carga_kg ?? 0) - (a.carga_kg ?? 0))[0];
    if (melhorDentro && (melhorDentro.carga_kg ?? 0) > maxCargaAntes) {
      out.push({ tipo: "carga", exercicio: nome, valor: melhorDentro.carga_kg!, reps: melhorDentro.reps!, anterior: maxCargaAntes || null, data: melhorDentro.data });
      continue;
    }
    // melhor marca de reps NA MESMA carga máxima
    const cargaRef = maxCargaAntes;
    const repsAntes = Math.max(...antes.filter((s) => s.carga_kg === cargaRef).map((s) => s.reps ?? 0));
    const repsDentro = dentro.filter((s) => s.carga_kg === cargaRef).sort((a, b) => (b.reps ?? 0) - (a.reps ?? 0))[0];
    if (repsDentro && (repsDentro.reps ?? 0) > repsAntes && repsAntes > 0) {
      out.push({ tipo: "reps", exercicio: nome, valor: repsDentro.reps!, carga: cargaRef, anterior: repsAntes, data: repsDentro.data });
    }
  }
  return out;
}

export function evolucaoExercicio(sessoes: SessaoCompleta[], chave: string): Array<{ data: string; cargaMax: number | null; e1rmMax: number | null; tonelagem: number; series: number }> {
  const mapa = seriesPorExercicio(sessoes);
  const b = mapa.get(normalizarNome(chave));
  if (!b) return [];
  const porData = new Map<string, { cargaMax: number | null; e1rmMax: number | null; tonelagem: number; series: number }>();
  for (const s of b.series) {
    const d = porData.get(s.data) ?? { cargaMax: null, e1rmMax: null, tonelagem: 0, series: 0 };
    d.series += 1;
    if (s.carga_kg != null) d.cargaMax = Math.max(d.cargaMax ?? 0, s.carga_kg);
    if (s.e1rm != null) d.e1rmMax = Math.max(d.e1rmMax ?? 0, s.e1rm);
    if (s.carga_kg != null && s.reps != null) d.tonelagem += s.carga_kg * s.reps;
    porData.set(s.data, d);
  }
  return [...porData.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([data, v]) => ({ data, ...v, tonelagem: Math.round(v.tonelagem) }));
}

/** Tonelagem (carga × reps) de séries válidas. Só faz sentido comparando os mesmos exercícios. */
export function tonelagem(sessoes: SessaoCompleta[]): number {
  let t = 0;
  for (const s of sessoes) for (const e of s.exercicios) for (const x of e.series) {
    if (x.tipo === "aquecimento" || x.carga_kg == null || x.reps == null) continue;
    t += x.carga_kg * x.reps;
  }
  return Math.round(t);
}

// ---------------------------------------------------------------------------
// Frequência / calendário
// ---------------------------------------------------------------------------
export type DiaCalendario = { data: string; status: "feito" | "abandonado" | "nenhum"; letra: string | null; duracaoMin: number | null };

export function calendarioSessoes(sessoes: SessaoCompleta[], p: Periodo): DiaCalendario[] {
  const porDia = new Map<string, DiaCalendario>();
  for (let t = p.inicio.getTime(); t <= p.fim.getTime(); t += DIA_MS) {
    const d = new Date(t).toISOString().slice(0, 10);
    porDia.set(d, { data: d, status: "nenhum", letra: null, duracaoMin: null });
  }
  for (const s of sessoesNoPeriodo(sessoes, p)) {
    const d = (s.finalizado_em ?? s.iniciado_em).slice(0, 10);
    const atual = porDia.get(d);
    if (!atual) continue;
    if (s.status === "concluida") porDia.set(d, { data: d, status: "feito", letra: s.letra, duracaoMin: s.duracao_seg ? Math.round(s.duracao_seg / 60) : null });
    else if (s.status === "abandonada" && atual.status !== "feito") porDia.set(d, { data: d, status: "abandonado", letra: s.letra, duracaoMin: null });
  }
  return [...porDia.values()];
}

// ---------------------------------------------------------------------------
// Semana atual e próximo treino (semana flexível: não bloqueia por dia da semana)
// ---------------------------------------------------------------------------
export type EstadoSemana = {
  feitasSemana: number;
  planejadasSemana: number;
  letrasFeitasSemana: string[];
  proximaLetra: string | null;
  diasSemUltimoTreino: number | null;
  retomada: boolean; // 7+ dias sem treinar
};

export function estadoSemana(sessoes: SessaoCompleta[], frequencia: Frequencia | null | undefined, letrasAtivas: string[], agora = new Date()): EstadoSemana {
  const inicioSemana = new Date(agora);
  const dow = (inicioSemana.getDay() + 6) % 7; // segunda = 0
  inicioSemana.setDate(inicioSemana.getDate() - dow);
  inicioSemana.setHours(0, 0, 0, 0);
  const concluidas = sessoes.filter((s) => s.status === "concluida").sort((a, b) => (a.iniciado_em < b.iniciado_em ? 1 : -1));
  const semana = concluidas.filter((s) => new Date(s.finalizado_em ?? s.iniciado_em).getTime() >= inicioSemana.getTime());
  const letrasFeitas: string[] = semana.map((s) => s.letra).filter((l): l is NonNullable<typeof l> => Boolean(l));
  const planejadasSemana = Math.round(sessoesSemanaPlanejadas(frequencia));

  // Próxima letra: a que vem depois da última concluída na ordem do plano; se
  // alguma letra ainda não foi feita esta semana e já deveria ter sido, ela entra na frente.
  let proximaLetra: string | null = null;
  if (letrasAtivas.length) {
    const ultima = concluidas[0]?.letra ?? null;
    const idx = ultima ? letrasAtivas.indexOf(ultima) : -1;
    const ordemCiclo = [...letrasAtivas.slice(idx + 1), ...letrasAtivas.slice(0, idx + 1)];
    const contagem: Record<string, number> = {};
    for (const l of letrasFeitas) contagem[l] = (contagem[l] ?? 0) + 1;
    proximaLetra = ordemCiclo.find((l) => (contagem[l] ?? 0) < Math.max(1, Math.round(Number(frequencia?.[l] ?? 1)))) ?? ordemCiclo[0] ?? null;
  }
  const ultimaData = concluidas[0] ? new Date(concluidas[0].finalizado_em ?? concluidas[0].iniciado_em) : null;
  const diasSem = ultimaData ? Math.floor((agora.getTime() - ultimaData.getTime()) / DIA_MS) : null;
  return { feitasSemana: semana.length, planejadasSemana, letrasFeitasSemana: letrasFeitas, proximaLetra, diasSemUltimoTreino: diasSem, retomada: diasSem !== null && diasSem >= 7 };
}

// ---------------------------------------------------------------------------
// Volume realizado por grupo no período (séries válidas)
// ---------------------------------------------------------------------------
export function seriesRealizadasPorGrupo(sessoes: SessaoCompleta[], p: Periodo): Array<{ grupo: GrupoMuscular | null; tipo: string }> {
  const out: Array<{ grupo: GrupoMuscular | null; tipo: string }> = [];
  for (const s of sessoesNoPeriodo(sessoes, p)) {
    if (s.status !== "concluida") continue;
    for (const e of s.exercicios) for (const x of e.series) out.push({ grupo: e.grupo_muscular, tipo: x.tipo });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Alertas do treinador: evidência + janela + ação
// ---------------------------------------------------------------------------
export type AlertaTreinador = { alunoId: string; alunoNome: string; tipo: "aderencia" | "adaptacao" | "desconforto" | "sem_evolucao" | "sem_plano" | "sem_registro"; evidencia: string; janela: string; acao: string; prioridade: 1 | 2 | 3 };

export function alertasDoAluno(input: {
  alunoId: string;
  alunoNome: string;
  status: string;
  sessoes: SessaoCompleta[];
  frequencia: Frequencia | null | undefined;
  temPlano: boolean;
  adaptacoesAbertas: number;
  checkinsDorAlta: number;
  agora?: Date;
}): AlertaTreinador[] {
  const agora = input.agora ?? new Date();
  const out: AlertaTreinador[] = [];
  const base = { alunoId: input.alunoId, alunoNome: input.alunoNome };
  if (input.status !== "ativo") return out;
  if (!input.temPlano) {
    out.push({ ...base, tipo: "sem_plano", evidencia: "Sem programa ativo", janela: "agora", acao: "Montar treino", prioridade: 1 });
    return out;
  }
  const r14 = resumoPeriodo(input.sessoes, input.frequencia, 14, agora);
  if (r14.sessoesPlanejadas > 0 && r14.sessoesFeitas / r14.sessoesPlanejadas < 0.5) {
    out.push({ ...base, tipo: "aderencia", evidencia: `${r14.sessoesFeitas} de ${r14.sessoesPlanejadas} sessões planejadas`, janela: "últimas 2 semanas", acao: "Conversar e ajustar frequência", prioridade: 1 });
  }
  if (input.adaptacoesAbertas > 0) {
    out.push({ ...base, tipo: "adaptacao", evidencia: `${input.adaptacoesAbertas} pedido(s) de adaptação sem resposta`, janela: "em aberto", acao: "Responder e revisar exercício", prioridade: 1 });
  }
  if (input.checkinsDorAlta > 0) {
    out.push({ ...base, tipo: "desconforto", evidencia: `${input.checkinsDorAlta} check-in(s) com dor/desconforto ≥ 7`, janela: "últimos 7 dias", acao: "Avaliar antes do próximo treino (sem decisão automática)", prioridade: 2 });
  }
  const p56 = periodoDias(56, agora);
  const marcas = melhoresMarcas(sessoesNoPeriodo(input.sessoes, p56));
  const semEvolucao = marcas.filter((m) => m.sessoes >= 4 && m.melhorE1rm && !recordesNoPeriodo(input.sessoes, periodoDias(28, agora)).some((r) => normalizarNome(r.exercicio) === m.chave));
  if (marcas.length >= 3 && semEvolucao.length === marcas.length && r14.sessoesFeitas >= 3) {
    out.push({ ...base, tipo: "sem_evolucao", evidencia: `Sem novas marcas em ${semEvolucao.length} exercício(s) com 4+ sessões`, janela: "últimas 4 semanas", acao: "Revisar progressão/carga", prioridade: 3 });
  }
  const ultima = input.sessoes.filter((s) => s.status === "concluida").sort((a, b) => (a.iniciado_em < b.iniciado_em ? 1 : -1))[0];
  if (!ultima) out.push({ ...base, tipo: "sem_registro", evidencia: "Nenhuma sessão registrada ainda", janela: "desde o cadastro", acao: "Verificar acesso ao app", prioridade: 2 });
  return out;
}
