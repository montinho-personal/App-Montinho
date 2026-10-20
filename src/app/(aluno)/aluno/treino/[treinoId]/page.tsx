import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAlunoPage } from "@/lib/auth/session";
import { getPlanoAtivo, getTreinoComExercicios } from "@/lib/data/programas";
import { listarExtras } from "@/lib/data/extras";
import { getSessao, getSessaoEmAndamento, ultimasExecucoes } from "@/lib/data/sessoes";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { normalizarNome } from "@/lib/grupos";
import { TreinoAtivoClient } from "./TreinoAtivoClient";
import { indicePorNome } from "@/lib/biblioteca/itens";
import type { VideoProvider } from "@/lib/supabase/types-extended";
import type { ParametrosTempo } from "@/lib/tempo/estimar";
import { agoraServidorMs } from "@/lib/tempo/ritmo";
import { getConfigEvolucao, historicoParaEvolucao } from "@/lib/data/evolucao";
import { normalizarTecnica } from "@/lib/evolucao/adaptar";
import { desbloqueiaParaTreino } from "@/lib/data/desbloqueia";

type PageProps = { params: Promise<{ treinoId: string }>; searchParams: Promise<{ sessao?: string; extra?: string; rec?: string; tempo?: string }> };

export const metadata = { title: "Treino" };

export default async function TreinoExecucaoPage({ params, searchParams }: PageProps) {
  const sessao = await requireAlunoPage();
  const { treinoId } = await params;
  const { sessao: sessaoId, extra: extraId, rec, tempo } = await searchParams;

  const treino = await getTreinoComExercicios(treinoId);
  // Checagem explícita de vínculo: o treino precisa pertencer ao aluno logado (além da RLS).
  if (!treino || treino.aluno_id !== sessao.alunoId) notFound();

  const [emAndamento, ultimas, biblioteca, plano, extras, historico, configEvolucao, desbloqueia] = await Promise.all([
    sessaoId ? getSessao(sessao.alunoId, sessaoId) : getSessaoEmAndamento(sessao.alunoId),
    ultimasExecucoes(sessao.alunoId, treino.exercicios.map((e) => ({ id: e.id, nome: e.nome }))),
    listarBiblioteca(),
    getPlanoAtivo(sessao.alunoId),
    extraId ? listarExtras(sessao.alunoId, true) : Promise.resolve([]),
    historicoParaEvolucao(sessao.alunoId, treino.exercicios.map((e) => ({ id: e.id, exercicioId: e.id, bibliotecaId: e.biblioteca_id ?? null, nome: e.nome, tecnica: normalizarTecnica(e.tecnica) }))),
    getConfigEvolucao(sessao.alunoId),
    desbloqueiaParaTreino(sessao.alunoId, treino.exercicios.map((e) => e.id)),
  ]);
  // Extra: a liberação é conferida de novo no servidor ao começar.
  const extra = extras.find((x) => x.id === extraId && x.treino_id === treino.id) ?? null;

  if (!treino.ativo && !emAndamento) {
    return (
      <div className="space-y-4">
        <Link href="/aluno/treinar" className="alvo text-fg-muted text-sm hover:text-fg">
          ← Voltar
        </Link>
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-fg-muted">Este treino não está mais liberado. Veja seus treinos atuais em “Treinar”.</div>
      </div>
    );
  }

  // O aluno vê só o necessário: até 3 orientações curtas e vídeo VERIFICADO pelo treinador.
  const porId = new Map(biblioteca.map((b) => [b.id, b]));
  const porNome = indicePorNome(biblioteca);
  const exercicios = treino.exercicios.map((e) => {
    const b = (e.biblioteca_id ? porId.get(e.biblioteca_id) : undefined) ?? porNome.get(normalizarNome(e.nome));
    return {
      ...e,
      video: b?.midia?.verificada ? { provider: b.midia.provider as VideoProvider, id: b.midia.id } : null,
      instrucoes: (b?.execucao ?? []).slice(0, 3),
      descricao: null,
    };
  });

  const sessaoAtiva = emAndamento && emAndamento.treino_id === treino.id && emAndamento.status === "em_andamento" ? emAndamento : null;
  const outraSessao = emAndamento && emAndamento.treino_id !== treino.id && emAndamento.status === "em_andamento" ? emAndamento : null;

  return (
    <TreinoAtivoClient
      treino={{ id: treino.id, letra: treino.letra, nome: treino.nome, observacoes: treino.observacoes, tempos: ((treino.tempos_efetivos ?? treino.tempos ?? {}) as Partial<ParametrosTempo>) }}
      agoraServidor={agoraServidorMs()}
      exercicios={exercicios}
      ultimas={ultimas}
      sessaoInicial={sessaoAtiva}
      outraSessao={outraSessao ? { id: outraSessao.id, treinoId: outraSessao.treino_id, nome: outraSessao.nome_treino } : null}
      sessaoConcluida={emAndamento && emAndamento.status !== "em_andamento" && sessaoId ? emAndamento : null}
      nomeAluno={sessao.nome.split(" ")[0]}
      versaoReduzida={{ permitida: !!plano.programa?.permite_versao_reduzida, prioridades: plano.programa?.prioridades ?? [] }}
      historico={historico}
      configEvolucao={configEvolucao}
      desbloqueia={desbloqueia}
      extra={extra ? { id: extra.id, titulo: extra.titulo, recuperacao: rec && ["bem", "cansado", "dor", "prefiro_nao"].includes(rec) ? rec : null, tempoDisponivelMin: Number(tempo) > 0 ? Math.min(300, Number(tempo)) : null } : null}
    />
  );
}
