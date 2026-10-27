// Montinho Pulso — leitura e gravação (RLS: o aluno lê/grava só o próprio;
// o personal lê). Regras puras em src/lib/pulso/*. As respostas ficam em
// check_ins (1 linha por aluno por dia de Brasília, 0096).
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore, uid } from "@/lib/mock/store";
import type { CheckIn } from "@/lib/supabase/types-extended";
import { DIMENSOES, PERGUNTAS, diaSP, diasEntre, opcao, type Dimensao } from "@/lib/pulso/perguntas";
import { checkinPreDoPulso, doDiarioAntigo, doFimTreino, doOnboarding, doPreTreino, type CheckinPre, type RespostaPulso } from "@/lib/pulso/equivalencias";
import { escolherPerguntas, type EscolhaPulso, type MomentoPulso } from "@/lib/pulso/escolher";

export type Consentimento = "sim" | "nao" | "nunca";
export type RespostasHoje = Partial<Record<Dimensao, string | string[]>>;

export type ContextoPulsoAluno = {
  /** Perguntas se o aluno tiver consentido (ou consentir agora). */
  escolhaCom: EscolhaPulso;
  /** Perguntas sem dado de saúde (sem consentimento). */
  escolhaSem: EscolhaPulso;
  consentimento: Consentimento;
  /** O que já foi respondido hoje no Pulso (para mostrar e para o checkin_pre). */
  hoje: RespostasHoje;
  pulouHoje: boolean;
  checkinPreHoje: CheckinPre | null;
  diasSemTreino: number | null;
};

const COLUNA: Record<Exclude<Dimensao, "dificuldade">, "pulso_energia" | "pulso_recuperacao" | "pulso_motivacao" | "pulso_sono"> = {
  energia: "pulso_energia",
  recuperacao: "pulso_recuperacao",
  motivacao: "pulso_motivacao",
  sono: "pulso_sono",
};

type SessaoLeve = { id: string; iniciado_em: string; status: string; series_concluidas: number | null; modo?: string | null; checkin_pre?: string | null; feedback_percepcao?: string | null };

function demoConsent(): Map<string, Consentimento> {
  const g = globalThis as unknown as { __montinhoPulsoConsent?: Map<string, Consentimento> };
  g.__montinhoPulsoConsent ??= new Map();
  return g.__montinhoPulsoConsent;
}

const meioDia = (data: string) => `${data}T15:00:00.000Z`;

/** Respostas do Pulso guardadas numa linha de check_ins. */
export function respostasDaLinha(c: CheckIn): RespostaPulso[] {
  const em = c.respondido_em ?? meioDia(c.data);
  const out: RespostaPulso[] = [];
  for (const d of ["energia", "recuperacao", "motivacao", "sono"] as const) {
    const v = c[COLUNA[d]];
    if (v && opcao(d, v)) out.push({ dimensao: d, valor: v, em, origem: "pulso" });
  }
  for (const v of c.pulso_dificuldades ?? []) if (opcao("dificuldade", v)) out.push({ dimensao: "dificuldade", valor: v, em, origem: "pulso" });
  return out;
}

async function lerLinhas(alunoId: string, desde: string): Promise<{ checkins: CheckIn[]; sessoes: SessaoLeve[]; ultimaValida: string | null; onboarding: { dificuldades: string[]; em: string | null } | null }> {
  if (isDemoMode()) {
    const st = demoStore();
    const sessoesTodas = st.sessions.filter((s) => s.aluno_id === alunoId);
    const validas = sessoesTodas.filter((s) => s.status !== "em_andamento" && (s.series_concluidas ?? 0) > 0 && s.modo !== "extra").map((s) => s.iniciado_em).sort();
    return {
      checkins: st.checkIns.filter((c) => c.aluno_id === alunoId && c.data >= desde),
      sessoes: sessoesTodas.filter((s) => s.iniciado_em >= `${desde}T00:00:00Z`) as SessaoLeve[],
      ultimaValida: validas.at(-1) ?? null,
      onboarding: null,
    };
  }
  const db = await getDb();
  const [{ data: c }, { data: s }, { data: u }, { data: p }] = await Promise.all([
    db.from("check_ins").select("*").eq("aluno_id", alunoId).gte("data", desde).order("data"),
    db.from("training_sessions").select("id, iniciado_em, status, series_concluidas, modo, checkin_pre, feedback_percepcao").eq("aluno_id", alunoId).gte("iniciado_em", `${desde}T00:00:00Z`).order("iniciado_em").limit(200),
    db.from("training_sessions").select("iniciado_em").eq("aluno_id", alunoId).neq("status", "em_andamento").gt("series_concluidas", 0).neq("modo", "extra").order("iniciado_em", { ascending: false }).limit(1),
    db.from("perfil_visitante").select("dificuldades, onboarding_concluido_em").eq("aluno_id", alunoId).maybeSingle(),
  ]);
  const perfil = p as { dificuldades?: string[]; onboarding_concluido_em?: string | null } | null;
  return {
    checkins: (c ?? []) as CheckIn[],
    sessoes: (s ?? []) as SessaoLeve[],
    ultimaValida: (u as Array<{ iniciado_em: string }> | null)?.[0]?.iniciado_em ?? null,
    onboarding: perfil ? { dificuldades: perfil.dificuldades ?? [], em: perfil.onboarding_concluido_em ?? null } : null,
  };
}

