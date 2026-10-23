export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { FEATURES, isDemoMode } from "@/lib/env";
import { requireAlunoPage } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { getTreinoComExercicios } from "@/lib/data/programas";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { perfilVisitante } from "@/lib/data/visitantes";
import { podeRegistrar } from "@/lib/visitante/acesso";
import { MontadorVisitante, type ItemLeve, type TreinoInicial } from "./MontadorVisitante";

export const metadata = { title: "Montar treino" };

export default async function MontarTreinoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ copiar?: string }> }) {
  if (!FEATURES.modoVisitante) notFound();
  const sessao = await requireAlunoPage();
  if (!ehVisitante(sessao) && !isDemoMode()) notFound();
  if (!podeRegistrar("visitante", sessao.acessoFim ?? null)) redirect("/aluno/meus-treinos");
  const { id } = await params;
  const { copiar } = await searchParams;

  // Editar (id) ou copiar (novo?copiar=<id>) um treino próprio e ativo.
  const origemId = id !== "novo" ? id : copiar && /^[\w-]{1,64}$/.test(copiar) ? copiar : null;
  let inicial: TreinoInicial | null = null;
  const biblioteca = await listarBiblioteca();
  if (origemId) {
    const t = await getTreinoComExercicios(origemId);
    if (!t || t.aluno_id !== sessao.alunoId || t.autoria !== "proprio" || !t.ativo) notFound();
    const porNome = new Map(biblioteca.map((i) => [i.nome, i.id]));
    const ehCopia = id === "novo";
    inicial = {
      id: ehCopia ? null : t.id,
      nome: ehCopia ? `${t.nome} (cópia)`.slice(0, 60) : t.nome,
      exercicios: t.exercicios.map((e) => {
        const bib = e.biblioteca_id ?? (e.grupo_origem === "manual" ? null : porNome.get(e.nome)) ?? null;
        const carga = Number(String(e.carga_alvo ?? "").replace(",", ".").replace(/[^\d.]/g, ""));
        return { id: ehCopia ? null : e.id, biblioteca_id: bib, nome_livre: bib ? null : e.nome, series: e.series, reps: e.reps, descanso_seg: e.descanso_seg ?? 90, carga_kg: carga > 0 ? carga : null };
      }),
    };
  }
  const perfil = await perfilVisitante(sessao.alunoId).catch(() => null);
  const itens: ItemLeve[] = biblioteca.map((i) => ({ id: i.id, nome: i.nome, grupo: i.grupo, sinonimos: i.sinonimos, equipamento: i.equipamento, video: Boolean(i.midia?.verificada), midia: i.midia?.verificada ? { provider: i.midia.provider, id: i.midia.id } : null, passos: i.execucao.slice(0, 3) }));
  return <MontadorVisitante itens={itens} inicial={inicial} iniciante={perfil?.experiencia === "iniciante"} copia={id === "novo" && Boolean(inicial)} demo={isDemoMode()} />;
}
