// Carrega tudo o que a tela de treino precisa para UM aluno. Usado pelo app do
// aluno (identidade da sessão) e pelo modo aula presencial do personal
// (aluno validado por requireTreinadorPage + vínculo do treino).
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlanoAtivo, getTreinoComExercicios } from "@/lib/data/programas";
import { listarExtras } from "@/lib/data/extras";
import { getSessao, getSessaoEmAndamento, seriesPerdidasRecentes, ultimasExecucoes } from "@/lib/data/sessoes";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { normalizarNome } from "@/lib/grupos";
import { TreinoAtivoClient, type Presencial } from "./TreinoAtivoClient";
import { indicePorNome } from "@/lib/biblioteca/itens";
import type { VideoProvider } from "@/lib/supabase/types-extended";
import type { ParametrosTempo } from "@/lib/tempo/estimar";
import { agoraServidorMs } from "@/lib/tempo/ritmo";
import { getConfigEvolucao, historicoParaEvolucao } from "@/lib/data/evolucao";
import { normalizarTecnica } from "@/lib/evolucao/adaptar";
import { desbloqueiaParaTreino } from "@/lib/data/desbloqueia";
import { trocasParaExercicios } from "@/lib/data/trocas";
import { progressoesRecentes } from "@/lib/data/conquistas";
import { dadosConfianca } from "@/lib/data/confianca";
import { ehFichaNova } from "@/lib/chalala/confianca";
import { ehExtraGerado } from "@/lib/data/extra-gerado";


export async function TreinoAtivoServidor({ alunoId, nomeAluno, treinoId, sessaoId, extraId, rec, tempo, presencial = null }: {
  alunoId: string;
  nomeAluno: string;
  treinoId: string;
  sessaoId?: string;
  extraId?: string;
  rec?: string;
  tempo?: string;
  presencial?: Presencial | null;
}) {
  const treinoPlano = await getTreinoComExercicios(treinoId);
  // Checagem explícita de vínculo: o treino precisa pertencer ao aluno logado (além da RLS).
  if (!treinoPlano || treinoPlano.aluno_id !== alunoId) notFound();
  // Extra montado pelo app: os exercícios vêm da foto da sessão (podem ser de treinos diferentes do plano).
  const sessaoPedida = sessaoId && !presencial ? await getSessao(alunoId, sessaoId) : null;
  const gerado = ehExtraGerado(sessaoPedida) ? (sessaoPedida!.snapshot as { treino?: { nome?: string }; exercicios?: typeof treinoPlano.exercicios }) : null;
  const treino = gerado?.exercicios?.length ? { ...treinoPlano, letra: "+", nome: gerado.treino?.nome ?? "Treino extra", observacoes: null, ativo: true, exercicios: gerado.exercicios } : treinoPlano;

  const [emAndamento, ultimas, biblioteca, plano, extras, historico, configEvolucao, desbloqueia, perdidas, trocas, progressoes, conf] = await Promise.all([
    sessaoPedida ? Promise.resolve(sessaoPedida) : sessaoId ? getSessao(alunoId, sessaoId) : getSessaoEmAndamento(alunoId),
    ultimasExecucoes(alunoId, treino.exercicios.map((e) => ({ id: e.id, nome: e.nome, biblioteca_id: e.biblioteca_id ?? null }))),
    listarBiblioteca(),
    getPlanoAtivo(alunoId),
    extraId && !presencial ? listarExtras(alunoId, true) : Promise.resolve([]),
    historicoParaEvolucao(alunoId, treino.exercicios.map((e) => ({ id: e.id, exercicioId: e.id, bibliotecaId: e.biblioteca_id ?? null, nome: e.nome, tecnica: normalizarTecnica(e.tecnica) }))),
    getConfigEvolucao(alunoId),
    presencial ? Promise.resolve(null) : desbloqueiaParaTreino(alunoId, treino.exercicios.map((e) => e.id)),
    seriesPerdidasRecentes(alunoId, treino.exercicios.map((e) => ({ id: e.id, nome: e.nome, grupo: e.grupo_muscular ?? null }))),
    trocasParaExercicios(alunoId, treino.exercicios.map((e) => ({ id: e.id, nome: e.nome, biblioteca_id: e.biblioteca_id ?? null }))),
    presencial ? Promise.resolve([]) : progressoesRecentes(alunoId).catch(() => []),
    presencial ? Promise.resolve(null) : dadosConfianca(alunoId).catch(() => null),
  ]);
  const agora = new Date(agoraServidorMs());
  const confianca = conf
    ? {
        concluidas: conf.concluidas,
        diasDesdeUltimo: conf.ultimaConcluida ? Math.floor((agora.getTime() - new Date(conf.ultimaConcluida).getTime()) / 86_400_000) : null,
        fichaNova: ehFichaNova({ publicadaEm: conf.publicadaEm, ultimaConcluida: conf.ultimaConcluida, agora }),
      }
    : null;
  // Última vez de cada opção de troca (para já vir com peso e repetições).
  const opcoesTroca = [...new Map(Object.values(trocas).flatMap((t) => t.opcoes).map((o) => [o.id, o])).values()];
  const ultimasTroca = opcoesTroca.length ? await ultimasExecucoes(alunoId, opcoesTroca.map((o) => ({ id: o.id, nome: o.nome }))) : {};
  // Extra: a liberação é conferida de novo no servidor ao começar.
  const extra = extras.find((x) => x.id === extraId && x.treino_id === treino.id) ?? null;

  if (!treino.ativo && !emAndamento) {
    return (
      <div className="space-y-4">
        <Link href={presencial ? presencial.voltarHref : "/aluno/treinar"} className="alvo text-fg-muted text-sm hover:text-fg">
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
      grupo_muscular: e.grupo_muscular ?? b?.grupo ?? null,
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
      perdidas={perdidas}
      trocas={trocas}
      ultimasTroca={ultimasTroca}
      sessaoInicial={sessaoAtiva}
      outraSessao={outraSessao ? { id: outraSessao.id, treinoId: outraSessao.treino_id, nome: outraSessao.nome_treino } : null}
      sessaoConcluida={emAndamento && emAndamento.status !== "em_andamento" && sessaoId ? emAndamento : null}
      nomeAluno={nomeAluno.split(" ")[0]}
      presencial={presencial}
      versaoReduzida={{ permitida: !!plano.programa?.permite_versao_reduzida, prioridades: plano.programa?.prioridades ?? [] }}
      historico={historico}
      configEvolucao={configEvolucao}
      desbloqueia={desbloqueia ?? undefined}
      progressoesRecentes={progressoes}
      confianca={confianca}
      extra={extra ? { id: extra.id, titulo: extra.titulo, recuperacao: rec && ["bem", "cansado", "dor", "prefiro_nao"].includes(rec) ? rec : null, tempoDisponivelMin: Number(tempo) > 0 ? Math.min(300, Number(tempo)) : null } : null}
    />
  );
}