/** Tudo o que o app já sabe sobre como a pessoa está (Pulso + respostas de outras telas). */
export async function respostasConhecidas(alunoId: string, agora = new Date(), dias = 30): Promise<{ respostas: RespostaPulso[]; pulouHoje: boolean; hojeLinha: CheckIn | null; ultimaValida: string | null; sessoes: SessaoLeve[] }> {
  const hoje = diaSP(agora);
  const desde = diaSP(new Date(agora.getTime() - dias * 86_400_000));
  const l = await lerLinhas(alunoId, desde);
  const respostas: RespostaPulso[] = [];
  const diasComPulso = new Set<string>();
  let pulouHoje = false;
  for (const c of l.checkins) {
    const doPulso = respostasDaLinha(c);
    if (doPulso.length || c.pulso_pulou) diasComPulso.add(c.data);
    respostas.push(...doPulso);
    if (c.energia != null || c.motivacao != null || c.sono != null || c.dor != null) respostas.push(...doDiarioAntigo({ ...c, created_at: meioDia(c.data) }).respostas);
    if (c.data === hoje && c.pulso_pulou && !doPulso.length) pulouHoje = true;
  }
  for (const s of l.sessoes) {
    const dia = diaSP(s.iniciado_em);
    // No dia em que o Pulso foi respondido, a resposta do Pulso vale (o checkin_pre é só o equivalente).
    if (!diasComPulso.has(dia)) {
      const pre = doPreTreino(s.checkin_pre, s.iniciado_em);
      respostas.push(...pre.respostas);
      if (dia === hoje && pre.pulou) pulouHoje = true;
    }
    respostas.push(...doFimTreino(s.feedback_percepcao, s.iniciado_em).respostas);
  }
  if (l.onboarding) respostas.push(...doOnboarding(l.onboarding.dificuldades, l.onboarding.em).respostas);
  return { respostas, pulouHoje, hojeLinha: l.checkins.find((c) => c.data === hoje) ?? null, ultimaValida: l.ultimaValida, sessoes: l.sessoes };
}

export async function consentimentoPulso(alunoId: string): Promise<Consentimento> {
  if (isDemoMode()) return demoConsent().get(alunoId) ?? "nunca";
  const db = await getDb();
  const { data } = await db.from("pulso_preferencias").select("consentimento_saude_em, consentimento_revogado_em").eq("aluno_id", alunoId).maybeSingle();
  const p = data as { consentimento_saude_em: string | null; consentimento_revogado_em: string | null } | null;
  if (!p) return "nunca";
  if (p.consentimento_saude_em && (!p.consentimento_revogado_em || p.consentimento_saude_em > p.consentimento_revogado_em)) return "sim";
  return p.consentimento_revogado_em ? "nao" : "nunca";
}

export async function definirConsentimentoPulso(alunoId: string, sim: boolean): Promise<Consentimento> {
  if (isDemoMode()) {
    demoConsent().set(alunoId, sim ? "sim" : "nao");
    return sim ? "sim" : "nao";
  }
  const db = await getDb();
  const agora = new Date().toISOString();
  const { error } = await db.from("pulso_preferencias").upsert({ aluno_id: alunoId, ...(sim ? { consentimento_saude_em: agora } : { consentimento_revogado_em: agora }), updated_at: agora }, { onConflict: "aluno_id" });
  if (error) throw new Error(error.message);
  return sim ? "sim" : "nao";
}

function hojeDaLinha(c: CheckIn | null): RespostasHoje {
  if (!c) return {};
  const out: RespostasHoje = {};
  for (const r of respostasDaLinha(c)) {
    if (r.dimensao === "dificuldade") out.dificuldade = [...((out.dificuldade as string[] | undefined) ?? []), r.valor];
    else out[r.dimensao] = r.valor;
  }
  return out;
}

