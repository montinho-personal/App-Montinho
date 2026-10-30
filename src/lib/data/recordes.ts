// ============================================================================
// Recordes pessoais e benchmarks (Multimodalidade, fase 4). Junta as séries de
// força já feitas no app, as marcas anotadas (`marcas_pessoais`, 0133) e os
// resultados de benchmark; as contas são PURAS em src/lib/modalidades/recordes.ts.
// Leitura pela RLS: o aluno vê só o dele; o personal, de qualquer aluno.
// ============================================================================
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { uid } from "@/lib/mock/store";
import { dataLocal } from "@/lib/aderencia/calcular";
import { normalizarNome } from "@/lib/grupos";
import { listSessoes } from "./sessoes";
import { resultadosDeBenchmark } from "./wod";
import { porExercicio, recordesDeBenchmark, recordesDeForca, type LinhaBenchmark, type LinhaRecorde, type MarcaPessoal, type SerieForca } from "@/lib/modalidades/recordes";

type Demo = { marcas: Array<MarcaPessoal & { id: string; aluno_id: string; removido_em: string | null; created_at: string }> };
function demo(): Demo {
  const g = globalThis as unknown as { __montinhoMarcas?: Demo };
  if (!g.__montinhoMarcas) g.__montinhoMarcas = { marcas: [] };
  return g.__montinhoMarcas;
}

export type RecordesDoAluno = {
  forca: ReturnType<typeof porExercicio>;
  linhas: LinhaRecorde[];
  benchmarks: LinhaBenchmark[];
  marcas: MarcaPessoal[];
};

export async function listarMarcas(alunoId: string): Promise<MarcaPessoal[]> {
  if (isDemoMode()) return demo().marcas.filter((m) => m.aluno_id === alunoId && !m.removido_em).sort((a, b) => (a.data < b.data ? 1 : -1));
  const db = await getDb();
  const { data } = await db.from("marcas_pessoais").select("id, biblioteca_id, benchmark_id, nome, tipo, valor, unidade, condicao, data, origem, observacoes").eq("aluno_id", alunoId).is("removido_em", null).order("data", { ascending: false }).limit(300);
  return ((data ?? []) as Array<Record<string, unknown>>).map((m) => ({
    id: String(m.id),
    chave: (m.biblioteca_id as string | null) ?? normalizarNome(String(m.nome)),
    nome: String(m.nome),
    tipo: m.tipo as MarcaPessoal["tipo"],
    valor: m.valor != null ? Number(m.valor) : null,
    unidade: (m.unidade as MarcaPessoal["unidade"]) ?? null,
    data: String(m.data),
    condicao: (m.condicao as MarcaPessoal["condicao"]) ?? null,
    origem: m.origem as MarcaPessoal["origem"],
    observacoes: (m.observacoes as string | null) ?? null,
  }));
}

export type EntradaMarca = { biblioteca_id?: string | null; nome: string; tipo: MarcaPessoal["tipo"]; valor?: number | null; unidade?: MarcaPessoal["unidade"]; data: string; condicao?: MarcaPessoal["condicao"]; observacoes?: string | null };

/** Anota uma marca. O aluno não registra “primeiro movimento técnico” (o banco também barra). */
export async function salvarMarca(alunoId: string, e: EntradaMarca, origem: "aluno" | "personal"): Promise<MarcaPessoal> {
  if (origem === "aluno" && e.tipo === "primeiro") throw new Error("O primeiro movimento técnico é registrado pelo Montinho.");
  const hoje = dataLocal(new Date());
  const data = e.data > hoje ? hoje : e.data;
  const linha = { aluno_id: alunoId, biblioteca_id: e.biblioteca_id ?? null, nome: e.nome.trim(), tipo: e.tipo, valor: e.valor ?? null, unidade: e.unidade ?? (e.tipo.endsWith("rm") ? "kg" : null), data, condicao: e.condicao ?? null, observacoes: e.observacoes ?? null, origem };
  if (isDemoMode()) {
    const m = { id: uid(), chave: linha.biblioteca_id ?? normalizarNome(linha.nome), ...linha, removido_em: null, created_at: new Date().toISOString() } as Demo["marcas"][number];
    demo().marcas.push(m);
    return m;
  }
  const db = await getDb();
  const { data: nova, error } = await db.from("marcas_pessoais").insert(linha).select("id").single();
  if (error) throw new Error(error.code === "42501" ? "Você não pode registrar essa marca." : `Não foi possível salvar: ${error.message}`);
  return { id: String(nova.id), chave: linha.biblioteca_id ?? normalizarNome(linha.nome), ...linha } as MarcaPessoal;
}

/** Tudo da tela “Meus recordes”. */
export async function recordesDoAluno(alunoId: string): Promise<RecordesDoAluno> {
  const [sessoes, marcas, bench] = await Promise.all([
    listSessoes(alunoId, { limite: 400, status: "todas" }).catch(() => []),
    listarMarcas(alunoId).catch(() => []),
    resultadosDeBenchmark(alunoId).catch(() => []),
  ]);
  const series: SerieForca[] = [];
  for (const s of sessoes) {
    if ((s as { origem?: string }).origem === "importado") continue;
    const data = dataLocal(s.iniciado_em);
    for (const ex of s.exercicios) {
      const chave = ex.biblioteca_id ?? normalizarNome(ex.nome);
      for (const st of ex.series) {
        if (st.tipo === "aquecimento" || !st.carga_kg || !st.reps) continue;
        series.push({ chave, nome: ex.nome, data, carga: Number(st.carga_kg), reps: st.reps });
      }
    }
  }
  const linhas = recordesDeForca(series, marcas);
  return { forca: porExercicio(linhas), linhas, benchmarks: recordesDeBenchmark(bench), marcas };
}
