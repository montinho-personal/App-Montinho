// ============================================================================
// Conquistas da Tribo — dados (0115). Números e concessão vêm do banco:
// tribo_dados() (para aluno, nada identifica os outros) e tribo_sincronizar()
// (concede para o aluno logado; idempotente). Contas puras em src/lib/tribo.
// Na demo, o mesmo algoritmo em memória (concessoes) + um histórico fictício
// da tribo para dar para ver os marcos.
// ============================================================================
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore } from "@/lib/mock/store";
import { cardiosFeitos } from "@/lib/data/cardio";
import { diasDeCardio, type CardioFeito } from "@/lib/cardio/regras";
import { contaCarimbo } from "@/lib/conquistas/carimbos";
import { dataLocal, somarDias } from "@/lib/aderencia/calcular";
import { concessoes, MARCOS_PADRAO, type ConquistaTribo, type Contribuicao, type DadosTribo, type MissaoTribo } from "@/lib/tribo/regras";

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------
type DemoTribo = { conquistas: Array<ConquistaTribo & { aluno_id: string }>; missoes: MissaoTribo[] };
const g = globalThis as unknown as { __demoTribo?: DemoTribo };
function demoTribo(): DemoTribo {
  if (!g.__demoTribo) {
    const hoje = dataLocal(new Date());
    const mes = hoje.slice(0, 7);
    const fimMes = somarDias(`${somarDias(`${mes}-28`, 4).slice(0, 7)}-01`, -1);
    const prox = somarDias(fimMes, 1);
    const fimProx = somarDias(`${somarDias(`${prox.slice(0, 7)}-28`, 4).slice(0, 7)}-01`, -1);
    g.__demoTribo = {
      conquistas: [],
      missoes: [
        { id: "demo-missao-mes", nome: "Mês em Movimento", descricao: "Juntos, 3.000 minutos de cardio neste mês.", meta_minutos: 3000, meta_treinos: null, inicio: `${mes}-01`, fim: fimMes, recorrente: true, ativa: true, participantes: 0 },
        { id: "demo-missao-combo", nome: "Combo da Tribo", descricao: "Cardio e musculação juntos: 4.000 minutos e 120 treinos no mês.", meta_minutos: 4000, meta_treinos: 120, inicio: `${mes}-01`, fim: fimMes, recorrente: false, ativa: true, participantes: 0 },
        { id: "demo-missao-prox", nome: "Mês em Movimento", descricao: "Juntos, 3.000 minutos de cardio neste mês.", meta_minutos: 3000, meta_treinos: null, inicio: prox, fim: fimProx, recorrente: true, ativa: true, participantes: 0 },
      ],
    };
  }
  return g.__demoTribo;
}

/** Histórico fictício de outras pessoas da tribo (só na demo): ~15.000 min e ~240 treinos em 5 meses. */
function historicoFicticio(): Contribuicao[] {
  const out: Contribuicao[] = [];
  const hoje = dataLocal(new Date());
  for (let d = 150; d >= 1; d--) {
    const dia = somarDias(hoje, -d);
    const base = Date.parse(`${dia}T06:30:00-03:00`);
    const n = 2 + (d % 3);
    for (let k = 0; k < n; k++) out.push({ t: "c", em: new Date(base + k * 3_600_000).toISOString(), min: 20 + ((d * 7 + k * 11) % 25), mod: ["esteira", "bike", "caminhada", "escada", "corrida"][(d + k) % 5], eu: false, a: null });
    if (d % 5 !== 0) out.push({ t: "t", em: new Date(base + 10 * 3_600_000).toISOString(), min: 0, mod: null, eu: false, a: null });
    if (d % 2 === 0) out.push({ t: "t", em: new Date(base + 12 * 3_600_000).toISOString(), min: 0, mod: null, eu: false, a: null });
  }
  return out;
}

async function contribuicoesDemo(eu: string | null, treinador: boolean): Promise<{ lista: Contribuicao[]; participantes: DadosTribo["participantes"] }> {
  const st = demoStore();
  const lista: Contribuicao[] = historicoFicticio();
  const quemCardio = new Set<string>(), quemTreino = new Set<string>();
  for (const a of st.alunos) {
    const feitos: CardioFeito[] = await cardiosFeitos(a.id).catch(() => [] as CardioFeito[]);
    const porId = new Map(feitos.map((f) => [f.id, f]));
    for (const dia of diasDeCardio(feitos)) {
      if (!dia.valido || !dia.validoEm) continue;
      for (const id of dia.ids) {
        const f = porId.get(id);
        if (!f || f.status === "nao_realizado" || f.duracaoMin <= 0) continue;
        const em = Date.parse(f.realizadoEm) > Date.parse(dia.validoEm) ? f.realizadoEm : dia.validoEm;
        lista.push({ t: "c", em, min: f.duracaoMin, mod: f.modalidade, eu: a.id === eu, a: treinador || a.id === eu ? a.id : null });
        quemCardio.add(a.id);
      }
    }
    for (const s of st.sessions.filter((x) => x.aluno_id === a.id && x.status !== "em_andamento")) {
      if (!contaCarimbo(s)) continue;
      lista.push({ t: "t", em: s.finalizado_em ?? s.iniciado_em, min: 0, mod: null, eu: a.id === eu, a: treinador || a.id === eu ? a.id : null });
      quemTreino.add(a.id);
    }
  }
  lista.sort((x, y) => Date.parse(x.em) - Date.parse(y.em));
  // O histórico fictício conta como 18 pessoas a mais.
  const extra = 18;
  return { lista, participantes: { cardio: quemCardio.size + extra, treinos: quemTreino.size + extra, total: new Set([...quemCardio, ...quemTreino]).size + extra } };
}

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------
type Quem = { alunoId?: string | null; treinador?: boolean };

