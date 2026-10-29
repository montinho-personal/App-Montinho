// ============================================================================
// Montinho Desbloqueia — leitura e gravação (sempre pelo cliente com RLS).
// • A base de 50 descobertas vive no código; o banco guarda edições do
//   personal (vence a base) e conteúdos novos.
// • O aluno grava só o próprio progresso; “acertou” é calculado aqui, no
//   servidor, a partir da resposta (nunca vem do cliente).
// • Tabelas ausentes (migração 0030 ainda não aplicada) não quebram a tela:
//   o aluno vê a base publicada e o progresso fica para depois.
// ============================================================================

import { revisaoDevida } from "@/lib/desbloqueia/revisao";
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { BASE_DESCOBERTAS } from "@/lib/desbloqueia/base";
import { albumDoAluno, CHAMADA_CONTEXTO, mesclarConteudos, pacoteDoTreino, responder, sugestaoContextual, type LinhaConteudoDb, type ProgressoAluno } from "@/lib/desbloqueia/motor";
import { CONTEXTOS, type ContextoConhecimento, type ConteudoConhecimento, type StatusEditorial } from "@/lib/desbloqueia/tipos";
import { listarConquistas } from "@/lib/data/conquistas";
import { dataLocal } from "@/lib/aderencia/calcular";
import { demoStore } from "@/lib/mock/store";

export type VersaoConteudo = { conteudo_id: string; versao: number; status: string; dados: Partial<ConteudoConhecimento>; created_at: string };
type ProgressoRow = ProgressoAluno & { aluno_id: string; recomendado_por?: string | null; updated_at?: string };

type Demo = { conteudos: LinhaConteudoDb[]; versoes: VersaoConteudo[]; progresso: ProgressoRow[]; porque: Record<string, { aluno_id: string; texto: string }> };
function demo(): Demo {
  const g = globalThis as unknown as { __montinhoDesbloqueia?: Demo };
  g.__montinhoDesbloqueia ??= { conteudos: [], versoes: [], progresso: [], porque: {} };
  return g.__montinhoDesbloqueia;
}

const MSG_MIGRACAO = "As tabelas do Montinho Desbloqueia ainda não foram criadas no banco (migração 0030).";
const erroAmigavel = (m: string) => (/conhecimento_|exercicio_porque|does not exist|schema cache/i.test(m) ? MSG_MIGRACAO : m);

/** Conteúdos (base + banco). Para o aluno, a RLS já devolve só os publicados do banco. */
export async function listarConteudos(): Promise<ConteudoConhecimento[]> {
  if (isDemoMode()) return mesclarConteudos(BASE_DESCOBERTAS, demo().conteudos);
  try {
    const db = await getDb();
    const { data, error } = await db.from("conhecimento_conteudos").select("id, dados, status, versao, ordem");
    return mesclarConteudos(BASE_DESCOBERTAS, error ? [] : ((data ?? []) as LinhaConteudoDb[]));
  } catch {
    return mesclarConteudos(BASE_DESCOBERTAS, []);
  }
}

export async function getConteudo(id: string): Promise<ConteudoConhecimento | null> {
  return (await listarConteudos()).find((c) => c.id === id) ?? null;
}

export async function progressoDoAluno(alunoId: string): Promise<ProgressoRow[]> {
  if (isDemoMode()) return demo().progresso.filter((p) => p.aluno_id === alunoId);
  try {
    const db = await getDb();
    const { data, error } = await db.from("conhecimento_aluno").select("*").eq("aluno_id", alunoId);
    return error ? [] : ((data ?? []) as ProgressoRow[]);
  } catch {
    return [];
  }
}

/** Personal: progresso de todos os alunos (analytics agregados). */
export async function progressoDeTodos(): Promise<ProgressoRow[]> {
  if (isDemoMode()) return demo().progresso;
  try {
    const db = await getDb();
    const { data, error } = await db.from("conhecimento_aluno").select("*").limit(20000);
    return error ? [] : ((data ?? []) as ProgressoRow[]);
  } catch {
    return [];
  }
}

/** Álbum completo do aluno (derivado: medalhas, tempo de acompanhamento, recomendações). */
export async function albumParaAluno(aluno: { id: string; data_inicio: string | null; created_at: string }, conquistasProntas?: Array<{ codigo: string; conquistado_em: string }>) {
  const [conteudos, progresso, conquistas] = await Promise.all([listarConteudos(), progressoDoAluno(aluno.id), conquistasProntas ?? listarConquistas(aluno.id)]);
  const hoje = dataLocal(new Date());
  const inicio = aluno.data_inicio ?? dataLocal(aluno.created_at);
  return { conteudos, progresso, itens: albumDoAluno({ conteudos, progresso, conquistas, inicio: inicio > hoje ? hoje : inicio, hoje }) };
}

