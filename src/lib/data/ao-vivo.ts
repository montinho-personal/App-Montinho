// “Treinando agora”: treinos em andamento (o personal lê pela RLS) e recados
// ao vivo. O recado é uma intervenção tipo 'mensagem' visível ao aluno, com a
// sessão na referência (sem tabela nova). Regras puras em src/lib/ao-vivo/regras.ts.
import { listAlunos } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import { demoStore } from "@/lib/mock/store";
import { getDb } from "@/lib/supabase/rls";
import { criarIntervencao } from "@/lib/data/acompanhamento";
import { inscricoesPushDoAluno } from "@/lib/data/conquistas";
import { configurarVapid, enviarAosAparelhos } from "@/lib/push/enviar";
import { estadoAoVivo, MINUTOS_AO_VIVO, outrasAtividadesAoVivo, RECADO_ACOMPANHANDO, type EstadoAoVivo, type OutraAtividadeAoVivo } from "@/lib/ao-vivo/regras";
import { cardiosAbertos } from "@/lib/data/cardio";
import { mobilidadesAbertas } from "@/lib/data/mobilidade";
import { infoModalidade } from "@/lib/cardio/modalidades";
import type { Intervencao, SessionExercise, SessionSet, TrainingSession } from "@/lib/supabase/types-sessoes";

export type TreinandoAgora = {
  sessaoId: string;
  alunoId: string;
  nome: string;
  visitante: boolean;
  treino: string;
  extra: boolean;
  presencial: boolean;
  iniciadoEm: string;
  ultimaAtividade: string;
  estado: EstadoAoVivo;
  series: { feitas: number; planejadas: number };
  exercicioAtual: string | null;
  recados: Array<{ id: string; texto: string; em: string }>;
};

export type RecadoAoVivo = { id: string; texto: string; em: string; autor: string };

type Linhas = { sessoes: TrainingSession[]; exercicios: SessionExercise[]; sets: SessionSet[]; recados: Intervencao[] };

async function carregar(desde: string): Promise<Linhas> {
  if (isDemoMode()) {
    const st = demoStore();
    const sessoes = st.sessions.filter((s) => s.status === "em_andamento" && s.iniciado_em >= desde);
    const ids = new Set(sessoes.map((s) => s.id));
    return {
      sessoes,
      exercicios: st.sessionExercises.filter((e) => ids.has(e.session_id)),
      sets: st.sessionSets.filter((x) => ids.has(x.session_id)),
      recados: st.intervencoes.filter((i) => i.tipo === "mensagem" && ids.has(String(i.referencia?.sessao_id ?? ""))),
    };
  }
  const db = await getDb();
  const { data: s } = await db.from("training_sessions").select("id, aluno_id, letra, nome_treino, status, iniciado_em, series_planejadas, series_concluidas, modo, origem, snapshot").eq("status", "em_andamento").gte("iniciado_em", desde).order("iniciado_em", { ascending: false }).limit(60);
  const sessoes = (s ?? []) as TrainingSession[];
  if (!sessoes.length) return { sessoes, exercicios: [], sets: [], recados: [] };
  const ids = sessoes.map((x) => x.id);
  const [{ data: exs }, { data: sets }, { data: rec }] = await Promise.all([
    db.from("session_exercises").select("id, session_id, nome, ordem, status").in("session_id", ids),
    db.from("session_sets").select("session_id, session_exercise_id, concluida_em").in("session_id", ids),
    db.from("intervencoes").select("id, referencia, descricao, created_at").eq("tipo", "mensagem").in("aluno_id", [...new Set(sessoes.map((x) => x.aluno_id))]).gte("created_at", desde),
  ]);
  return { sessoes, exercicios: (exs ?? []) as SessionExercise[], sets: (sets ?? []) as SessionSet[], recados: (rec ?? []) as Intervencao[] };
}

/** Quem está treinando agora (treinos esquecidos abertos ficam de fora). */
export async function treinandoAgora(agoraMs = Date.now()): Promise<TreinandoAgora[]> {
  const desde = new Date(agoraMs - 6 * 3_600_000).toISOString();
  const [l, alunos] = await Promise.all([carregar(desde), listAlunos({ incluirVisitantes: true })]);
  const porAluno = new Map(alunos.map((a) => [a.id, a]));
  const out: TreinandoAgora[] = [];
  for (const s of l.sessoes) {
    const sets = l.sets.filter((x) => x.session_id === s.id).sort((a, b) => (a.concluida_em < b.concluida_em ? 1 : -1));
    const ultimaAtividade = sets[0]?.concluida_em ?? s.iniciado_em;
    const estado = estadoAoVivo(ultimaAtividade, agoraMs);
    if (estado === "esquecido") continue;
    const exs = l.exercicios.filter((e) => e.session_id === s.id).sort((a, b) => a.ordem - b.ordem);
    const atual = sets[0] ? exs.find((e) => e.id === sets[0].session_exercise_id) : exs.find((e) => e.status !== "concluido");
    const a = porAluno.get(s.aluno_id);
    const snap = (s.snapshot ?? {}) as { livre?: unknown; extra?: unknown };
    out.push({
      sessaoId: s.id,
      alunoId: s.aluno_id,
      nome: a?.profile?.nome ?? "Aluno",
      visitante: a?.modalidade === "visitante",
      treino: snap.livre ? "Treino livre" : s.letra ? `Treino ${s.letra}${s.nome_treino ? ` · ${s.nome_treino}` : ""}` : (s.nome_treino ?? "Treino"),
      extra: s.modo === "extra" || !!snap.extra,
      presencial: s.origem === "treinador",
      iniciadoEm: s.iniciado_em,
      ultimaAtividade,
      estado,
      series: { feitas: sets.length, planejadas: s.series_planejadas ?? 0 },
      exercicioAtual: atual?.nome ?? null,
      recados: l.recados.filter((r) => r.referencia?.sessao_id === s.id).sort((x, y) => (x.created_at < y.created_at ? -1 : 1)).map((r) => ({ id: r.id, texto: r.descricao, em: r.created_at })),
    });
  }
  return out.sort((a, b) => (a.estado === b.estado ? (a.ultimaAtividade < b.ultimaAtividade ? 1 : -1) : a.estado === "treinando" ? -1 : 1));
}

