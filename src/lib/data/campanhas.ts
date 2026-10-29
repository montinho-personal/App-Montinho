// Campanhas do Modo Visitante (convite de amigo e oferta do fim do acesso).
// Regras puras em src/lib/visitante/campanhas.ts; banco em 0068 (RLS: o
// visitante lê as próprias indicações; o código vem de meu_convite_indicacao()).
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { eventosCta } from "@/lib/data/ctas";
import { ofertaFimAcesso, type Oferta, type ResumoIndicacao } from "@/lib/visitante/campanhas";
import { devePedirAvaliacao, linkAvaliacao } from "@/lib/visitante/avaliacao";
import { estadoDoAcesso } from "@/lib/visitante/acesso";

/** `avaliacao`: link do Google se o fim do treino que está para acabar é hora de pedir a avaliação (regras em src/lib/visitante/avaliacao.ts). */
export type CampanhaVisitante = { treinosConcluidos: number; indicacao: ResumoIndicacao; oferta: Oferta | null; avaliacao: string | null };

function pedidoAvaliacao(p: { treinosConcluidos: number; inicio: string | null; fim: string | null; oferta: Oferta | null; eventos: Awaited<ReturnType<typeof eventosCta>>; agora: Date }): string | null {
  const link = linkAvaliacao(isDemoMode());
  const pedir = devePedirAvaliacao({ ligado: !!link, treinosConcluidos: p.treinosConcluidos + 1, inicio: p.inicio, acessoVencido: estadoDoAcesso(p.fim, p.agora).estado === "vencido", temOferta: !!p.oferta, dor: false, eventos: p.eventos, agora: p.agora });
  return pedir ? link : null;
}

const DIA = 86_400_000;

export async function campanhaDoVisitante(alunoId: string, acessoFim: string | null, agora = new Date()): Promise<CampanhaVisitante> {
  if (isDemoMode()) {
    // Vitrine da demonstração (dados fictícios): já engajada, 1 amigo convidado e acesso acabando em 3 dias.
    const fim = acessoFim ?? new Date(agora.getTime() + 3 * DIA).toISOString();
    const inicio = new Date(Date.parse(fim) - 30 * DIA).toISOString();
    const eventos = await eventosCta(alunoId).catch(() => []);
    const oferta = ofertaFimAcesso({ fim, inicio, treinosConcluidos: 11, frequenciaSemanal: 3, eventos, agora });
    return { treinosConcluidos: 11, indicacao: { amigos: 1, diasGanhos: 10 }, oferta, avaliacao: pedidoAvaliacao({ treinosConcluidos: 11, inicio, fim, oferta, eventos, agora }) };
  }
  const db = await getDb();
  const [sessoes, indicacoes, acesso, perfil, eventos] = await Promise.all([
    db.from("training_sessions").select("id", { count: "exact", head: true }).eq("aluno_id", alunoId).eq("status", "concluida"),
    db.from("indicacoes").select("dias_bonus").eq("indicador_aluno_id", alunoId),
    db.from("acessos_visitante").select("inicio, fim").eq("aluno_id", alunoId).maybeSingle(),
    db.from("perfil_visitante").select("frequencia_semanal").eq("aluno_id", alunoId).maybeSingle(),
    eventosCta(alunoId).catch(() => []),
  ]);
  const treinosConcluidos = sessoes.count ?? 0;
  const lista = (indicacoes.data ?? []) as Array<{ dias_bonus: number }>;
  const fim = (acesso.data?.fim as string | null) ?? acessoFim;
  const inicio = (acesso.data?.inicio as string | null) ?? null;
  const oferta = ofertaFimAcesso({ fim, inicio, treinosConcluidos, frequenciaSemanal: (perfil.data?.frequencia_semanal as number | null) ?? null, eventos, agora });
  return {
    treinosConcluidos,
    indicacao: { amigos: lista.length, diasGanhos: lista.reduce((n, i) => n + (i.dias_bonus ?? 0), 0) },
    oferta,
    avaliacao: pedidoAvaliacao({ treinosConcluidos, inicio, fim, oferta, eventos, agora }),
  };
}

/** Código pessoal do convite de amigo (cria na 1ª vez; só com 4+ treinos concluídos). */
export async function meuCodigoIndicacao(): Promise<string | null> {
  if (isDemoMode()) return "AMIGO-DEMO1";
  const db = await getDb();
  const { data, error } = await db.rpc("meu_convite_indicacao");
  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
}

/** Painel do personal: quem cada visitante convidou e quantos dias ganhou. */
export async function indicacoesPorVisitante(): Promise<Map<string, { amigos: number; diasGanhos: number; convidadoPor: string | null }>> {
  const mapa = new Map<string, { amigos: number; diasGanhos: number; convidadoPor: string | null }>();
  if (isDemoMode()) return mapa;
  const db = await getDb();
  const { data } = await db.from("indicacoes").select("indicador_aluno_id, indicado_aluno_id, dias_bonus").limit(5000);
  for (const r of (data ?? []) as Array<{ indicador_aluno_id: string; indicado_aluno_id: string; dias_bonus: number }>) {
    const a = mapa.get(r.indicador_aluno_id) ?? { amigos: 0, diasGanhos: 0, convidadoPor: null };
    a.amigos += 1;
    a.diasGanhos += r.dias_bonus ?? 0;
    mapa.set(r.indicador_aluno_id, a);
    const b = mapa.get(r.indicado_aluno_id) ?? { amigos: 0, diasGanhos: 0, convidadoPor: null };
    b.convidadoPor = r.indicador_aluno_id;
    mapa.set(r.indicado_aluno_id, b);
  }
  return mapa;
}
