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
import { classificarPulso, dificuldadesFrequentes, tendenciaSemanal, type ResultadoPulso, type SemanaPulso } from "@/lib/pulso/classificar";
import { chaveAlertaPulso, situacaoAlerta, type EstadoAlerta, type SituacaoAlerta } from "@/lib/pulso/alertas";
import { criarIntervencao } from "@/lib/data/acompanhamento";

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

type Linhas = { checkins: CheckIn[]; sessoes: Array<SessaoLeve & { aluno_id?: string }>; ultimaValida: string | null; onboarding: { dificuldades: string[]; em: string | null } | null };

/** Linhas de vários alunos de uma vez (o personal lê todos pela RLS; o aluno, só o próprio). */
async function lerLinhasDe(alunoIds: string[], desde: string): Promise<Record<string, Linhas>> {
  const out: Record<string, Linhas> = {};
  for (const id of alunoIds) out[id] = { checkins: [], sessoes: [], ultimaValida: null, onboarding: null };
  if (!alunoIds.length) return out;
  const valida = (s: SessaoLeve) => s.status !== "em_andamento" && (s.series_concluidas ?? 0) > 0 && s.modo !== "extra";
  if (isDemoMode()) {
    semearPulsoDemo();
    const st = demoStore();
    for (const id of alunoIds) {
      const todas = st.sessions.filter((s) => s.aluno_id === id);
      out[id] = {
        checkins: st.checkIns.filter((c) => c.aluno_id === id && c.data >= desde),
        sessoes: todas.filter((s) => s.iniciado_em >= `${desde}T00:00:00Z`) as SessaoLeve[],
        ultimaValida: (todas as SessaoLeve[]).filter(valida).map((s) => s.iniciado_em).sort().at(-1) ?? null,
        onboarding: null,
      };
    }
    return out;
  }
  const db = await getDb();
  const [{ data: c }, { data: s }, { data: p }] = await Promise.all([
    db.from("check_ins").select("*").in("aluno_id", alunoIds).gte("data", desde).order("data"),
    db.from("training_sessions").select("id, aluno_id, iniciado_em, status, series_concluidas, modo, checkin_pre, feedback_percepcao").in("aluno_id", alunoIds).gte("iniciado_em", `${desde}T00:00:00Z`).order("iniciado_em").limit(5000),
    db.from("perfil_visitante").select("aluno_id, dificuldades, onboarding_concluido_em").in("aluno_id", alunoIds),
  ]);
  for (const x of (c ?? []) as CheckIn[]) out[x.aluno_id]?.checkins.push(x);
  for (const x of (s ?? []) as Array<SessaoLeve & { aluno_id: string }>) {
    const l = out[x.aluno_id];
    if (!l) continue;
    l.sessoes.push(x);
    if (valida(x) && (!l.ultimaValida || x.iniciado_em > l.ultimaValida)) l.ultimaValida = x.iniciado_em;
  }
  for (const x of (p ?? []) as Array<{ aluno_id: string; dificuldades?: string[]; onboarding_concluido_em?: string | null }>) if (out[x.aluno_id]) out[x.aluno_id].onboarding = { dificuldades: x.dificuldades ?? [], em: x.onboarding_concluido_em ?? null };
  // Último treino válido antes da janela (para “dias sem treinar” de quem sumiu há mais tempo).
  const semUltimo = alunoIds.filter((id) => !out[id].ultimaValida);
  if (semUltimo.length) {
    const { data: u } = await db.from("training_sessions").select("aluno_id, iniciado_em").in("aluno_id", semUltimo).neq("status", "em_andamento").gt("series_concluidas", 0).neq("modo", "extra").order("iniciado_em", { ascending: false }).limit(2000);
    for (const x of (u ?? []) as Array<{ aluno_id: string; iniciado_em: string }>) if (out[x.aluno_id] && !out[x.aluno_id].ultimaValida) out[x.aluno_id].ultimaValida = x.iniciado_em;
  }
  return out;
}

/** Junta Pulso + respostas de outras telas (pré-treino, fim do treino, check-in antigo, onboarding). */
function montarRespostas(l: Linhas, hoje: string): { respostas: RespostaPulso[]; pulouHoje: boolean } {
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
  return { respostas, pulouHoje };
}

