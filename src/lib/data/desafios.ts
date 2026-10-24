// Desafios entre alunos (0094). Regras puras em src/lib/desafios/regras.ts.
// Escritas pelas funções do banco (security definer): criar (insert com RLS),
// convidar, responder e entrar pelo código. O placar vem de dados_desafio(),
// que só participantes e o personal leem.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore, uid } from "@/lib/mock/store";
import { mockProfiles } from "@/lib/mock/db";
import {
  diaBrasilia,
  gerarCodigoDesafio,
  marcosDesafios,
  placarDesafio,
  situacaoDesafio,
  type LinhaPlacar,
  type MarcosDesafios,
  type ParticipanteDados,
  type ResultadoDesafio,
  type SituacaoDesafio,
  type TipoDesafio,
} from "@/lib/desafios/regras";

export type Desafio = { id: string; codigo: string; criadorAlunoId: string; nome: string; tipo: TipoDesafio; meta: number | null; inicio: string; fim: string; cancelado: boolean };
export type ResumoDesafio = Desafio & { situacao: SituacaoDesafio; meuStatus: "convidado" | "aceito" | "recusado" | null; souCriador: boolean; aceitos: number };
export type DetalheDesafio = ResumoDesafio & { placar: LinhaPlacar[]; convidados: Array<{ nome: string }>; criadorNome: string };
export type DesafioPublico = { nome: string; tipo: TipoDesafio; meta: number | null; inicio: string; fim: string; criador: string; participantes: number; encerrado: boolean };
export type NovoDesafio = { nome: string; tipo: TipoDesafio; meta: number | null; inicio: string; dias: number };

type Linha = { id: string; codigo: string; criador_aluno_id: string; nome: string; tipo: TipoDesafio; meta: number | null; inicio: string; fim: string; cancelado_em: string | null };
type Part = { desafio_id: string; aluno_id: string; status: "convidado" | "aceito" | "recusado"; convidado_por: string | null };