export async function dadosTribo(quem: Quem): Promise<DadosTribo | null> {
  if (isDemoMode()) {
    const eu = quem.alunoId ?? null;
    const { lista, participantes } = await contribuicoesDemo(eu, !!quem.treinador);
    const missoes = demoTribo().missoes.map((m) => ({ ...m, participantes: Math.max(1, Math.round(participantes.total * 0.7)) }));
    return { eu, treinador: !!quem.treinador, contribuicoes: lista, participantes, marcos: MARCOS_PADRAO, missoes };
  }
  const db = await getDb();
  const { data, error } = await db.rpc("tribo_dados");
  if (error || !data) return null;
  const d = data as DadosTribo;
  return { ...d, contribuicoes: d.contribuicoes ?? [], marcos: d.marcos?.length ? d.marcos : MARCOS_PADRAO, missoes: d.missoes ?? [] };
}

/** Troféus da tribo do aluno (mais recentes primeiro). */
export async function conquistasTribo(alunoId: string): Promise<ConquistaTribo[]> {
  if (isDemoMode()) return demoTribo().conquistas.filter((c) => c.aluno_id === alunoId).sort((a, b) => (a.conquistado_em < b.conquistado_em ? 1 : -1));
  const db = await getDb();
  const { data, error } = await db.from("tribo_conquistas").select("id, codigo, referencia, metodo, conquistado_em, dados, vista_em").eq("aluno_id", alunoId).order("conquistado_em", { ascending: false }).limit(500);
  if (error) return [];
  return (data ?? []) as ConquistaTribo[];
}

// ---------------------------------------------------------------------------
// Concessão (o banco decide; aqui só pede)
// ---------------------------------------------------------------------------
export async function sincronizarTribo(alunoId: string): Promise<ConquistaTribo[]> {
  if (isDemoMode()) {
    const dados = await dadosTribo({ alunoId });
    if (!dados) return [];
    const st = demoTribo();
    const novos: ConquistaTribo[] = [];
    for (const c of concessoes(dados, dataLocal(new Date()))) {
      if (st.conquistas.some((x) => x.aluno_id === alunoId && x.codigo === c.codigo && x.referencia === c.referencia)) continue;
      const nova = { id: `tribo-${alunoId}-${c.codigo}-${c.referencia}`, aluno_id: alunoId, codigo: c.codigo, referencia: c.referencia, metodo: c.metodo, conquistado_em: c.em, dados: c.dados, vista_em: null };
      st.conquistas.push(nova);
      novos.push(nova);
    }
    return novos;
  }
  const db = await getDb();
  const { data, error } = await db.rpc("tribo_sincronizar");
  if (error) return [];
  return (data ?? []) as ConquistaTribo[];
}

export async function marcarVistasTribo(alunoId: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const agora = new Date().toISOString();
  if (isDemoMode()) {
    for (const c of demoTribo().conquistas) if (c.aluno_id === alunoId && ids.includes(c.id)) c.vista_em = agora;
    return;
  }
  const db = await getDb();
  await db.from("tribo_conquistas").update({ vista_em: agora }).eq("aluno_id", alunoId).in("id", ids).is("vista_em", null);
}

// ---------------------------------------------------------------------------
// Missões (só o personal escreve; RLS)
// ---------------------------------------------------------------------------
export type EntradaMissao = { nome: string; descricao: string | null; meta_minutos: number | null; meta_treinos: number | null; inicio: string; fim: string; recorrente: boolean };

export async function criarMissao(e: EntradaMissao): Promise<MissaoTribo> {
  if (isDemoMode()) {
    const m: MissaoTribo = { id: `demo-missao-${Date.now()}`, ...e, ativa: true, participantes: 0 };
    demoTribo().missoes.unshift(m);
    return m;
  }
  const db = await getDb();
  const { data, error } = await db.from("tribo_missoes").insert(e).select("*").single();
  if (error) throw new Error(`Não foi possível criar a missão: ${error.message}`);
  return { ...(data as MissaoTribo), participantes: 0 };
}

export async function ativarMissao(id: string, ativa: boolean): Promise<void> {
  if (isDemoMode()) {
    const m = demoTribo().missoes.find((x) => x.id === id);
    if (m) m.ativa = ativa;
    return;
  }
  const db = await getDb();
  const { data, error } = await db.from("tribo_missoes").update({ ativa }).eq("id", id).select("id");
  if (error) throw new Error(`Não foi possível alterar a missão: ${error.message}`);
  if (!data?.length) throw new Error("Missão não encontrada.");
}

/** Personal: troféus da tribo de todos (para o painel). */
export async function conquistasTriboDeTodos(): Promise<Array<ConquistaTribo & { aluno_id: string }>> {
  if (isDemoMode()) return demoTribo().conquistas;
  const db = await getDb();
  const { data } = await db.from("tribo_conquistas").select("id, aluno_id, codigo, referencia, metodo, conquistado_em, dados").order("conquistado_em", { ascending: false }).limit(2000);
  return (data ?? []) as Array<ConquistaTribo & { aluno_id: string }>;
}

/** Tudo da tela do aluno: concede o que for devido e lê números + troféus. */
export async function telaDaTribo(alunoId: string): Promise<{ dados: DadosTribo | null; minhas: ConquistaTribo[] }> {
  await sincronizarTribo(alunoId).catch(() => []);
  const [dados, minhas] = await Promise.all([dadosTribo({ alunoId }).catch(() => null), conquistasTribo(alunoId).catch(() => [])]);
  return { dados, minhas };
}