async function upsertProgresso(alunoId: string, conteudoId: string, mudar: (atual: ProgressoRow | null) => Partial<ProgressoRow>): Promise<ProgressoRow> {
  const atual = (await progressoDoAluno(alunoId)).find((p) => p.conteudo_id === conteudoId) ?? null;
  const base: ProgressoRow = atual ?? { aluno_id: alunoId, conteudo_id: conteudoId, origem: null, disponivel_em: null, explorado_em: null, resposta: null, acertou: null, salvo: false };
  const novo: ProgressoRow = { ...base, ...mudar(atual), aluno_id: alunoId, conteudo_id: conteudoId, updated_at: new Date().toISOString() };
  if (isDemoMode()) {
    const lista = demo().progresso;
    const i = lista.findIndex((p) => p.aluno_id === alunoId && p.conteudo_id === conteudoId);
    if (i >= 0) lista[i] = novo;
    else lista.push(novo);
    return novo;
  }
  const db = await getDb();
  const { error } = await db.from("conhecimento_aluno").upsert(novo, { onConflict: "aluno_id,conteudo_id" });
  if (error) throw new Error(erroAmigavel(error.message));
  return novo;
}

/**
 * O aluno abriu/respondeu. O primeiro “explorado” fica (a data não muda);
 * a resposta registrada é a primeira — refazer o quiz não muda o histórico.
 */
export async function explorarConteudo(alunoId: string, conteudo: ConteudoConhecimento, e: { resposta?: string | null; origem?: ProgressoAluno["origem"]; revisao?: boolean }) {
  const resposta = e.resposta && conteudo.alternativas.some((a) => a.id === e.resposta) ? e.resposta : null;
  const resultado = resposta ? responder(conteudo, resposta) : null;
  const agora = new Date().toISOString();
  // Revisão (0114): a pergunta errada voltou e a pessoa respondeu de novo. A 1ª resposta fica.
  if (e.revisao && resposta) {
    const atual = (await progressoDoAluno(alunoId)).find((p) => p.conteudo_id === conteudo.id) ?? null;
    if (atual && revisaoDevida(atual, agora)) {
      await upsertProgresso(alunoId, conteudo.id, (a) => ({ revisoes: (a?.revisoes ?? 0) + 1, revisao_em: agora, revisao_resposta: resposta, revisao_acertou: resultado!.acertou }));
      return resultado;
    }
  }
  await upsertProgresso(alunoId, conteudo.id, (atual) => ({
    origem: atual?.origem ?? e.origem ?? "biblioteca",
    explorado_em: atual?.explorado_em ?? agora,
    ...(resposta && !atual?.resposta ? { resposta, acertou: resultado!.acertou } : {}),
  }));
  return resultado;
}

export async function salvarDescoberta(alunoId: string, conteudoId: string, salvo: boolean) {
  await upsertProgresso(alunoId, conteudoId, (atual) => ({ salvo, origem: atual?.origem ?? "biblioteca" }));
}

/** Personal recomenda: fica disponível agora (e aparece como “Nova” para o aluno). */
export async function recomendarConteudo(alunoId: string, conteudoId: string, autor: string) {
  await upsertProgresso(alunoId, conteudoId, (atual) => ({ origem: "personal", disponivel_em: new Date().toISOString(), recomendado_por: autor, explorado_em: atual?.explorado_em ?? null }));
}

/** Personal grava uma nova versão (o histórico anterior fica em conhecimento_versoes). */
export async function salvarConteudoEditorial(c: ConteudoConhecimento, status: StatusEditorial): Promise<{ versao: number }> {
  const atual = await getConteudo(c.id);
  const versao = (atual?.versao ?? 0) + 1;
  const { status: _s, versao: _v, personalizado: _p, ...dados } = c;
  void _s;
  void _v;
  void _p;
  const linha: LinhaConteudoDb = { id: c.id, dados, status, versao, ordem: c.ordem ?? c.numero ?? null };
  const registro: VersaoConteudo = { conteudo_id: c.id, versao, status, dados, created_at: new Date().toISOString() };
  if (isDemoMode()) {
    const d = demo();
    d.conteudos = [...d.conteudos.filter((x) => x.id !== c.id), linha];
    d.versoes.push(registro);
    return { versao };
  }
  const db = await getDb();
  const { error } = await db.from("conhecimento_conteudos").upsert({ ...linha, updated_at: registro.created_at }, { onConflict: "id" });
  if (error) throw new Error(erroAmigavel(error.message));
  const { error: e2 } = await db.from("conhecimento_versoes").insert({ conteudo_id: c.id, versao, status, dados });
  if (e2) throw new Error(erroAmigavel(e2.message));
  return { versao };
}

