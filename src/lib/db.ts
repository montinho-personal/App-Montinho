// Camada de acesso a dados.
// Mock mode: sem NEXT_PUBLIC_SUPABASE_URL → retorna dados fictícios.
// Live mode: usa Supabase admin (bypassa RLS; segurança fica no proxy.ts).

import {
  mockAlunos,
  mockDieta,
  mockEvolucao,
  mockExercicios,
  mockLogbook,
  mockPagamentos,
  mockProfiles,
  mockTreinos,
} from "@/lib/mock/db";
import {
  mockAnamnese,
  mockBiblioteca,
  mockCheckIns,
  mockConhecimento,
  mockFotos,
  mockMensagens,
  mockSolicitacoes,
  mockTemplates,
} from "@/lib/mock/db-extended";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL;

// Em mock mode o Montador grava aqui. Usamos globalThis porque o Turbopack
// isola os módulos entre Server Components (page) e Route Handlers (api) —
// um array importado não é compartilhado, mas globalThis é singleton de processo.
type MockStore = {
  exercicios: Record<string, ExercicioInput[]>; // treinoId -> exercícios salvos
  nomes: Record<string, string>; // treinoId -> nome do treino
};
function mockStore(): MockStore {
  const g = globalThis as unknown as { __squadMock?: MockStore };
  if (!g.__squadMock) g.__squadMock = { exercicios: {}, nomes: {} };
  return g.__squadMock;
}

