// ============================================================================
// Mobilidade e alongamento — dados (0116). O início e o fim são gravados pelo
// SERVIDOR: criar a sessão = “Começar”; concluir/cancelar só pelas funções do
// banco. Contas puras em src/lib/mobilidade/regras.ts.
// ============================================================================
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { listAlunos } from "@/lib/db";
import type { PessoaEnviar } from "@/components/mobilidade/EnviarMobilidade";
import type { SlugMobilidade } from "@/lib/mobilidade/protocolos";
import { LIMITES_MOBILIDADE, type SessaoMobilidade } from "@/lib/mobilidade/regras";

export type SessaoMobilidadeRow = SessaoMobilidade & { aluno_id: string; exercicios_feitos: number | null; created_at: string };

const g = globalThis as unknown as { __demoMobilidade?: SessaoMobilidadeRow[] };
const demo = () => (g.__demoMobilidade ??= []);

export async function listarMobilidade(alunoId: string): Promise<SessaoMobilidadeRow[]> {
  if (isDemoMode()) return demo().filter((s) => s.aluno_id === alunoId).sort((a, b) => (a.iniciado_em < b.iniciado_em ? 1 : -1));
  const db = await getDb();
  const { data, error } = await db.from("mobilidade_sessoes").select("*").eq("aluno_id", alunoId).order("iniciado_em", { ascending: false }).limit(500);
  if (error) return [];
  return (data ?? []) as SessaoMobilidadeRow[];
}

export async function buscarMobilidade(alunoId: string, id: string): Promise<SessaoMobilidadeRow | null> {
  if (isDemoMode()) return demo().find((s) => s.id === id && s.aluno_id === alunoId) ?? null;
  const db = await getDb();
  const { data } = await db.from("mobilidade_sessoes").select("*").eq("id", id).eq("aluno_id", alunoId).maybeSingle();
  return (data as SessaoMobilidadeRow | null) ?? null;
}

/** “Começar”: a hora é a do servidor (gatilho do banco). */
export async function iniciarMobilidade(alunoId: string, protocolo: SlugMobilidade, notaAntes: number | null): Promise<SessaoMobilidadeRow> {
  if (isDemoMode()) {
    const agora = new Date().toISOString();
    const s: SessaoMobilidadeRow = { id: `mob-${Date.now()}`, aluno_id: alunoId, protocolo, status: "em_andamento", iniciado_em: agora, concluido_em: null, nota_antes: notaAntes, nota_depois: null, exercicios_feitos: null, created_at: agora };
    demo().push(s);
    return s;
  }
  const db = await getDb();
  const { data, error } = await db.from("mobilidade_sessoes").insert({ aluno_id: alunoId, protocolo, nota_antes: notaAntes }).select("*").single();
  if (error) throw new Error(faltaBanco(error.message) ? AINDA_ATIVANDO : `Não foi possível começar: ${error.message}`);
  return data as SessaoMobilidadeRow;
}

/** A 0116 ainda não rodou no banco: aviso claro em vez da mensagem técnica. */
const AINDA_ATIVANDO = "A mobilidade está sendo ativada no app. Tente de novo daqui a pouco.";
const faltaBanco = (m: string) => /schema cache|does not exist|could not find the (table|function)/i.test(m);

/** Pessoas para o personal enviar a mobilidade no WhatsApp (ativas; sem a ficha dele). */
export async function pessoasParaEnviar(semAlunoId?: string): Promise<PessoaEnviar[]> {
  const alunos = await listAlunos({ incluirVisitantes: true }).catch(() => []);
  return alunos
    .filter((a) => a.status === "ativo" && a.id !== semAlunoId)
    .map((a) => ({ id: a.id, nome: a.profile?.nome ?? "Sem nome", telefone: a.telefone ?? null, visitante: a.modalidade === "visitante" }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export class CedoDemais extends Error {
  constructor(public minutos: number) {
    super(`Ainda faltam ${minutos} min para poder concluir.`);
  }
}

export async function concluirMobilidade(alunoId: string, id: string, notaDepois: number | null, feitos: number | null): Promise<SessaoMobilidadeRow> {
  if (isDemoMode()) {
    const s = demo().find((x) => x.id === id && x.aluno_id === alunoId);
    if (!s) throw new Error("Sessão não encontrada.");
    if (s.status !== "em_andamento") return s;
    // Na demo, ninguém espera 10 minutos: o início “volta no tempo” para dar para testar.
    s.iniciado_em = new Date(Date.now() - (LIMITES_MOBILIDADE.minutosMin + 12) * 60_000).toISOString();
    Object.assign(s, { status: "concluida", concluido_em: new Date().toISOString(), nota_depois: notaDepois, exercicios_feitos: feitos });
    return s;
  }
  const db = await getDb();
  const { data, error } = await db.rpc("concluir_mobilidade", { p_id: id, p_nota_depois: notaDepois, p_feitos: feitos });
  if (error) {
    const m = /cedo demais \((\d+) min\)/.exec(error.message);
    if (m) throw new CedoDemais(Number(m[1]));
    if (faltaBanco(error.message)) throw new Error(AINDA_ATIVANDO);
    throw new Error(error.message.includes("expirada") ? "Esta sessão começou há muito tempo. Comece de novo." : `Não foi possível concluir: ${error.message}`);
  }
  return data as SessaoMobilidadeRow;
}

export async function cancelarMobilidade(alunoId: string, id: string): Promise<void> {
  if (isDemoMode()) {
    const s = demo().find((x) => x.id === id && x.aluno_id === alunoId && x.status === "em_andamento");
    if (s) s.status = "cancelada";
    return;
  }
  const db = await getDb();
  await db.rpc("cancelar_mobilidade", { p_id: id });
}

/** A sessão desse protocolo que ficou aberta (até 6 h), para continuar em vez de começar outra. */
export async function mobilidadeAberta(alunoId: string, protocolo: SlugMobilidade): Promise<SessaoMobilidadeRow | null> {
  const limite = Date.now() - 6 * 3_600_000;
  return (await listarMobilidade(alunoId).catch(() => [])).find((s) => s.protocolo === protocolo && s.status === "em_andamento" && Date.parse(s.iniciado_em) > limite) ?? null;
}
