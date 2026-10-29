// ============================================================================
// Mobilidade indicada (0119): a prescrição do personal + o que a anamnese
// indica + as sessões feitas → o que o aluno vê no Início e o que o personal
// acompanha. Regras puras em src/lib/mobilidade/indicacao.ts.
// ============================================================================
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { getAnamnese, listAlunos } from "@/lib/db";
import { mockAnamnese } from "@/lib/mock/db-extended";
import { dataLocal } from "@/lib/aderencia/calcular";
import { listarMobilidade, type SessaoMobilidadeRow } from "@/lib/data/mobilidade";
import type { SlugMobilidade } from "@/lib/mobilidade/protocolos";
import { indicacaoDaAnamnese, mobilidadeDoAluno, situacaoMobilidade, type MobilidadeDoAluno, type PrescricaoMobilidade, type SituacaoMobilidade, type TextoAnamnese } from "@/lib/mobilidade/indicacao";

type Linha = PrescricaoMobilidade & { aluno_id: string };
const g = globalThis as unknown as { __demoPrescMob?: Map<string, Linha> };
const demo = () => (g.__demoPrescMob ??= new Map());

export async function prescricaoMobilidade(alunoId: string): Promise<PrescricaoMobilidade | null> {
  if (isDemoMode()) return demo().get(alunoId) ?? null;
  const db = await getDb();
  const { data, error } = await db.from("mobilidade_prescricoes").select("aluno_id, protocolos, dias_semana, motivo, ativo, criado_em").eq("aluno_id", alunoId).is("desativado_em", null).maybeSingle();
  if (error) return null;
  return (data as PrescricaoMobilidade | null) ?? null;
}

/** Personal: troca a prescrição (desativa a vigente e cria outra). `ativo=false` = desligar. */
export async function salvarPrescricaoMobilidade(alunoId: string, p: { protocolos: SlugMobilidade[]; dias_semana: number; motivo: string | null; ativo: boolean }): Promise<void> {
  const linha: Linha = { aluno_id: alunoId, protocolos: p.ativo ? p.protocolos : [], dias_semana: p.dias_semana, motivo: p.motivo, ativo: p.ativo && p.protocolos.length > 0, criado_em: new Date().toISOString() };
  if (isDemoMode()) {
    demo().set(alunoId, linha);
    return;
  }
  const db = await getDb();
  const agora = new Date().toISOString();
  const { error: e1 } = await db.from("mobilidade_prescricoes").update({ desativado_em: agora }).eq("aluno_id", alunoId).is("desativado_em", null);
  if (e1) throw new Error(e1.message.includes("mobilidade_prescricoes") ? "A mobilidade no protocolo está sendo ativada. Tente de novo daqui a pouco." : e1.message);
  const { error } = await db.from("mobilidade_prescricoes").insert({ aluno_id: alunoId, protocolos: linha.protocolos, dias_semana: linha.dias_semana, motivo: linha.motivo, ativo: linha.ativo });
  if (error) throw new Error(error.message);
}

export type MobilidadeIndicada = { m: MobilidadeDoAluno; s: SituacaoMobilidade };

/** Para o aluno (Início, Treinar, Mobilidade): null = nada indicado. */
export async function mobilidadeIndicada(alunoId: string): Promise<MobilidadeIndicada | null> {
  const [p, anamnese] = await Promise.all([prescricaoMobilidade(alunoId).catch(() => null), getAnamnese(alunoId).catch(() => null)]);
  const m = mobilidadeDoAluno(p, anamnese as TextoAnamnese | null);
  if (!m) return null;
  const sessoes = await listarMobilidade(alunoId).catch(() => []);
  return { m, s: situacaoMobilidade(m, sessoes, dataLocal(new Date())) };
}

export type LinhaMobilidadePersonal = {
  alunoId: string;
  nome: string;
  telefone: string | null;
  visitante: boolean;
  /** O que vale agora (prescrito ou pela anamnese); null = desligado pelo personal. */
  m: MobilidadeDoAluno | null;
  s: SituacaoMobilidade | null;
  /** Só a anamnese indica (o personal ainda não confirmou). */
  soAnamnese: boolean;
  desligada: boolean;
  regioesAnamnese: string[];
};

