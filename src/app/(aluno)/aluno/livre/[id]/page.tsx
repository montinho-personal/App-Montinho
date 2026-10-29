// Treino livre (freestyle) do visitante: em andamento ou o resumo do fim.
export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { requireAlunoPage } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { getSessao, ultimasExecucoes } from "@/lib/data/sessoes";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { ehSessaoLivre, resumoLivre, textoUltimaVez, type ExercicioLivre } from "@/lib/treino/livre";
import { podeRegistrar } from "@/lib/visitante/acesso";
import { placarDoAluno } from "@/lib/data/livre-metas";
import { dataLocal } from "@/lib/aderencia/calcular";
import { LivreClient, type ExercicioTela } from "./LivreClient";
import { juntarBlocosAdjacentes } from "@/lib/treino/tecnica-aluno";
import type { ConfigTecnica } from "@/lib/treino/tecnica-config";
import { FimLivreClient } from "./FimLivreClient";
import { campanhaDoVisitante } from "@/lib/data/campanhas";
import { REGRAS_AVALIACAO } from "@/lib/visitante/avaliacao";

export const metadata = { title: "Treino livre" };

export default async function TreinoLivrePage({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await requireAlunoPage();
  const visitante = ehVisitante(sessao);
  const { id } = await params;
  const s = await getSessao(sessao.alunoId, id);
  if (!s) notFound();
  // Sessão de outro tipo (ex.: treino apagado depois): volta para o início.
  if (!ehSessaoLivre(s)) redirect("/aluno");
  const tecnicaDe = (p: unknown) => ((p as { tecnica?: string } | null)?.tecnica ?? "normal");

  if (s.status !== "em_andamento") {
    const exercicios: ExercicioLivre[] = s.exercicios.filter((e) => e.status !== "pulado").map((e) => ({ nome: e.nome, biblioteca_id: e.biblioteca_id, tecnica: tecnicaDe(e.prescricao), series: [...e.series].sort((a, b) => a.serie - b.serie).map((x) => ({ tipo: x.tipo, carga_kg: x.carga_kg, reps: x.reps })) }));
    const duracaoMin = s.duracao_seg != null ? Math.max(1, Math.round(s.duracao_seg / 60)) : null;
    // Mesma tela de fim de todos os treinos: medalhas, card, relatório e cardio.
    const base = { sessaoId: s.id, status: s.status === "abandonada" ? ("abandonada" as const) : ("concluida" as const), nomeTreino: s.nome_treino ?? (s.modo === "extra" ? "Treino extra livre" : "Treino livre"), series: s.series_concluidas, seriesPlanejadas: s.series_planejadas, duracaoMin, data: dataLocal(new Date(s.finalizado_em ?? s.iniciado_em)) };
    // Pedido de avaliação no Google (visitante): este treino já está na conta dos concluídos.
    const camp = visitante && base.status === "concluida" ? await campanhaDoVisitante(sessao.alunoId, sessao.acessoFim ?? null).catch(() => null) : null;
    const avaliacao = camp?.avaliacao && camp.treinosConcluidos >= REGRAS_AVALIACAO.minTreinos ? { link: camp.avaliacao, treinos: camp.treinosConcluidos } : null;
    return <FimLivreClient avaliacao={avaliacao} base={base} nome={sessao.nome.split(" ")[0]} resumo={resumoLivre(exercicios)} exercicios={exercicios} podeSalvar={visitante && podeRegistrar("visitante", sessao.acessoFim ?? null)} extra={s.modo === "extra"} duracaoMin={duracaoMin} dor={s.feedback_percepcao === "dor" || s.checkin_pre === "desconforto"} />;
  }

  const [biblioteca, metas, ultimas] = await Promise.all([listarBiblioteca(), s.modo === "extra" ? null : placarDoAluno(sessao.alunoId, s.id, { qualquerPlano: true }).catch(() => null), ultimasExecucoes(sessao.alunoId, s.exercicios.map((e) => ({ id: e.id, nome: e.nome, biblioteca_id: e.biblioteca_id }))).catch(() => ({}) as Record<string, null>)]);
  const itens = biblioteca.map((i) => ({ id: i.id, nome: i.nome, grupo: i.grupo, sinonimos: i.sinonimos, equipamento: i.equipamento, video: Boolean(i.midia?.verificada), midia: i.midia?.verificada ? { provider: i.midia.provider, id: i.midia.id } : null, passos: i.execucao.slice(0, 3) }));
  // Retomar: as séries já salvas voltam marcadas (a chave “livre:<key>” vem do aparelho).
  const presc = (p: unknown) => (p ?? {}) as { tecnica_config?: ConfigTecnica | null; bloco?: string | null };
  const txt = (n: number | null) => (n != null ? String(n).replace(".", ",") : "");
  const inicial: ExercicioTela[] = juntarBlocosAdjacentes(s.exercicios.filter((e) => e.status !== "pulado").sort((a, b) => a.ordem - b.ordem).map((e) => ({
    seId: e.id,
    nome: e.nome,
    grupo: e.grupo_muscular,
    tecnica: tecnicaDe(e.prescricao),
    config: presc(e.prescricao).tecnica_config ?? null,
    bloco: presc(e.prescricao).bloco ?? null,
    observacao: e.observacao_aluno ?? "",
    ultima: textoUltimaVez(ultimas[e.id]),
    series: [...e.series].sort((a, b) => a.serie - b.serie).map((x) => ({ key: x.client_key.replace(/^livre:/, ""), serie: x.serie, tipo: x.tipo, carga: txt(x.carga_kg), reps: x.reps != null ? String(x.reps) : "", salva: true, ...(x.blocos?.length ? { blocos: x.blocos.map((b) => ({ carga: txt(b.carga), reps: b.reps != null ? String(b.reps) : "" })) } : {}) })),
  })));
  return <LivreClient sessaoId={s.id} iniciadoEm={s.iniciado_em} itens={itens} inicial={inicial} extra={s.modo === "extra"} voltar={visitante ? "/aluno/meus-treinos" : "/aluno/treinar"} metas={metas?.placar.length ? { placar: metas.placar, hoje: dataLocal(new Date()), recentes: metas.recentes } : null} />;
}