/** Contexto do Pulso para a tela do aluno (perguntas escolhidas + o que já respondeu hoje). */
export async function contextoPulsoAluno(alunoId: string, momento: MomentoPulso, agora = new Date()): Promise<ContextoPulsoAluno> {
  const hoje = diaSP(agora);
  const [k, consentimento] = await Promise.all([respostasConhecidas(alunoId, agora, 30), consentimentoPulso(alunoId)]);
  const diasSemTreino = k.ultimaValida ? diasEntre(diaSP(k.ultimaValida), hoje) : null;
  const concluidas14 = k.sessoes.filter((s) => s.status !== "em_andamento" && (s.series_concluidas ?? 0) > 0 && s.modo !== "extra" && diasEntre(diaSP(s.iniciado_em), hoje) < 14).length;
  const base = { hoje, respostas: k.respostas, pulouHoje: k.pulouHoje, diasSemTreino, constanciaBoa: concluidas14 >= 4, momento };
  const respHoje = hojeDaLinha(k.hojeLinha);
  return {
    escolhaCom: escolherPerguntas({ ...base, consentimentoSaude: true }),
    escolhaSem: escolherPerguntas({ ...base, consentimentoSaude: false }),
    consentimento,
    hoje: respHoje,
    pulouHoje: k.pulouHoje,
    checkinPreHoje: checkinPreDoPulso(respHoje, k.pulouHoje),
    diasSemTreino,
  };
}

export type EntradaPulso = { respostas: RespostasHoje; pulou?: boolean; sessaoId?: string | null };

/** Grava o Pulso de hoje (mescla com o que já foi respondido hoje). Corpo e sono só com consentimento. */
export async function salvarPulso(alunoId: string, entrada: EntradaPulso, agora = new Date()): Promise<{ checkinPre: CheckinPre | null; hoje: RespostasHoje }> {
  const consentimento = await consentimentoPulso(alunoId);
  const limpo: RespostasHoje = {};
  for (const d of DIMENSOES) {
    const v = entrada.respostas[d];
    if (v === undefined) continue;
    if (PERGUNTAS[d].saude && consentimento !== "sim") continue;
    if (d === "dificuldade") {
      const lista = [...new Set((Array.isArray(v) ? v : [v]).filter((x) => opcao("dificuldade", x)))];
      // “Nada no momento” não convive com outras dificuldades.
      if (lista.length) limpo.dificuldade = lista.includes("nada") ? ["nada"] : lista;
    } else if (typeof v === "string" && opcao(d, v)) limpo[d] = v;
  }
  const data = diaSP(agora);
  const campos: Partial<CheckIn> = { respondido_em: agora.toISOString() };
  for (const d of ["energia", "recuperacao", "motivacao", "sono"] as const) if (limpo[d] !== undefined) campos[COLUNA[d]] = limpo[d] as string;
  if (limpo.dificuldade) campos.pulso_dificuldades = limpo.dificuldade as string[];
  const respondeu = Object.keys(limpo).length > 0;
  campos.pulso_pulou = !respondeu && !!entrada.pulou;
  if (entrada.sessaoId) campos.sessao_id = entrada.sessaoId;

  let linha: CheckIn;
  if (isDemoMode()) {
    const st = demoStore();
    let c = st.checkIns.find((x) => x.aluno_id === alunoId && x.data === data);
    if (!c) {
      c = { id: uid(), aluno_id: alunoId, data, energia: null, sono: null, dor: null, motivacao: null, estresse: null, notas: null, created_at: agora.toISOString(), origem: "pulso" };
      st.checkIns.push(c);
    }
    Object.assign(c, campos);
    linha = c;
  } else {
    const db = await getDb();
    const { data: atual } = await db.from("check_ins").select("id").eq("aluno_id", alunoId).eq("data", data).maybeSingle();
    const q = atual
      ? db.from("check_ins").update(campos).eq("id", (atual as { id: string }).id)
      : db.from("check_ins").insert({ aluno_id: alunoId, data, origem: "pulso", ...campos });
    const { data: salvo, error } = await q.select("*").single();
    if (error) throw new Error(error.message);
    linha = salvo as CheckIn;
  }
  const hoje = hojeDaLinha(linha);
  return { checkinPre: checkinPreDoPulso(hoje, !!linha.pulso_pulou), hoje };
}
