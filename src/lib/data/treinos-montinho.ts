// ============================================================================
// Treinos do Montinho (0154, pedido do Montinho, 11/11/2026). O personal salva
// um treino que ele fez (a partir da sessão dele no Meu treino) com foco e
// narrativa; os alunos veem os publicados e fazem o mesmo treino (treino livre
// já com a meta). Regras puras em src/lib/treino/treinos-montinho.ts.
// ============================================================================
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { uid } from "@/lib/mock/store";
import { getSessao, listSessoes } from "./sessoes";
import { focoDoTreino, itensDaSessao, narrativaAutomatica, type ItemTreinoMontinho, type TreinoMontinho } from "@/lib/treino/treinos-montinho";

type Linha = TreinoMontinho & { removido_em: string | null };
type Demo = { lista: Linha[] };
function demo(): Demo {
  const g = globalThis as unknown as { __montinhoTreinosMontinho?: Demo };
  if (!g.__montinhoTreinosMontinho) {
    const itens: ItemTreinoMontinho[] = [
      { biblioteca_id: null, nome: "Abdominal supra na polia em pé", grupo: "abdomen", series: 4, reps: "10-12", tecnica: "piramide", tecnica_config: null, bloco: null },
      { biblioteca_id: null, nome: "Abdominal infra no banco declinado", grupo: "abdomen", series: 4, reps: "10-12", tecnica: "cluster", tecnica_config: { aplicar: "principais", series: 3, blocos: 4, pausaSeg: 10 }, bloco: null },
      { biblioteca_id: null, nome: "Abdominal remador no banco", grupo: "abdomen", series: 4, reps: "12-15", tecnica: "normal", tecnica_config: null, bloco: null },
      { biblioteca_id: null, nome: "Panturrilha no leg press", grupo: "panturrilha", series: 4, reps: "15-20", tecnica: "dropset", tecnica_config: { aplicar: "principais", series: 2, blocos: 4 }, bloco: null },
      { biblioteca_id: null, nome: "Panturrilha sentado", grupo: "panturrilha", series: 4, reps: "15-20", tecnica: "normal", tecnica_config: null, bloco: null },
    ];
    const agora = new Date().toISOString();
    g.__montinhoTreinosMontinho = { lista: [{ id: "tm-demo-1", titulo: "Missão Gomos & Gêmeos", foco: focoDoTreino(itens), narrativa: narrativaAutomatica(itens), itens, sessao_id: null, feito_em: agora, publicado: true, created_at: agora, removido_em: null }] };
  }
  return g.__montinhoTreinosMontinho;
}

/** Os publicados (alunos) ou todos os não arquivados (personal), do mais novo. */
export async function listarTreinosMontinho(opts: { todos?: boolean } = {}): Promise<TreinoMontinho[]> {
  if (isDemoMode()) return demo().lista.filter((t) => !t.removido_em && (opts.todos || t.publicado)).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const db = await getDb();
  let q = db.from("treinos_montinho").select("id, titulo, foco, narrativa, itens, sessao_id, feito_em, publicado, created_at").is("removido_em", null).order("created_at", { ascending: false }).limit(100);
  if (!opts.todos) q = q.eq("publicado", true);
  const { data } = await q;
  return (data ?? []) as TreinoMontinho[];
}

export async function getTreinoMontinho(id: string): Promise<TreinoMontinho | null> {
  return (await listarTreinosMontinho({ todos: true }).catch(() => [])).find((t) => t.id === id) ?? null;
}

/** Os treinos do Meu treino do personal (livres, concluídos) que ainda podem ser salvos. */
export async function treinosFeitosParaSalvar(meuAluno: string): Promise<Array<{ sessaoId: string; titulo: string; feitoEm: string; itens: ItemTreinoMontinho[]; salvo: boolean }>> {
  const [sessoes, salvos] = await Promise.all([listSessoes(meuAluno, { limite: 30 }).catch(() => []), listarTreinosMontinho({ todos: true }).catch(() => [])]);
  const jaSalvos = new Set(salvos.map((t) => t.sessao_id).filter(Boolean));
  return sessoes
    .map((s) => ({ sessaoId: s.id, titulo: s.nome_treino || "Treino", feitoEm: s.iniciado_em, itens: itensDaSessao(s.exercicios), salvo: jaSalvos.has(s.id) }))
    .filter((t) => t.itens.length > 0)
    .slice(0, 15);
}

/** Salva (publicado) um treino feito pelo personal; o texto vem pronto e ele edita depois. */
export async function salvarDaSessao(meuAluno: string, sessaoId: string, titulo?: string | null): Promise<TreinoMontinho> {
  const s = await getSessao(meuAluno, sessaoId);
  if (!s) throw new Error("Esse treino não foi encontrado no seu Meu treino.");
  const itens = itensDaSessao(s.exercicios);
  if (!itens.length) throw new Error("Esse treino não tem exercícios para salvar.");
  const nome = (titulo?.trim() || (s.nome_treino && !/^(Extra · )?Treino livre$/.test(s.nome_treino) ? s.nome_treino : "Treino do Montinho")).slice(0, 120);
  const novo = { titulo: nome, foco: focoDoTreino(itens), narrativa: narrativaAutomatica(itens), itens, sessao_id: s.id, feito_em: s.iniciado_em, publicado: true };
  if (isDemoMode()) {
    const t: Linha = { ...novo, id: uid(), created_at: new Date().toISOString(), removido_em: null };
    demo().lista.push(t);
    return t;
  }
  const db = await getDb();
  const { data, error } = await db.from("treinos_montinho").insert(novo).select("id, titulo, foco, narrativa, itens, sessao_id, feito_em, publicado, created_at").single();
  if (error) throw new Error(/duplicate|unique/i.test(error.message) ? "Esse treino já está salvo." : error.message);
  return data as TreinoMontinho;
}

/** Personal muda título, foco, narrativa, publicado, ou arquiva (nada é apagado). */
export async function atualizarTreinoMontinho(id: string, patch: { titulo?: string; foco?: string | null; narrativa?: string | null; publicado?: boolean; arquivar?: boolean }): Promise<boolean> {
  const mudar: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.titulo !== undefined) mudar.titulo = patch.titulo.trim().slice(0, 120);
  if (patch.foco !== undefined) mudar.foco = patch.foco?.trim().slice(0, 200) || null;
  if (patch.narrativa !== undefined) mudar.narrativa = patch.narrativa?.trim().slice(0, 1500) || null;
  if (patch.publicado !== undefined) mudar.publicado = patch.publicado;
  if (patch.arquivar) mudar.removido_em = new Date().toISOString();
  if (isDemoMode()) {
    const t = demo().lista.find((x) => x.id === id);
    if (t) Object.assign(t, mudar);
    return !!t;
  }
  const db = await getDb();
  const { error, count } = await db.from("treinos_montinho").update(mudar, { count: "exact" }).eq("id", id);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}
