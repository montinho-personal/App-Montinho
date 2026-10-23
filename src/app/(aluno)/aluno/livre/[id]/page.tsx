// Treino livre (freestyle) do visitante: em andamento ou o resumo do fim.
export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { requireAlunoPage } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { getSessao, ultimasExecucoes } from "@/lib/data/sessoes";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { ehSessaoLivre, resumoLivre, textoUltimaVez, type ExercicioLivre } from "@/lib/treino/livre";
import { podeRegistrar } from "@/lib/visitante/acesso";
import { LivreClient, type ExercicioTela } from "./LivreClient";
import { ResumoLivreClient } from "./ResumoLivreClient";

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
    const exercicios: ExercicioLivre[] = s.exercicios.map((e) => ({ nome: e.nome, biblioteca_id: e.biblioteca_id, tecnica: tecnicaDe(e.prescricao), series: [...e.series].sort((a, b) => a.serie - b.serie).map((x) => ({ tipo: x.tipo, carga_kg: x.carga_kg, reps: x.reps })) }));
    return <ResumoLivreClient resumo={resumoLivre(exercicios)} exercicios={exercicios} podeSalvar={visitante && podeRegistrar("visitante", sessao.acessoFim ?? null)} extra={s.modo === "extra"} duracaoMin={s.duracao_seg != null ? Math.max(1, Math.round(s.duracao_seg / 60)) : null} />;
  }

  const [biblioteca, ultimas] = await Promise.all([listarBiblioteca(), ultimasExecucoes(sessao.alunoId, s.exercicios.map((e) => ({ id: e.id, nome: e.nome, biblioteca_id: e.biblioteca_id }))).catch(() => ({}) as Record<string, null>)]);
  const itens = biblioteca.map((i) => ({ id: i.id, nome: i.nome, grupo: i.grupo, sinonimos: i.sinonimos, equipamento: i.equipamento, video: Boolean(i.midia?.verificada), midia: i.midia?.verificada ? { provider: i.midia.provider, id: i.midia.id } : null, passos: i.execucao.slice(0, 3) }));
  // Retomar: as séries já salvas voltam marcadas (a chave “livre:<key>” vem do aparelho).
  const inicial: ExercicioTela[] = [...s.exercicios].sort((a, b) => a.ordem - b.ordem).map((e) => ({
    seId: e.id,
    nome: e.nome,
    grupo: e.grupo_muscular,
    tecnica: tecnicaDe(e.prescricao),
    observacao: e.observacao_aluno ?? "",
    ultima: textoUltimaVez(ultimas[e.id]),
    series: [...e.series].sort((a, b) => a.serie - b.serie).map((x) => ({ key: x.client_key.replace(/^livre:/, ""), serie: x.serie, tipo: x.tipo, carga: x.carga_kg != null ? String(x.carga_kg).replace(".", ",") : "", reps: x.reps != null ? String(x.reps) : "", salva: true })),
  }));
  return <LivreClient sessaoId={s.id} iniciadoEm={s.iniciado_em} itens={itens} inicial={inicial} extra={s.modo === "extra"} voltar={visitante ? "/aluno/meus-treinos" : "/aluno/treinar"} />;
}
