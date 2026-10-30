// Ofertas dos planos (0130): o que o personal ligou, quem pode fazer aula
// presencial e o contexto do cartão de oferta do aluno. Regras em
// src/lib/ofertas/regras.ts. Tudo pelo login (RLS); sem a 0130, tudo ligado.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore } from "@/lib/mock/store";
import { getAluno, listAlunos } from "@/lib/db";
import { dataLocal, somarDias } from "@/lib/aderencia/calcular";
import { cargaParada, motivoDaOferta, ofertasPara, type Motivo, type Oferta, type Publico } from "@/lib/ofertas/regras";
import { listSessoes } from "@/lib/data/sessoes";
import { execucoesDeSessoes } from "@/lib/evolucao/adaptar";
import { respostasConhecidas } from "@/lib/data/pulso";
import type { OfertaConfig, OfertaConfigId } from "@/lib/supabase/types-extended";

const IDS: OfertaConfigId[] = ["pacote_alunos", "consultoria_visitantes", "pacote_visitantes"];
const padrao = (): OfertaConfig[] => IDS.map((id) => ({ id, ativo: true, promo: null, updated_at: new Date(0).toISOString() }));
const g = globalThis as unknown as { __demoOfertas?: OfertaConfig[] };

export async function listarOfertasConfig(): Promise<OfertaConfig[]> {
  if (isDemoMode()) return (g.__demoOfertas ??= padrao());
  const db = await getDb();
  const { data, error } = await db.from("ofertas_config").select("id, ativo, promo, updated_at");
  if (error || !data?.length) return padrao();
  return IDS.map((id) => (data as OfertaConfig[]).find((c) => c.id === id) ?? padrao().find((c) => c.id === id)!);
}

export async function salvarOfertaConfig(id: OfertaConfigId, v: { ativo: boolean; promo: string | null }): Promise<void> {
  const promo = v.promo?.trim() || null;
  if (isDemoMode()) {
    const lista = await listarOfertasConfig();
    Object.assign(lista.find((c) => c.id === id)!, { ativo: v.ativo, promo, updated_at: new Date().toISOString() });
    return;
  }
  const db = await getDb();
  const { error } = await db.from("ofertas_config").update({ ativo: v.ativo, promo, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(/does not exist|schema cache/i.test(error.message) ? "As ofertas estão sendo ativadas no banco (0130)." : error.message);
}

export type PessoaPresencial = { id: string; nome: string; visitante: boolean; cidade: string | null; podePresencial: boolean };

export async function pessoasPresencial(): Promise<PessoaPresencial[]> {
  const alunos = await listAlunos({ incluirVisitantes: true }).catch(() => []);
  return alunos
    .filter((a) => a.status === "ativo")
    .map((a) => ({ id: a.id, nome: a.profile?.nome ?? "Sem nome", visitante: a.modalidade === "visitante", cidade: a.cidade ?? null, podePresencial: a.pode_presencial !== false }))
    .sort((a, b) => Number(a.podePresencial) - Number(b.podePresencial) || a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function definirPresencial(alunoId: string, pode: boolean): Promise<void> {
  if (isDemoMode()) {
    const a = demoStore().alunos.find((x) => x.id === alunoId);
    if (a) a.pode_presencial = pode;
    return;
  }
  const db = await getDb();
  const { error } = await db.from("alunos").update({ pode_presencial: pode }).eq("id", alunoId);
  if (error) throw new Error(/pode_presencial/.test(error.message) ? "As ofertas estão sendo ativadas no banco (0130)." : error.message);
}

export type ContextoOferta = { publico: Publico; nome: string; treinos: number; dor: boolean; ofertas: Oferta[]; motivo: Motivo | null };

const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

/** Exercício com a carga parada nas últimas sessões (Fase 2 das ofertas). */
async function exercicioTravado(alunoId: string): Promise<string | null> {
  const execs = execucoesDeSessoes(await listSessoes(alunoId, { limite: 25 }));
  const porEx = new Map<string, { nome: string; execucoes: Array<{ dia: string; maior: number }> }>();
  for (const e of [...execs].sort((a, b) => (a.data < b.data ? 1 : -1))) {
    if (e.dor) continue;
    const chave = e.bibliotecaId ?? e.nome;
    const maior = Math.max(0, ...e.series.filter((x) => x.tipo !== "aquecimento").map((x) => x.carga ?? 0));
    const item = porEx.get(chave) ?? { nome: e.nome, execucoes: [] };
    item.execucoes.push({ dia: dataLocal(e.data), maior });
    porEx.set(chave, item);
  }
  return cargaParada([...porEx.values()]);
}

/** O cartão de oferta do aluno logado: o que vale para ele, o nome, quantos treinos, se há dor recente e o motivo do momento. */
export async function contextoOferta(alunoId: string): Promise<ContextoOferta | null> {
  const aluno = await getAluno(alunoId);
  if (!aluno) return null;
  const publico: Publico = aluno.modalidade === "visitante" ? "visitante" : "aluno";
  const config = await listarOfertasConfig();
  const ofertas = ofertasPara({ publico, podePresencial: aluno.pode_presencial !== false, config });
  const nome = aluno.profile?.nome ?? "";
  const hoje = dataLocal(new Date());
  const inicio = aluno.data_inicio ?? dataLocal(aluno.created_at);
  const baseMotivo = { publico, nome, diasDeAcesso: publico === "visitante" ? diasEntre(inicio, hoje) : null, diasAteRenovar: publico === "aluno" && aluno.acesso_ate ? diasEntre(hoje, aluno.acesso_ate) : null, disponiveis: ofertas.map((o) => o.id) };
  if (!ofertas.length) return { publico, nome, treinos: 0, dor: false, ofertas, motivo: null };
  if (isDemoMode()) return { publico, nome, treinos: 12, dor: false, ofertas, motivo: motivoDaOferta({ ...baseMotivo, cargaParada: publico === "aluno" ? "Supino reto com barra" : null, poucoTempo: false }) };
  const db = await getDb();
  const desde = somarDias(hoje, -2);
  const [{ count }, { data: recentes }, travado, pulso] = await Promise.all([
    db.from("training_sessions").select("id", { count: "exact", head: true }).eq("aluno_id", alunoId).eq("status", "concluida"),
    db.from("training_sessions").select("feedback_percepcao, checkin_pre").eq("aluno_id", alunoId).gte("iniciado_em", `${desde}T03:00:00Z`),
    exercicioTravado(alunoId).catch(() => null),
    respostasConhecidas(alunoId, new Date(), 14).catch(() => null),
  ]);
  const dor = ((recentes ?? []) as Array<{ feedback_percepcao: string | null; checkin_pre: string | null }>).some((s) => s.feedback_percepcao === "dor" || s.checkin_pre === "desconforto");
  const poucoTempo = !!pulso?.respostas.some((r) => r.dimensao === "dificuldade" && (r.valor === "falta_tempo" || r.valor === "rotina_corrida"));
  return { publico, nome, treinos: count ?? 0, dor, ofertas, motivo: motivoDaOferta({ ...baseMotivo, cargaParada: travado, poucoTempo }) };
}
