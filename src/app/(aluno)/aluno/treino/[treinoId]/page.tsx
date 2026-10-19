import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAlunoPage } from "@/lib/auth/session";
import { getTreinoComExercicios } from "@/lib/data/programas";
import { getSessao, getSessaoEmAndamento, ultimasExecucoes } from "@/lib/data/sessoes";
import { listBiblioteca } from "@/lib/db";
import { normalizarNome } from "@/lib/grupos";
import { TreinoAtivoClient } from "./TreinoAtivoClient";
import type { ExercicioBiblioteca } from "@/lib/supabase/types-extended";

type PageProps = { params: Promise<{ treinoId: string }>; searchParams: Promise<{ sessao?: string }> };

export const metadata = { title: "Treino" };

export default async function TreinoExecucaoPage({ params, searchParams }: PageProps) {
  const sessao = await requireAlunoPage();
  const { treinoId } = await params;
  const { sessao: sessaoId } = await searchParams;

  const treino = await getTreinoComExercicios(treinoId);
  // Checagem explícita de vínculo: o treino precisa pertencer ao aluno logado (além da RLS).
  if (!treino || treino.aluno_id !== sessao.alunoId) notFound();

  const [emAndamento, ultimas, biblioteca] = await Promise.all([
    sessaoId ? getSessao(sessao.alunoId, sessaoId) : getSessaoEmAndamento(sessao.alunoId),
    ultimasExecucoes(sessao.alunoId, treino.exercicios.map((e) => ({ id: e.id, nome: e.nome }))),
    listBiblioteca(),
  ]);

  if (!treino.ativo && !emAndamento) {
    return (
      <div className="space-y-4">
        <Link href="/aluno/treinar" className="text-fg-muted text-sm hover:text-fg">
          ← Voltar
        </Link>
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-fg-muted">Este treino não está mais liberado. Veja seus treinos atuais em “Treinar”.</div>
      </div>
    );
  }

  const bib = new Map((biblioteca as ExercicioBiblioteca[]).map((b) => [normalizarNome(b.nome), b]));
  const exercicios = treino.exercicios.map((e) => {
    const b = bib.get(normalizarNome(e.nome));
    return {
      ...e,
      video: b?.video_provider && b?.video_id ? { provider: b.video_provider, id: b.video_id } : null,
      instrucoes: b?.instrucoes ?? [],
      descricao: b?.descricao ?? null,
    };
  });

  const sessaoAtiva = emAndamento && emAndamento.treino_id === treino.id && emAndamento.status === "em_andamento" ? emAndamento : null;
  const outraSessao = emAndamento && emAndamento.treino_id !== treino.id && emAndamento.status === "em_andamento" ? emAndamento : null;

  return (
    <TreinoAtivoClient
      treino={{ id: treino.id, letra: treino.letra, nome: treino.nome, observacoes: treino.observacoes }}
      exercicios={exercicios}
      ultimas={ultimas}
      sessaoInicial={sessaoAtiva}
      outraSessao={outraSessao ? { id: outraSessao.id, treinoId: outraSessao.treino_id, nome: outraSessao.nome_treino } : null}
      sessaoConcluida={emAndamento && emAndamento.status !== "em_andamento" && sessaoId ? emAndamento : null}
    />
  );
}