/** Personal: todo mundo com mobilidade indicada (anamnese ou prescrição). */
export async function mobilidadeDeTodos(): Promise<LinhaMobilidadePersonal[]> {
  const alunos = (await listAlunos({ incluirVisitantes: true }).catch(() => [])).filter((a) => a.status === "ativo");
  const ids = alunos.map((a) => a.id);
  let anamneses: Array<TextoAnamnese & { aluno_id: string }> = [];
  let prescricoes: Linha[] = [];
  let sessoes: SessaoMobilidadeRow[] = [];
  if (isDemoMode()) {
    anamneses = mockAnamnese;
    prescricoes = [...demo().values()];
    sessoes = (await Promise.all(ids.map((id) => listarMobilidade(id).catch(() => [])))).flat();
  } else if (ids.length) {
    const db = await getDb();
    const desde = new Date(Date.now() - 21 * 86_400_000).toISOString();
    const [a, p, s] = await Promise.all([
      db.from("anamnese").select("aluno_id, lesoes, dores_atuais, cirurgias, doencas_cronicas").in("aluno_id", ids),
      db.from("mobilidade_prescricoes").select("aluno_id, protocolos, dias_semana, motivo, ativo, criado_em").in("aluno_id", ids).is("desativado_em", null),
      db.from("mobilidade_sessoes").select("*").in("aluno_id", ids).gte("iniciado_em", desde).limit(1000),
    ]);
    anamneses = (a.data ?? []) as typeof anamneses;
    prescricoes = (p.data ?? []) as Linha[];
    sessoes = (s.data ?? []) as SessaoMobilidadeRow[];
  }
  const hoje = dataLocal(new Date());
  const out: LinhaMobilidadePersonal[] = [];
  for (const al of alunos) {
    const anam = anamneses.find((x) => x.aluno_id === al.id) ?? null;
    const presc = prescricoes.find((x) => x.aluno_id === al.id) ?? null;
    const ind = indicacaoDaAnamnese(anam);
    if (!presc && !ind.protocolos.length) continue;
    const m = mobilidadeDoAluno(presc, anam);
    out.push({
      alunoId: al.id,
      nome: al.profile?.nome ?? "Sem nome",
      telefone: al.telefone ?? null,
      visitante: al.modalidade === "visitante",
      m,
      s: m ? situacaoMobilidade(m, sessoes.filter((x) => x.aluno_id === al.id), hoje) : null,
      soAnamnese: !presc,
      desligada: !!presc && !m,
      regioesAnamnese: ind.regioes,
    });
  }
  // Primeiro quem ainda não fez hoje, depois quem só tem a anamnese (confirmar), por nome.
  return out.sort((a, b) => Number(!!a.s?.feitaHoje) - Number(!!b.s?.feitaHoje) || Number(b.soAnamnese) - Number(a.soAnamnese) || a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Ficha do aluno no painel. */
export async function mobilidadeDoAlunoPersonal(alunoId: string) {
  const [p, anamnese, sessoes] = await Promise.all([prescricaoMobilidade(alunoId).catch(() => null), getAnamnese(alunoId).catch(() => null), listarMobilidade(alunoId).catch(() => [])]);
  const anam = anamnese as TextoAnamnese | null;
  const m = mobilidadeDoAluno(p, anam);
  return { prescricao: p, indicacao: indicacaoDaAnamnese(anam), m, s: m ? situacaoMobilidade(m, sessoes, dataLocal(new Date())) : null };
}

/** Estado para o painel do personal (`PrescreverMobilidade`). */
export function estadoParaPainel(x: { prescricao: PrescricaoMobilidade | null; indicacao: { protocolos: SlugMobilidade[]; regioes: string[] }; m: MobilidadeDoAluno | null; s: SituacaoMobilidade | null }) {
  const desligada = !!x.prescricao && !x.m;
  return {
    protocolos: x.m?.protocolos ?? (x.indicacao.protocolos.length ? x.indicacao.protocolos : (["superiores"] as SlugMobilidade[])),
    diasSemana: x.m?.diasSemana ?? 7,
    motivo: x.prescricao?.motivo ?? "",
    ativo: !desligada && !!x.m,
    origem: x.m?.origem ?? (desligada ? ("personal" as const) : null),
    regioesAnamnese: x.indicacao.regioes,
    diasFeitos: x.s?.diasNaSemana ?? null,
    feitaHoje: !!x.s?.feitaHoje,
  };
}
