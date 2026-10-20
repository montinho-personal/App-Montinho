import { notFound } from "next/navigation";
import { requireTreinadorPage } from "@/lib/auth/session";
import { getAluno, getAnamnese } from "@/lib/db";
import { listarBiblioteca, listarEquivalencias, listarFavoritos, usoDosExercicios } from "@/lib/data/biblioteca";
import { lerTemposTreinador } from "@/lib/data/preferencias";
import { getPlanoAtivo, listTreinosFinalizados } from "@/lib/data/programas";
import { listCorrecoes } from "@/lib/data/acompanhamento";
import { listSessoes } from "@/lib/data/sessoes";
import { periodoDias, seriesRealizadasPorGrupo } from "@/lib/relatorios/calcular";
import { volumeRealizadoPorGrupo } from "@/lib/volume/calcular";
import { MontadorClient } from "./MontadorClient";
import { porquesDosExercicios } from "@/lib/data/desbloqueia";
import { estrategiaVigente } from "@/lib/data/estrategias";
import { diasDaEstrategia, focoDoDia } from "@/lib/estrategia/divisao";
import type { Anamnese } from "@/lib/supabase/types-extended";

type PageProps = { params: Promise<{ id: string }> };

export const metadata = { title: "Montador de treinos" };

export default async function MontadorPage({ params }: PageProps) {
  const sessao = await requireTreinadorPage();
  const { id } = await params;
  const [aluno, plano, finalizados, biblioteca, anamnese, correcoes, sessoes, equivalencias, favoritos, temposTreinador] = await Promise.all([
    getAluno(id),
    getPlanoAtivo(id),
    listTreinosFinalizados(id),
    listarBiblioteca(),
    getAnamnese(id),
    listCorrecoes(),
    listSessoes(id, { limite: 120 }),
    listarEquivalencias(),
    listarFavoritos(sessao.userId),
    lerTemposTreinador(sessao.userId),
  ]);
  const [uso, estrategia, porques] = await Promise.all([usoDosExercicios(biblioteca), estrategiaVigente(id), porquesDosExercicios(plano.treinos.flatMap((t) => t.exercicios.map((e) => e.id)))]);
  const focoEstrategia = estrategia ? Object.fromEntries(diasDaEstrategia(estrategia.dados).map((d) => [d.letra, focoDoDia(d)])) : {};
  if (!aluno) notFound();

  const p28 = periodoDias(28);
  const realizadoBruto = volumeRealizadoPorGrupo(seriesRealizadasPorGrupo(sessoes, p28));
  const realizadoSemanal = Object.fromEntries(Object.entries(realizadoBruto).map(([g, v]) => [g, Math.round(((v ?? 0) / 4) * 10) / 10]));

  return (
    <MontadorClient
      temposTreinador={temposTreinador}
      alunoId={id}
      alunoNome={aluno.profile?.nome ?? "Aluno"}
      programa={plano.programa}
      treinosIniciais={plano.treinos}
      finalizados={finalizados.map((t) => ({ id: t.id, letra: t.letra, nome: t.nome, exercicios: t.exercicios.length }))}
      biblioteca={biblioteca.map((b) => ({ id: b.id, nome: b.nome, grupo_muscular: b.grupo, grupos_secundarios: b.secundarios, sinonimos: b.sinonimos, equipamento: b.equipamento }))}
      itensBiblioteca={biblioteca}
      equivalencias={equivalencias}
      favoritos={favoritos}
      usoExercicios={uso}
      correcoes={[...correcoes.entries()].map(([nome, v]) => ({ nome, grupo: v.grupo, secundarios: v.secundarios }))}
      anamnese={(anamnese as Anamnese | null) ?? null}
      realizadoSemanal={realizadoSemanal}
      focoEstrategia={focoEstrategia}
      porques={porques}
    />
  );
}