// ============================================================================
// Alunos
// ============================================================================
export async function listAlunos() {
  if (isMockMode) {
    return mockAlunos.map((a) => {
      const profile = mockProfiles.find((p) => p.id === a.profile_id);
      return { ...a, profile };
    });
  }
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("alunos")
    .select("*, profile:profiles(*)")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getAluno(id: string) {
  if (isMockMode) {
    const aluno = mockAlunos.find((a) => a.id === id);
    if (!aluno) return null;
    const profile = mockProfiles.find((p) => p.id === aluno.profile_id);
    return { ...aluno, profile };
  }
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("alunos")
    .select("*, profile:profiles(*)")
    .eq("id", id)
    .maybeSingle();
  return data;
}

// ============================================================================
// Treinos / Exercícios
// ============================================================================
export async function listTreinos(alunoId: string) {
  if (isMockMode) {
    return mockTreinos
      .filter((t) => t.aluno_id === alunoId)
      .sort((a, b) => a.ordem - b.ordem);
  }
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("treinos")
    .select("*")
    .eq("aluno_id", alunoId)
    .eq("ativo", true)
    .order("ordem");
  return data ?? [];
}

// Exercícios efetivos no mock: override salvo (globalThis) ou os do seed.
function mockExerciciosEfetivos(treinoId: string) {
  const override = mockStore().exercicios[treinoId];
  if (override) {
    return override.map((ex, ordem) => ({
      id: `ex-mock-${treinoId}-${ordem}`,
      treino_id: treinoId,
      ordem,
      nome: ex.nome,
      series: ex.series,
      reps: ex.reps,
      ie: ex.ie,
      descanso_seg: ex.descanso_seg,
      observacoes: ex.observacoes,
      video_url: null,
      created_at: new Date().toISOString(),
    }));
  }
  return mockExercicios
    .filter((e) => e.treino_id === treinoId)
    .sort((a, b) => a.ordem - b.ordem);
}

export async function listExerciciosByTreino(treinoId: string) {
  if (isMockMode) {
    return mockExerciciosEfetivos(treinoId);
  }
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("exercicios")
    .select("*")
    .eq("treino_id", treinoId)
    .order("ordem");
  return data ?? [];
}

export async function getTreinoComExercicios(treinoId: string) {
  if (isMockMode) {
    const treino = mockTreinos.find((t) => t.id === treinoId);
    if (!treino) return null;
    const nomeOverride = mockStore().nomes[treinoId];
    const exercicios = mockExerciciosEfetivos(treinoId).map((e) => {
      const biblioteca =
        mockBiblioteca.find((b) => b.nome.toLowerCase() === e.nome.toLowerCase()) ?? null;
      return { ...e, biblioteca };
    });
    return { ...treino, nome: nomeOverride ?? treino.nome, exercicios };
  }
  const db = createSupabaseAdminClient();
  const { data: treino } = await db
    .from("treinos")
    .select("*")
    .eq("id", treinoId)
    .maybeSingle();
  if (!treino) return null;

  const { data: exercicios } = await db
    .from("exercicios")
    .select("*, biblioteca:exercicios_biblioteca(*)")
    .eq("treino_id", treinoId)
    .order("ordem");

  return { ...treino, exercicios: exercicios ?? [] };
}

// ── Persistência do Montador (Fase 3) ────────────────────────────────────────
export type ExercicioInput = {
  nome: string;
  series: number;
  reps: string;
  ie: number | null;
  descanso_seg: number | null;
  observacoes: string | null;
};

/**
 * Salva o treino completo: atualiza o nome e SUBSTITUI todos os exercícios
 * (replace em batch — espelha a ordem da grade do Montador).
 * Mock: muta os arrays em memória (persiste dentro da sessão do dev server).
 * Live: update no treino + delete + insert dos exercícios.
 */
export async function saveExerciciosTreino(
  treinoId: string,
  nome: string,
  exercicios: ExercicioInput[]
): Promise<{ ok: boolean; count: number }> {
  if (isMockMode) {
    const store = mockStore();
    store.exercicios[treinoId] = exercicios;
    store.nomes[treinoId] = nome;
    return { ok: true, count: exercicios.length };
  }

  const db = createSupabaseAdminClient();
  await db.from("treinos").update({ nome }).eq("id", treinoId);
  await db.from("exercicios").delete().eq("treino_id", treinoId);
  if (exercicios.length > 0) {
    await db.from("exercicios").insert(
      exercicios.map((ex, ordem) => ({
        treino_id: treinoId,
        ordem,
        nome: ex.nome,
        series: ex.series,
        reps: ex.reps,
        ie: ex.ie,
        descanso_seg: ex.descanso_seg,
        observacoes: ex.observacoes,
      }))
    );
  }
  return { ok: true, count: exercicios.length };
}

// ============================================================================
// Dieta
// ============================================================================
export async function listDieta(alunoId: string) {
  if (isMockMode) {
    return mockDieta
      .filter((d) => d.aluno_id === alunoId)
      .sort((a, b) => a.ordem - b.ordem);
  }
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("dieta")
    .select("*")
    .eq("aluno_id", alunoId)
    .order("ordem");
  return data ?? [];
}

// ============================================================================
// Logbook
// ============================================================================
export async function listLogbookByExercicio(alunoId: string, exercicioId: string) {
  if (isMockMode) {
    return mockLogbook
      .filter((l) => l.aluno_id === alunoId && l.exercicio_id === exercicioId)
      .sort((a, b) => (a.data < b.data ? 1 : -1));
  }
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("logbook")
    .select("*")
    .eq("aluno_id", alunoId)
    .eq("exercicio_id", exercicioId)
    .order("data", { ascending: false })
    .order("serie");
  return data ?? [];
}

export async function listLogbookByAluno(alunoId: string, limit = 50) {
  if (isMockMode) {
    return mockLogbook
      .filter((l) => l.aluno_id === alunoId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, limit);
  }
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("logbook")
    .select("*")
    .eq("aluno_id", alunoId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

// ============================================================================
// Evolução
// ============================================================================
export async function listEvolucao(alunoId: string) {
  if (isMockMode) {
    return mockEvolucao
      .filter((e) => e.aluno_id === alunoId)
      .sort((a, b) => (a.data < b.data ? -1 : 1));
  }
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("evolucao")
    .select("*")
    .eq("aluno_id", alunoId)
    .order("data");
  return data ?? [];
}

// ============================================================================
// Pagamentos
// ============================================================================
export async function listPagamentos(alunoId?: string) {
  if (isMockMode) {
    const all = mockPagamentos.sort((a, b) =>
      a.created_at < b.created_at ? 1 : -1
    );
    return alunoId ? all.filter((p) => p.aluno_id === alunoId) : all;
  }
  const db = createSupabaseAdminClient();
  let q = db
    .from("pagamentos")
    .select("*, aluno:alunos(profile:profiles(nome, email))")
    .order("created_at", { ascending: false });
  if (alunoId) q = q.eq("aluno_id", alunoId);
  const { data } = await q;
  return data ?? [];
}

// ============================================================================
// Biblioteca de exercícios
// ============================================================================
export async function listBiblioteca(grupo?: string) {
  if (isMockMode) {
    const ativos = mockBiblioteca.filter((e) => !e.arquivado);
    return grupo ? ativos.filter((e) => e.grupo_muscular === grupo) : ativos;
  }
  const db = createSupabaseAdminClient();
  let q = db
    .from("exercicios_biblioteca")
    .select("*")
    .eq("arquivado", false)
    .order("nome");
  if (grupo) q = q.eq("grupo_muscular", grupo);
  const { data } = await q;
  return data ?? [];
}

export async function getBibliotecaItem(id: string) {
  if (isMockMode) {
    return mockBiblioteca.find((e) => e.id === id) ?? null;
  }
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("exercicios_biblioteca")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

// ============================================================================
// Templates de treino
// ============================================================================
export async function listTemplates() {
  if (isMockMode) return mockTemplates;
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("templates_treino")
    .select("*")
    .order("uso_count", { ascending: false });
  return data ?? [];
}

// ============================================================================
// Check-ins
// ============================================================================
export async function listCheckIns(alunoId: string, dias = 30) {
  if (isMockMode) {
    const limite = new Date();
    limite.setDate(limite.getDate() - dias);
    return mockCheckIns
      .filter((c) => c.aluno_id === alunoId && new Date(c.data) >= limite)
      .sort((a, b) => (a.data < b.data ? -1 : 1));
  }
  const db = createSupabaseAdminClient();
  const limite = new Date();
  limite.setDate(limite.getDate() - dias);
  const { data } = await db
    .from("check_ins")
    .select("*")
    .eq("aluno_id", alunoId)
    .gte("data", limite.toISOString().slice(0, 10))
    .order("data");
  return data ?? [];
}

export async function getCheckInHoje(alunoId: string) {
  if (isMockMode) {
    const hoje = new Date().toISOString().slice(0, 10);
    return (
      mockCheckIns.find(
        (c) => c.aluno_id === alunoId && c.data === hoje
      ) ?? null
    );
  }
  const db = createSupabaseAdminClient();
  const hoje = new Date().toISOString().slice(0, 10);
  const { data } = await db
    .from("check_ins")
    .select("*")
    .eq("aluno_id", alunoId)
    .eq("data", hoje)
    .maybeSingle();
  return data;
}

// ============================================================================
// Anamnese
// ============================================================================
export async function getAnamnese(alunoId: string) {
  if (isMockMode) {
    return mockAnamnese.find((a) => a.aluno_id === alunoId) ?? null;
  }
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("anamnese")
    .select("*")
    .eq("aluno_id", alunoId)
    .maybeSingle();
  return data;
}

// ============================================================================
// Fotos de evolução
// ============================================================================
export async function listFotos(alunoId: string) {
  if (isMockMode) {
    return mockFotos
      .filter((f) => f.aluno_id === alunoId)
      .sort((a, b) => (a.data < b.data ? -1 : 1));
  }
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("fotos")
    .select("*")
    .eq("aluno_id", alunoId)
    .order("data");
  return data ?? [];
}

// ============================================================================
// Solicitações recorrentes
// ============================================================================
export async function listSolicitacoes(alunoId: string) {
  if (isMockMode) {
    return mockSolicitacoes
      .filter((s) => s.aluno_id === alunoId)
      .sort((a, b) => (a.proxima_em < b.proxima_em ? -1 : 1));
  }
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("solicitacoes")
    .select("*")
    .eq("aluno_id", alunoId)
    .order("proxima_em");
  return data ?? [];
}

/**
 * Processa as solicitações vencidas (proxima_em <= hoje): dispara um lembrete
 * no chat e reprograma a próxima (ou desativa se for envio único).
 * Chamado pelo cron /api/cron/solicitacoes.
 */
export async function processarSolicitacoes(): Promise<{
  processadas: number;
  detalhes: Array<{ aluno_id: string; titulo: string; proxima_em: string }>;
}> {
  const hoje = new Date().toISOString().slice(0, 10);
  const proxima = (dias: number | null): string | null => {
    if (dias == null) return null;
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
  };

  if (isMockMode) {
    const devidas = mockSolicitacoes.filter((s) => s.ativo && s.proxima_em <= hoje);
    const detalhes = devidas.map((s) => {
      s.ultima_em = hoje;
      const nx = proxima(s.recorrencia_dias);
      if (nx) s.proxima_em = nx;
      else s.ativo = false;
      return { aluno_id: s.aluno_id, titulo: s.titulo, proxima_em: s.proxima_em };
    });
    return { processadas: detalhes.length, detalhes };
  }

  const db = createSupabaseAdminClient();
  const { data: treinador } = await db
    .from("profiles")
    .select("id")
    .eq("role", "treinador")
    .limit(1)
    .maybeSingle();
  const { data: devidas } = await db
    .from("solicitacoes")
    .select("*")
    .eq("ativo", true)
    .lte("proxima_em", hoje);

  const detalhes: Array<{ aluno_id: string; titulo: string; proxima_em: string }> = [];
  for (const s of devidas ?? []) {
    if (treinador?.id) {
      await db.from("mensagens").insert({
        aluno_id: s.aluno_id,
        remetente_id: treinador.id,
        tipo: "sistema",
        conteudo: `📋 Lembrete: ${s.titulo}${s.descricao ? " — " + s.descricao : ""}`,
      });
    }
    const nx = proxima(s.recorrencia_dias);
    await db
      .from("solicitacoes")
      .update(nx ? { proxima_em: nx, ultima_em: hoje } : { ativo: false, ultima_em: hoje })
      .eq("id", s.id);
    detalhes.push({ aluno_id: s.aluno_id, titulo: s.titulo, proxima_em: nx ?? s.proxima_em });
  }
  return { processadas: detalhes.length, detalhes };
}

// ============================================================================
// Mensagens
// ============================================================================
export async function listMensagens(alunoId: string) {
  if (isMockMode) {
    return mockMensagens
      .filter((m) => m.aluno_id === alunoId)
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  }
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("mensagens")
    .select("*, remetente:profiles(nome, avatar_url)")
    .eq("aluno_id", alunoId)
    .order("created_at");
  return data ?? [];
}

// ============================================================================
// Base de Conhecimento
// ============================================================================
export async function listConhecimento(tipo?: string) {
  if (isMockMode) {
    const ativos = mockConhecimento.filter((c) => !c.arquivado);
    return tipo ? ativos.filter((c) => c.tipo === tipo) : ativos;
  }
  const db = createSupabaseAdminClient();
  let q = db
    .from("conhecimento")
    .select("*")
    .eq("arquivado", false)
    .order("destaque", { ascending: false })
    .order("created_at", { ascending: false });
  if (tipo) q = q.eq("tipo", tipo);
  const { data } = await q;
  return data ?? [];
}

export async function getConhecimento(id: string) {
  if (isMockMode) return mockConhecimento.find((c) => c.id === id) ?? null;
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("conhecimento")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

// ============================================================================
// Métricas do dashboard
// ============================================================================
export async function getDashboardMetrics() {
  if (isMockMode) {
    const alunos = mockAlunos;
    const hoje = new Date().toISOString().slice(0, 10);
    const ativos = alunos.filter((a) => a.status === "ativo").length;
    const inadimplentes = alunos.filter((a) => a.status === "inadimplente").length;
    const pendentes = alunos.filter((a) => a.status === "pendente").length;
    const proximosVencer = alunos.filter((a) => {
      if (!a.acesso_ate) return false;
      const dias =
        (new Date(a.acesso_ate).getTime() - new Date(hoje).getTime()) /
        (1000 * 60 * 60 * 24);
      return dias >= 0 && dias <= 7;
    }).length;
    const mesAtual = hoje.slice(0, 7);
    const recebidoCent = mockPagamentos
      .filter((p) => p.status === "pago" && p.pago_em?.startsWith(mesAtual))
      .reduce((acc, p) => acc + p.valor_centavos, 0);
    const pendenteCent = mockPagamentos
      .filter((p) => p.status === "pendente" || p.status === "atrasado")
      .reduce((acc, p) => acc + p.valor_centavos, 0);
    return {
      total_alunos: alunos.length,
      ativos,
      inadimplentes,
      pendentes,
      proximos_vencer: proximosVencer,
      receita_mes_cent: recebidoCent,
      pendente_cent: pendenteCent,
    };
  }

  const db = createSupabaseAdminClient();
  const hoje = new Date().toISOString().slice(0, 10);
  const mesAtual = hoje.slice(0, 7);

  const [{ data: alunos }, { data: pags }] = await Promise.all([
    db.from("alunos").select("status, acesso_ate"),
    db.from("pagamentos").select("status, valor_centavos, pago_em"),
  ]);

  const a = alunos ?? [];
  const p = pags ?? [];

  const proximosVencer = a.filter((x) => {
    if (!x.acesso_ate) return false;
    const dias =
      (new Date(x.acesso_ate).getTime() - new Date(hoje).getTime()) /
      (1000 * 60 * 60 * 24);
    return dias >= 0 && dias <= 7;
  }).length;

  return {
    total_alunos: a.length,
    ativos: a.filter((x) => x.status === "ativo").length,
    inadimplentes: a.filter((x) => x.status === "inadimplente").length,
    pendentes: a.filter((x) => x.status === "pendente").length,
    proximos_vencer: proximosVencer,
    receita_mes_cent: p
      .filter((x) => x.status === "pago" && x.pago_em?.startsWith(mesAtual))
      .reduce((acc, x) => acc + (x.valor_centavos ?? 0), 0),
    pendente_cent: p
      .filter((x) => x.status === "pendente" || x.status === "atrasado")
      .reduce((acc, x) => acc + (x.valor_centavos ?? 0), 0),
  };
}