/** Só muda o status (publicar, arquivar…) — também vira uma versão no histórico. */
export async function mudarStatusConteudo(id: string, status: StatusEditorial) {
  const c = await getConteudo(id);
  if (!c) throw new Error("Conteúdo não encontrado.");
  return salvarConteudoEditorial(c, status);
}

export async function listarVersoes(id: string): Promise<VersaoConteudo[]> {
  if (isDemoMode()) return demo().versoes.filter((v) => v.conteudo_id === id).sort((a, b) => b.versao - a.versao);
  try {
    const db = await getDb();
    const { data, error } = await db.from("conhecimento_versoes").select("conteudo_id, versao, status, dados, created_at").eq("conteudo_id", id).order("versao", { ascending: false });
    return error ? [] : ((data ?? []) as VersaoConteudo[]);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// “Por que esse exercício está no meu treino?” (texto do personal)
// ---------------------------------------------------------------------------
export async function porquesDosExercicios(exercicioIds: string[]): Promise<Record<string, string>> {
  if (!exercicioIds.length) return {};
  if (isDemoMode()) return Object.fromEntries(exercicioIds.filter((id) => demo().porque[id]).map((id) => [id, demo().porque[id].texto]));
  try {
    const db = await getDb();
    const { data, error } = await db.from("exercicio_porque").select("exercicio_id, texto").in("exercicio_id", exercicioIds);
    if (error) return {};
    return Object.fromEntries((data ?? []).map((r: { exercicio_id: string; texto: string }) => [r.exercicio_id, r.texto]));
  } catch {
    return {};
  }
}

export async function salvarPorque(exercicioId: string, alunoId: string, texto: string) {
  const t = texto.trim();
  if (isDemoMode()) {
    if (t) demo().porque[exercicioId] = { aluno_id: alunoId, texto: t };
    else delete demo().porque[exercicioId];
    return;
  }
  const db = await getDb();
  const { error } = t
    ? await db.from("exercicio_porque").upsert({ exercicio_id: exercicioId, aluno_id: alunoId, texto: t, updated_at: new Date().toISOString() }, { onConflict: "exercicio_id" })
    : await db.from("exercicio_porque").delete().eq("exercicio_id", exercicioId);
  if (error) throw new Error(erroAmigavel(error.message));
}

/** Dono do exercício (para gravar o porquê com o aluno certo). */
export async function alunoDoExercicio(exercicioId: string): Promise<string | null> {
  if (isDemoMode()) {
    const s = demoStore();
    const ex = s.exercicios.find((e) => e.id === exercicioId);
    return ex ? (s.treinos.find((t) => t.id === ex.treino_id)?.aluno_id ?? null) : null;
  }
  const db = await getDb();
  const { data } = await db.from("exercicios").select("treinos(aluno_id)").eq("id", exercicioId).maybeSingle();
  const t = (data as { treinos?: { aluno_id: string } | Array<{ aluno_id: string }> } | null)?.treinos;
  return (Array.isArray(t) ? t[0]?.aluno_id : t?.aluno_id) ?? null;
}

/** Treino ativo: sugestões por momento + “por quê” dos exercícios. */
export async function desbloqueiaParaTreino(alunoId: string, exercicioIds: string[]) {
  const [conteudos, progresso, porques] = await Promise.all([listarConteudos(), progressoDoAluno(alunoId), porquesDosExercicios(exercicioIds)]);
  const explorados = progresso.filter((p) => p.explorado_em).map((p) => p.conteudo_id);
  return { ...pacoteDoTreino(conteudos, explorados, CONTEXTOS), porques };
}

/** Tela de conclusão: no máximo uma descoberta relevante ao que aconteceu hoje. */
export async function descobertaDaConclusao(alunoId: string, contextos: ContextoConhecimento[]): Promise<{ id: string; pergunta: string; chamada: string } | null> {
  if (!contextos.length) return null;
  const [conteudos, progresso] = await Promise.all([listarConteudos(), progressoDoAluno(alunoId)]);
  const explorados = progresso.filter((p) => p.explorado_em).map((p) => p.conteudo_id);
  for (const ctx of contextos) {
    const c = sugestaoContextual(ctx, conteudos, { explorados, jaSugeridos: [] });
    if (c) return { id: c.id, pergunta: c.pergunta, chamada: CHAMADA_CONTEXTO[ctx] };
  }
  return null;
}