/** Tudo o que o app já sabe sobre como a pessoa está (Pulso + respostas de outras telas). */
export async function respostasConhecidas(alunoId: string, agora = new Date(), dias = 30): Promise<{ respostas: RespostaPulso[]; pulouHoje: boolean; hojeLinha: CheckIn | null; ultimaValida: string | null; sessoes: SessaoLeve[] }> {
  const hoje = diaSP(agora);
  const desde = diaSP(new Date(agora.getTime() - dias * 86_400_000));
  const l = (await lerLinhasDe([alunoId], desde))[alunoId];
  return { ...montarRespostas(l, hoje), hojeLinha: l.checkins.find((c) => c.data === hoje) ?? null, ultimaValida: l.ultimaValida, sessoes: l.sessoes };
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

// ---------------------------------------------------------------------------
// Painel do personal (aba Montinho Pulso da Central) — o personal lê pela RLS.

export type PulsoDoAluno = {
  alunoId: string;
  nome: string;
  telefone: string | null;
  resultado: ResultadoPulso;
  chave: string | null;
  situacao: SituacaoAlerta;
  estado: EstadoAlerta | null;
  semanas: SemanaPulso[];
  dificuldades: Array<{ valor: string; rotulo: string; vezes: number }>;
  diasSemTreino: number | null;
};

/** Demonstração: respostas fictícias para o painel mostrar as 3 categorias. */
function semearPulsoDemo() {
  const g = globalThis as unknown as { __montinhoPulsoSemeado?: boolean };
  if (g.__montinhoPulsoSemeado) return;
  g.__montinhoPulsoSemeado = true;
  const st = demoStore();
  const dia = (n: number) => diaSP(new Date(Date.now() - n * 86_400_000));
  const linha = (aluno_id: string, n: number, campos: Partial<CheckIn>) => {
    const data = dia(n);
    if (st.checkIns.some((c) => c.aluno_id === aluno_id && c.data === data)) return;
    st.checkIns.push({ id: uid(), aluno_id, data, energia: null, sono: null, dor: null, motivacao: null, estresse: null, notas: null, created_at: meioDia(data), origem: "pulso", respondido_em: meioDia(data), ...campos });
  };
  linha("joao", 1, { pulso_motivacao: "pouca", pulso_dificuldades: ["falta_tempo", "rotina_corrida"] });
  linha("joao", 4, { pulso_motivacao: "pouca", pulso_energia: "baixa" });
  linha("joao", 9, { pulso_energia: "baixa" });
  linha("marina", 1, { pulso_recuperacao: "desconforto", pulso_energia: "normal" });
  linha("rafael", 2, { pulso_energia: "baixa", pulso_recuperacao: "muito_cansado" });
  linha("rafael", 5, { pulso_recuperacao: "muito_cansado" });
  linha("camila", 2, { pulso_energia: "muito_alta", pulso_motivacao: "muita" });
  linha("camila", 6, { pulso_energia: "alta" });
  linha("camila", 17, { pulso_energia: "baixa" });
  linha("camila", 20, { pulso_energia: "normal", pulso_motivacao: "pouca" });
}

function demoAlertas(): Map<string, EstadoAlerta> {
  const g = globalThis as unknown as { __montinhoPulsoAlertas?: Map<string, EstadoAlerta> };
  g.__montinhoPulsoAlertas ??= new Map();
  return g.__montinhoPulsoAlertas;
}

async function estadosAlertasPulso(alunoIds: string[]): Promise<Map<string, EstadoAlerta>> {
  if (isDemoMode()) return demoAlertas();
  const db = await getDb();
  const { data } = await db.from("acompanhamento_alertas").select("aluno_id, chave, estado, adiado_ate, updated_at").eq("origem", "pulso").in("aluno_id", alunoIds);
  const out = new Map<string, EstadoAlerta>();
  for (const x of (data ?? []) as Array<EstadoAlerta & { aluno_id: string; chave: string }>) out.set(`${x.aluno_id}|${x.chave}`, { estado: x.estado, adiado_ate: x.adiado_ate, updated_at: x.updated_at });
  return out;
}

/** Registro de quem abriu dados de bem-estar (LGPD): no máximo 1 por aluno, por recurso, por dia. */
export async function registrarAcessoSaude(leitorId: string, alunoIds: string[], recurso: "pulso_historico" | "pulso_painel"): Promise<void> {
  if (isDemoMode() || !alunoIds.length) return;
  const db = await getDb();
  const desde = `${diaSP(new Date())}T03:00:00Z`;
  const { data } = await db.from("dados_saude_acessos").select("aluno_id").eq("leitor_id", leitorId).eq("recurso", recurso).in("aluno_id", alunoIds).gte("created_at", desde);
  const ja = new Set(((data ?? []) as Array<{ aluno_id: string }>).map((x) => x.aluno_id));
  const novos = alunoIds.filter((id) => !ja.has(id)).map((aluno_id) => ({ aluno_id, recurso, leitor_id: leitorId }));
  if (novos.length) await db.from("dados_saude_acessos").insert(novos);
}

/** Pulso de todos os alunos para a fila do personal. */
export async function pulsoDeTodos(
  alunos: Array<{ id: string; nome: string; telefone: string | null; quedaFrequencia?: boolean; frequenciaMantida?: boolean }>,
  agora = new Date(),
): Promise<PulsoDoAluno[]> {
  const hoje = diaSP(agora);
  const desde = diaSP(new Date(agora.getTime() - 60 * 86_400_000));
  const ids = alunos.map((a) => a.id);
  const [linhas, estados] = await Promise.all([lerLinhasDe(ids, desde), estadosAlertasPulso(ids)]);
  return alunos.map((a) => {
    const l = linhas[a.id];
    const { respostas } = montarRespostas(l, hoje);
    const resultado = classificarPulso(a.nome, respostas, hoje, { quedaFrequencia: a.quedaFrequencia, frequenciaMantida: a.frequenciaMantida });
    const chave = chaveAlertaPulso(resultado);
    const estado = chave ? (estados.get(`${a.id}|${chave}`) ?? null) : null;
    return {
      alunoId: a.id,
      nome: a.nome,
      telefone: a.telefone,
      resultado,
      chave,
      situacao: chave ? situacaoAlerta(estado ?? undefined, hoje) : "resolvido",
      estado,
      semanas: tendenciaSemanal(respostas, hoje, 6),
      dificuldades: dificuldadesFrequentes(respostas, hoje, 60),
      diasSemTreino: l.ultimaValida ? diasEntre(diaSP(l.ultimaValida), hoje) : null,
    };
  });
}

/** Histórico do Pulso de um aluno (ficha do personal). */
export async function historicoPulso(alunoId: string, nome: string, agora = new Date()) {
  const hoje = diaSP(agora);
  const desde = diaSP(new Date(agora.getTime() - 90 * 86_400_000));
  const l = (await lerLinhasDe([alunoId], desde))[alunoId];
  const { respostas } = montarRespostas(l, hoje);
  const doPulso = l.checkins.filter((c) => respostasDaLinha(c).length || c.pulso_pulou).sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, 15);
  return {
    resultado: classificarPulso(nome, respostas, hoje),
    semanas: tendenciaSemanal(respostas, hoje, 8),
    dificuldades: dificuldadesFrequentes(respostas, hoje, 90),
    ultimas: doPulso.map((c) => ({ data: c.data, pulou: !!c.pulso_pulou && !respostasDaLinha(c).length, respostas: respostasDaLinha(c).map((r) => ({ dimensao: r.dimensao, rotulo: opcao(r.dimensao, r.valor)?.rotulo ?? r.valor, emoji: opcao(r.dimensao, r.valor)?.emoji ?? "" })) })),
    consentimento: await consentimentoPulso(alunoId),
  };
}

