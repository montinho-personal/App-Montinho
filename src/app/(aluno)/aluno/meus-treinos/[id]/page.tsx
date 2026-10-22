export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { FEATURES, isDemoMode } from "@/lib/env";
import { requireAlunoPage } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { getTreinoComExercicios } from "@/lib/data/programas";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { perfilVisitante } from "@/lib/data/visitantes";
import { podeRegistrar } from "@/lib/visitante/acesso";
import { MontadorVisitante, type ItemLeve } from "./MontadorVisitante";

export const metadata = { title: "Montar treino" };

export default async function MontarTreinoPage({ params }: { params: Promise<{ id: string }> }) {
  if (!FEATURES.modoVisitante) notFound();
  const sessao = await requireAlunoPage();
  if (!ehVisitante(sessao) && !isDemoMode()) notFound();
  if (!podeRegistrar("visitante", sessao.acessoFim ?? null)) redirect("/aluno/meus-treinos");
  const { id } = await params;

  let inicial: { id: string; nome: string; exercicios: Array<{ id: string; biblioteca_id: string; series: number; reps: string; descanso_seg: number }> } | null = null;
  const biblioteca = await listarBiblioteca();
  if (id !== "novo") {
    const t = await getTreinoComExercicios(id);
    if (!t || t.aluno_id !== sessao.alunoId || t.autoria !== "proprio" || !t.ativo) notFound();
    const porNome = new Map(biblioteca.map((i) => [i.nome, i.id]));
    inicial = {
      id: t.id,
      nome: t.nome,
      exercicios: t.exercicios
        .map((e) => ({ id: e.id, biblioteca_id: e.biblioteca_id ?? porNome.get(e.nome) ?? "", series: e.series, reps: e.reps, descanso_seg: e.descanso_seg ?? 90 }))
        .filter((e) => e.biblioteca_id),
    };
  }
  const perfil = await perfilVisitante(sessao.alunoId).catch(() => null);
  const itens: ItemLeve[] = biblioteca.map((i) => ({ id: i.id, nome: i.nome, grupo: i.grupo, sinonimos: i.sinonimos, equipamento: i.equipamento, video: Boolean(i.midia?.verificada) }));
  return <MontadorVisitante itens={itens} inicial={inicial} iniciante={perfil?.experiencia === "iniciante"} />;
}