/** Quem está fazendo cardio (cronômetro) ou mobilidade agora, começado no app e ainda aberto. */
export async function outrasAtividadesAgora(agoraMs = Date.now()): Promise<OutraAtividadeAoVivo[]> {
  const desde = new Date(agoraMs - MINUTOS_AO_VIVO.esquecido * 60_000).toISOString();
  const [cardios, mobs, alunos] = await Promise.all([cardiosAbertos(desde).catch(() => []), mobilidadesAbertas(desde).catch(() => []), listAlunos({ incluirVisitantes: true }).catch(() => [])]);
  const pessoas = Object.fromEntries(alunos.map((a) => [a.id, { nome: a.profile?.nome ?? "Aluno", visitante: a.modalidade === "visitante" }]));
  const itens = [
    ...cardios.map((c) => {
      const m = c.modalidade ? infoModalidade(c.modalidade) : null;
      return { id: `cardio:${c.id}`, tipo: "cardio" as const, alunoId: c.aluno_id, atividade: m ? `${m.emoji} ${m.nome}` : "❤️‍🔥 Cardio", iniciadoEm: c.iniciado_em };
    }),
    ...mobs.map((s) => ({ id: `mob:${s.id}`, tipo: "mobilidade" as const, alunoId: s.aluno_id, atividade: s.protocolo === "superiores" ? "🧘 Mobilidade de Superiores" : "🧘 Mobilidade de Inferiores", iniciadoEm: s.iniciado_em })),
  ];
  return outrasAtividadesAoVivo(itens, pessoas, agoraMs);
}

/** Sessão em andamento (para o personal mandar o recado): de quem é. */
async function sessaoAberta(sessaoId: string): Promise<TrainingSession | null> {
  if (isDemoMode()) return demoStore().sessions.find((s) => s.id === sessaoId && s.status === "em_andamento") ?? null;
  const db = await getDb();
  const { data } = await db.from("training_sessions").select("id, aluno_id, status, iniciado_em").eq("id", sessaoId).eq("status", "em_andamento").maybeSingle();
  return (data as TrainingSession | null) ?? null;
}

/** Personal manda o recado: grava (aparece na tela do treino) e avisa o celular do aluno. */
export async function enviarRecadoAoVivo(autorId: string, sessaoId: string, texto: string): Promise<{ id: string; notificados: number } | null> {
  const s = await sessaoAberta(sessaoId);
  if (!s || Date.now() - Date.parse(s.iniciado_em) > 6 * 3_600_000) return null;
  const r = await criarIntervencao(s.aluno_id, autorId, { tipo: "mensagem", titulo: "Recado no treino", descricao: texto, referencia: { sessao_id: s.id, ao_vivo: true }, visivel_aluno: true });
  let notificados = 0;
  if (!isDemoMode() && configurarVapid()) {
    const aparelhos = await inscricoesPushDoAluno(s.aluno_id).catch(() => []);
    const res = await enviarAosAparelhos(aparelhos, { titulo: texto === RECADO_ACOMPANHANDO ? "👀 O Montinho está acompanhando seu treino" : "💬 Recado do Montinho", corpo: texto, url: "/aluno", tag: `recado-${r.id}` }, { ttl: MINUTOS_AO_VIVO.esquecido * 60 });
    notificados = res.ok;
  }
  return { id: r.id, notificados };
}

/** Recados desta sessão, para a tela do treino do aluno. */
export async function recadosDaSessao(alunoId: string, sessaoId: string): Promise<RecadoAoVivo[]> {
  if (isDemoMode()) {
    return demoStore()
      .intervencoes.filter((i) => i.aluno_id === alunoId && i.tipo === "mensagem" && i.visivel_aluno && i.referencia?.sessao_id === sessaoId)
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
      .map((i) => ({ id: i.id, texto: i.descricao, em: i.created_at, autor: "Montinho" }));
  }
  const db = await getDb();
  const { data } = await db.from("intervencoes").select("id, descricao, created_at").eq("aluno_id", alunoId).eq("tipo", "mensagem").eq("visivel_aluno", true).eq("referencia->>sessao_id", sessaoId).order("created_at").limit(30);
  return ((data ?? []) as Array<{ id: string; descricao: string; created_at: string }>).map((i) => ({ id: i.id, texto: i.descricao, em: i.created_at, autor: "Montinho" }));
}