const hoje = () => diaBrasilia(new Date());
const somar = (dia: string, n: number) => new Date(Date.parse(`${dia}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const doBanco = (l: Linha): Desafio => ({ id: l.id, codigo: l.codigo, criadorAlunoId: l.criador_aluno_id, nome: l.nome, tipo: l.tipo, meta: l.meta, inicio: String(l.inicio), fim: String(l.fim), cancelado: !!l.cancelado_em });
/** Primeiro nome + inicial do último sobrenome (“Aline de Souza” → “Aline S.”), como no banco. */
const nomeCurto = (nome: string) => {
  const partes = nome.replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "Aluno";
  return partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1][0].toUpperCase()}.` : partes[0];
};

// ---------------------------------------------------------------------------
// Demonstração: tudo em memória, com dois desafios de exemplo.
// ---------------------------------------------------------------------------
type DemoDesafios = { desafios: Linha[]; parts: Part[] };
function demo(): DemoDesafios {
  const g = globalThis as unknown as { __montinhoDesafios?: DemoDesafios };
  if (!g.__montinhoDesafios) {
    const h = hoje();
    g.__montinhoDesafios = {
      desafios: [
        { id: "des-demo-1", codigo: "ALJ7K2", criador_aluno_id: "aline", nome: "Aline × João: outubro sem falhar", tipo: "mais_treinos", meta: null, inicio: somar(h, -9), fim: somar(h, 4), cancelado_em: null },
        { id: "des-demo-2", codigo: "SEM3DM", criador_aluno_id: "joao", nome: "3 por semana, sem desculpa", tipo: "semanas", meta: 3, inicio: somar(h, -22), fim: somar(h, -9), cancelado_em: null },
      ],
      parts: [
        { desafio_id: "des-demo-1", aluno_id: "aline", status: "aceito", convidado_por: null },
        { desafio_id: "des-demo-1", aluno_id: "joao", status: "aceito", convidado_por: "aline" },
        { desafio_id: "des-demo-1", aluno_id: "bia", status: "convidado", convidado_por: "aline" },
        { desafio_id: "des-demo-2", aluno_id: "joao", status: "aceito", convidado_por: null },
        { desafio_id: "des-demo-2", aluno_id: "aline", status: "aceito", convidado_por: "joao" },
      ],
    };
  }
  return g.__montinhoDesafios;
}
const nomeDemo = (alunoId: string) => mockProfiles.find((p) => p.id === demoStore().alunos.find((a) => a.id === alunoId)?.profile_id)?.nome ?? "Aluno";
function dadosDemo(desafioId: string, eu: string | null, personal: boolean): ParticipanteDados[] {
  const st = demoStore();
  const d = demo().desafios.find((x) => x.id === desafioId)!;
  return demo()
    .parts.filter((p) => p.desafio_id === desafioId)
    .map((p) => ({
      alunoId: p.aluno_id,
      nome: personal ? nomeDemo(p.aluno_id) : nomeCurto(nomeDemo(p.aluno_id)),
      status: p.status,
      eu: p.aluno_id === eu,
      criador: p.aluno_id === d.criador_aluno_id,
      treinos: st.sessions.filter((s) => s.aluno_id === p.aluno_id && s.status === "concluida" && (s.series_concluidas ?? 0) > 0).map((s) => s.iniciado_em),
    }));
}

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------
function resumir(d: Desafio, parts: Part[], eu: string | null): ResumoDesafio {
  const meus = parts.filter((p) => p.desafio_id === d.id);
  return {
    ...d,
    situacao: situacaoDesafio(d, hoje()),
    meuStatus: meus.find((p) => p.aluno_id === eu)?.status ?? null,
    souCriador: d.criadorAlunoId === eu,
    aceitos: meus.filter((p) => p.status === "aceito").length,
  };
}

/** Desafios em que a pessoa está (criou, aceitou ou foi convidada), mais recentes primeiro. */
export async function listarMeusDesafios(alunoId: string): Promise<ResumoDesafio[]> {
  let desafios: Desafio[];
  let parts: Part[];
  if (isDemoMode()) {
    const ids = new Set(demo().parts.filter((p) => p.aluno_id === alunoId).map((p) => p.desafio_id));
    desafios = demo().desafios.filter((d) => ids.has(d.id)).map(doBanco);
    parts = demo().parts;
  } else {
    const db = await getDb();
    const { data, error } = await db.from("desafios").select("id, codigo, criador_aluno_id, nome, tipo, meta, inicio, fim, cancelado_em").order("fim", { ascending: false }).limit(60);
    if (error) return [];
    desafios = ((data ?? []) as Linha[]).map(doBanco);
    const { data: ps } = desafios.length ? await db.from("desafio_participantes").select("desafio_id, aluno_id, status, convidado_por").in("desafio_id", desafios.map((d) => d.id)) : { data: [] };
    parts = (ps ?? []) as Part[];
    desafios = desafios.filter((d) => parts.some((p) => p.desafio_id === d.id && p.aluno_id === alunoId));
  }
  const ordem: Record<SituacaoDesafio, number> = { andamento: 0, agendado: 1, encerrado: 2 };
  return desafios.map((d) => resumir(d, parts, alunoId)).sort((a, b) => ordem[a.situacao] - ordem[b.situacao] || (a.fim < b.fim ? 1 : -1));
}

/** Detalhe com placar. Personal vê nome completo; aluno, primeiro nome + inicial. */
export async function detalheDesafio(desafioId: string, alunoId: string | null): Promise<DetalheDesafio | null> {
  const personal = alunoId === null;
  if (isDemoMode()) {
    const l = demo().desafios.find((d) => d.id === desafioId);
    if (!l || (!personal && !demo().parts.some((p) => p.desafio_id === desafioId && p.aluno_id === alunoId))) return null;
    const dados = dadosDemo(desafioId, alunoId, personal);
    return montarDetalhe(doBanco(l), dados, demo().parts, alunoId);
  }
  const db = await getDb();
  const { data: l } = await db.from("desafios").select("id, codigo, criador_aluno_id, nome, tipo, meta, inicio, fim, cancelado_em").eq("id", desafioId).maybeSingle();
  if (!l) return null;
  const { data: rows } = await db.rpc("dados_desafio", { p_desafio: desafioId });
  const dados = ((rows ?? []) as Array<{ aluno_id: string; nome: string; status: Part["status"]; eu: boolean; criador: boolean; treinos: string[] | null }>).map((r) => ({ alunoId: r.aluno_id, nome: r.nome, status: r.status, eu: r.eu, criador: r.criador, treinos: r.treinos ?? [] }));
  const parts: Part[] = dados.map((x) => ({ desafio_id: desafioId, aluno_id: x.alunoId, status: x.status, convidado_por: null }));
  return montarDetalhe(doBanco(l as Linha), dados, parts, alunoId);
}

function montarDetalhe(d: Desafio, dados: ParticipanteDados[], parts: Part[], eu: string | null): DetalheDesafio {
  return {
    ...resumir(d, parts, eu),
    placar: placarDesafio(d, dados),
    convidados: dados.filter((x) => x.status === "convidado").map((x) => ({ nome: x.nome })),
    criadorNome: dados.find((x) => x.criador)?.nome ?? "",
  };
}

/** Prévia do link (sem login). */
export async function desafioPublico(codigo: string): Promise<DesafioPublico | null> {
  const c = codigo.toUpperCase();
  if (isDemoMode()) {
    const d = demo().desafios.find((x) => x.codigo === c);
    if (!d) return null;
    return { nome: d.nome, tipo: d.tipo, meta: d.meta, inicio: d.inicio, fim: d.fim, criador: nomeDemo(d.criador_aluno_id).split(" ")[0], participantes: demo().parts.filter((p) => p.desafio_id === d.id && p.status === "aceito").length, encerrado: d.fim < hoje() || !!d.cancelado_em };
  }
  const db = await getDb();
  const { data } = await db.rpc("desafio_publico", { p_codigo: c });
  const r = ((data ?? []) as Array<{ nome: string; tipo: TipoDesafio; meta: number | null; inicio: string; fim: string; criador: string; participantes: number; encerrado: boolean }>)[0];
  return r ? { ...r, inicio: String(r.inicio), fim: String(r.fim) } : null;
}

/** Quem dá para convidar pelo nome (quem aparece no ranking). */
export async function pessoasParaDesafio(alunoId: string): Promise<Array<{ alunoId: string; nome: string }>> {
  if (isDemoMode()) return demoStore().alunos.filter((a) => a.id !== alunoId && a.status === "ativo").map((a) => ({ alunoId: a.id, nome: nomeCurto(nomeDemo(a.id)) })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const db = await getDb();
  const { data } = await db.rpc("pessoas_para_desafio");
  return ((data ?? []) as Array<{ aluno_id: string; nome: string }>).map((r) => ({ alunoId: r.aluno_id, nome: r.nome }));
}

/** Todos os desafios (painel do personal). */
export async function listarTodosDesafios(): Promise<Array<ResumoDesafio & { participantes: string[] }>> {
  let desafios: Desafio[];
  let parts: Part[];
  let nomes: Map<string, string>;
  if (isDemoMode()) {
    desafios = demo().desafios.map(doBanco);
    parts = demo().parts;
    nomes = new Map(demoStore().alunos.map((a) => [a.id, nomeDemo(a.id)]));
  } else {
    const db = await getDb();
    const { data } = await db.from("desafios").select("id, codigo, criador_aluno_id, nome, tipo, meta, inicio, fim, cancelado_em").order("fim", { ascending: false }).limit(100);
    desafios = ((data ?? []) as Linha[]).map(doBanco);
    const { data: ps } = desafios.length ? await db.from("desafio_participantes").select("desafio_id, aluno_id, status, convidado_por").in("desafio_id", desafios.map((d) => d.id)) : { data: [] };
    parts = (ps ?? []) as Part[];
    const ids = [...new Set(parts.map((p) => p.aluno_id))];
    const { data: al } = ids.length ? await db.from("alunos").select("id, profile:profiles(nome)").in("id", ids) : { data: [] };
    nomes = new Map(((al ?? []) as unknown as Array<{ id: string; profile: { nome: string | null } | null }>).map((a) => [a.id, a.profile?.nome ?? "Aluno"]));
  }
  return desafios.map((d) => ({ ...resumir(d, parts, null), participantes: parts.filter((p) => p.desafio_id === d.id && p.status === "aceito").map((p) => nomes.get(p.aluno_id) ?? "Aluno") }));
}

// ---------------------------------------------------------------------------
// Escrita
// ---------------------------------------------------------------------------
export async function criarDesafio(alunoId: string, n: NovoDesafio, convidar: string[]): Promise<{ id: string; codigo: string }> {
  const fim = somar(n.inicio, n.dias - 1);
  const meta = n.tipo === "meta_fixa" || n.tipo === "semanas" ? n.meta : null;
  if (isDemoMode()) {
    const id = uid();
    const codigo = gerarCodigoDesafio();
    demo().desafios.push({ id, codigo, criador_aluno_id: alunoId, nome: n.nome, tipo: n.tipo, meta, inicio: n.inicio, fim, cancelado_em: null });
    demo().parts.push({ desafio_id: id, aluno_id: alunoId, status: "aceito", convidado_por: null });
    for (const a of convidar) if (a !== alunoId) demo().parts.push({ desafio_id: id, aluno_id: a, status: "convidado", convidado_por: alunoId });
    return { id, codigo };
  }
  const db = await getDb();
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const codigo = gerarCodigoDesafio();
    const { data, error } = await db.from("desafios").insert({ codigo, criador_aluno_id: alunoId, nome: n.nome, tipo: n.tipo, meta, inicio: n.inicio, fim }).select("id").single();
    if (error) {
      if (error.code === "23505") continue; // código repetido: tenta outro
      throw new Error(error.message);
    }
    if (convidar.length) await db.rpc("convidar_para_desafio", { p_desafio: data.id, p_alunos: convidar });
    return { id: data.id as string, codigo };
  }
  throw new Error("Não foi possível criar o desafio agora. Tente de novo.");
}

export async function convidarParaDesafio(alunoId: string, desafioId: string, alunos: string[]): Promise<number> {
  if (isDemoMode()) {
    let n = 0;
    for (const a of alunos) {
      if (a === alunoId || demo().parts.some((p) => p.desafio_id === desafioId && p.aluno_id === a)) continue;
      demo().parts.push({ desafio_id: desafioId, aluno_id: a, status: "convidado", convidado_por: alunoId });
      n++;
    }
    return n;
  }
  const db = await getDb();
  const { data, error } = await db.rpc("convidar_para_desafio", { p_desafio: desafioId, p_alunos: alunos });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}

export async function responderDesafio(alunoId: string, desafioId: string, aceitar: boolean): Promise<void> {
  if (isDemoMode()) {
    const p = demo().parts.find((x) => x.desafio_id === desafioId && x.aluno_id === alunoId);
    if (p && p.status !== "aceito") p.status = aceitar ? "aceito" : "recusado";
    return;
  }
  const db = await getDb();
  const { error } = await db.rpc("responder_desafio", { p_desafio: desafioId, p_aceitar: aceitar });
  if (error) throw new Error(error.message);
}

export async function entrarNoDesafio(alunoId: string, codigo: string): Promise<string> {
  const c = codigo.toUpperCase();
  if (isDemoMode()) {
    const d = demo().desafios.find((x) => x.codigo === c && x.fim >= hoje() && !x.cancelado_em);
    if (!d) throw new Error("Desafio não encontrado ou já encerrado");
    const p = demo().parts.find((x) => x.desafio_id === d.id && x.aluno_id === alunoId);
    if (p) p.status = "aceito";
    else demo().parts.push({ desafio_id: d.id, aluno_id: alunoId, status: "aceito", convidado_por: null });
    return d.id;
  }
  const db = await getDb();
  const { data, error } = await db.rpc("entrar_no_desafio", { p_codigo: c });
  if (error) throw new Error(error.message);
  return data as string;
}

// ---------------------------------------------------------------------------
// Troféus: resultado dos desafios já encerrados da pessoa
// ---------------------------------------------------------------------------
export async function marcosDosDesafios(alunoId: string): Promise<MarcosDesafios | null> {
  const meus = (await listarMeusDesafios(alunoId)).filter((d) => d.situacao === "encerrado" && !d.cancelado && d.meuStatus === "aceito").slice(0, 30);
  if (!meus.length) return null;
  const resultados: ResultadoDesafio[] = [];
  for (const d of meus) {
    const det = await detalheDesafio(d.id, alunoId).catch(() => null);
    if (!det) continue;
    const eu = det.placar.find((l) => l.eu);
    const disputa = d.tipo === "mais_treinos" || d.tipo === "madrugador";
    resultados.push({ id: d.id, fim: d.fim, souCriador: d.souCriador, aceitos: det.placar.length, venci: disputa && !!eu?.cumpriu, cumpri: !disputa && !!eu?.cumpriu, aceitei: true });
  }
  return marcosDesafios(resultados);
}