/** O personal marca o que fez com o alerta (acompanhado, dispensado ou adiado). */
export async function marcarAlertaPulso(autorId: string, alunoId: string, chave: string, estado: EstadoAlerta["estado"], adiadoAte: string | null = null, nota: string | null = null): Promise<void> {
  if (isDemoMode()) {
    demoAlertas().set(`${alunoId}|${chave}`, { estado, adiado_ate: adiadoAte, updated_at: new Date().toISOString() });
    return;
  }
  const db = await getDb();
  const { error } = await db.from("acompanhamento_alertas").upsert({ aluno_id: alunoId, origem: "pulso", chave, estado, adiado_ate: estado === "adiado" ? adiadoAte : null, nota, autor_id: autorId, updated_at: new Date().toISOString() }, { onConflict: "aluno_id,chave" });
  if (error) throw new Error(error.message);
}

/** O personal confirmou que enviou a mensagem: fica na linha do tempo (sem o texto, que pode ter dado pessoal) e o alerta vira “acompanhado”. */
export async function registrarContatoPulso(autorId: string, alunoId: string, chave: string): Promise<void> {
  await criarIntervencao(alunoId, autorId, { tipo: "contato", titulo: "Contato pelo WhatsApp", descricao: "Mensagem enviada pelo WhatsApp a partir do Montinho Pulso.", referencia: { origem: "pulso", chave }, visivel_aluno: false });
  await marcarAlertaPulso(autorId, alunoId, chave, "acompanhado");
}
