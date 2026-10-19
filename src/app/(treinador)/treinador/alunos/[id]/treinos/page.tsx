import { notFound } from "next/navigation";
import { requireTreinadorPage } from "@/lib/auth/session";
import { getAluno, listBiblioteca, getAnamnese } from "@/lib/db";
import { getPlanoAtivo, listTreinosFinalizados } from "@/lib/data/programas";
import { listCorrecoes } from "@/lib/data/acompanhamento";
import { listSessoes } from "@/lib/data/sessoes";
import { periodoDias, seriesRealizadasPorGrupo } from "@/lib/relatorios/calcular";
import { volumeRealizadoPorGrupo } from "@/lib/volume/calcular";
import { MontadorClient } from "./MontadorClient";
import type { ExercicioBiblioteca } from "@/lib/supabase/types-extended";
import type { Anamnese } from "@/lib/supabase/types-extended";

type PageProps = { params: Promise<{ id: string }> };

export const metadata = { title: "Montador de treinos" };

export default async function MontadorPage({ params }: PageProps) {
  await requireTreinadorPage();
  const { id } = await params;
  const [aluno, plano, finalizados, biblioteca, anamnese, correcoes, sessoes] = await Promise.all([
    getAluno(id),
    getPlanoAtivo(id),
    listTreinosFinalizados(id),
    listBiblioteca(),
    getAnamnese(id),
    listCorrecoes(),
    listSessoes(id, { limite: 120 }),
  ]);
  if (!aluno) notFound();

  const p28 = periodoDias(28);
  const realizadoBruto = volumeRealizadoPorGrupo(seriesRealizadasPorGrupo(sessoes, p28));
  const realizadoSemanal = Object.fromEntries(Object.entries(realizadoBruto).map(([g, v]) => [g, Math.round(((v ?? 0) / 4) * 10) / 10]));

  return (
    <MontadorClient
      alunoId={id}
      alunoNome={aluno.profile?.nome ?? "Aluno"}
      programa={plano.programa}
      treinosIniciais={plano.treinos}
      finalizados={finalizados.map((t) => ({ id: t.id, letra: t.letra, nome: t.nome, exercicios: t.exercicios.length }))}
      biblioteca={(biblioteca as ExercicioBiblioteca[]).map((b) => ({ id: b.id, nome: b.nome, grupo_muscular: b.grupo_muscular, grupos_secundarios: b.grupos_secundarios ?? [], sinonimos: b.sinonimos ?? [], equipamento: b.equipamento ?? [] }))}
      correcoes={[...correcoes.entries()].map(([nome, v]) => ({ nome, grupo: v.grupo, secundarios: v.secundarios }))}
      anamnese={(anamnese as Anamnese | null) ?? null}
      realizadoSemanal={realizadoSemanal}
    />
  );
}
