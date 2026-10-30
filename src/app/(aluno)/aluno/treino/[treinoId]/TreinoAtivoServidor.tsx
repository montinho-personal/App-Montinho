// Carrega tudo o que a tela de treino precisa para UM aluno. Usado pelo app do
// aluno (identidade da sessão) e pelo modo aula presencial do personal
// (aluno validado por requireTreinadorPage + vínculo do treino).
import { FEATURES } from "@/lib/env";
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
import { dadosAlcance, progressoesRecentes } from "@/lib/data/conquistas";
import { getAluno } from "@/lib/db";
import { dadosConfianca } from "@/lib/data/confianca";
import { ehFichaNova } from "@/lib/chalala/confianca";
import { ehExtraGerado } from "@/lib/data/extra-gerado";
import { campanhaDoVisitante } from "@/lib/data/campanhas";
import { linkOferta } from "@/lib/visitante/campanhas";
import { BRAND } from "@/config/brand";
import { getPadraoCarga } from "@/lib/data/padrao-carga";
import { contextoPulsoAluno } from "@/lib/data/pulso";


export async function TreinoAtivoServidor({ alunoId, nomeAluno, treinoId, sessaoId, extraId, rec, tempo, presencial = null, visitante = null, indicacao = null }: {
  alunoId: string;
  nomeAluno: string;
  treinoId: string;
  sessaoId?: string;
  extraId?: string;
  rec?: string;
  tempo?: string;
  presencial?: Presencial | null;
  /** Visitante (Modo Visitante): campanhas no fim do treino. */
  visitante?: { acessoFim: string | null } | null;
  /** Aluno: incentivo da indicação premiada no fim do treino. */
  indicacao?: { aluno: boolean; fecharam: number } | null;
}) {
  const treinoPlano = await getTreinoComExercicios(treinoId);
  // Checagem explícita de vínculo: o treino precisa pertencer ao aluno logado (além da RLS).
  if (!treinoPlano || treinoPlano.aluno_id !== alunoId) notFound();
  // Extra montado pelo app: os exercícios vêm da foto da sessão (podem ser de treinos diferentes do plano).
  const sessaoPedida = sessaoId && !presencial ? await getSessao(alunoId, sessaoId) : null;
  const gerado = ehExtraGerado(sessaoPedida) ? (sessaoPedida!.snapshot as { treino?: { nome?: string }; exercicios?: typeof treinoPlano.exercicios }) : null;
  const treino = gerado?.exercicios?.length ? { ...treinoPlano, letra: "+", nome: gerado.treino?.nome ?? "Treino extra", observacoes: null, ativo: true, exercicios: gerado.exercicios } : treinoPlano;

  // Montinho Pulso: só no app do aluno (o personal não responde no lugar dele).
  const pulsoP = presencial ? Promise.resolve(null) : contextoPulsoAluno(alunoId, "pre_treino").catch(() => null);
  const [emAndamento, ultimas, biblioteca, plano, extras, historico, configEvolucao, desbloqueia, perdidas, trocas, progressoes, conf, padraoCarga, alcance] = await Promise.all([
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
    getPadraoCarga(alunoId).catch(() => ({ anilhas: null, halteres: null })),
    // Troféus ao alcance (aviso ao começar o treino). Falhou: o treino abre sem o aviso.
    presencial ? Promise.resolve(null) : getAluno(alunoId).then((a) => (a ? dadosAlcance(a) : null)).catch(() => null),
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
      equipamento: (b?.equipamento ?? []) as string[],
      descricao: null,
    };
  });

  // Campanhas do visitante (0068), mostradas na tela de fim de treino.
  const camp = visitante && !presencial ? await campanhaDoVisitante(alunoId, visitante.acessoFim).catch(() => null) : null;
  const campanha = camp ? { ...camp, ofertaHref: camp.oferta && BRAND.contact.whatsapp ? linkOferta(camp.oferta, BRAND.contact.whatsapp) : null } : null;

  const pulso = await pulsoP;
  // Prévia do montador: nunca mostra nem continua treino de verdade (só a tela de abertura).
  const real = presencial?.previa ? null : emAndamento;
  const sessaoAtiva = real && real.treino_id === treino.id && real.status === "em_andamento" ? real : null;
  const outraSessao = real && real.treino_id !== treino.id && real.status === "em_andamento" ? real : null;

  return (
    <TreinoAtivoClient
      treino={{ id: treino.id, letra: treino.letra, nome: treino.nome, observacoes: treino.observacoes, tempos: ((treino.tempos_efetivos ?? treino.tempos ?? {}) as Partial<ParametrosTempo>), ...(FEATURES.multimodalidade && treino.modalidade && treino.modalidade !== "musculacao" ? { blocos: treino.blocos ?? [] } : {}) }}
      agoraServidor={agoraServidorMs()}
      exercicios={exercicios}
      ultimas={ultimas}
      perdidas={perdidas}
      trocas={trocas}
      ultimasTroca={ultimasTroca}
      sessaoInicial={sessaoAtiva}
      outraSessao={outraSessao ? { id: outraSessao.id, treinoId: outraSessao.treino_id, nome: outraSessao.nome_treino, series: outraSessao.series_concluidas ?? 0 } : null}
      sessaoConcluida={real && real.status !== "em_andamento" && sessaoId ? real : null}
      nomeAluno={nomeAluno.split(" ")[0]}
      presencial={presencial}
      versaoReduzida={{ permitida: !!plano.programa?.permite_versao_reduzida, prioridades: plano.programa?.prioridades ?? [] }}
      historico={historico}
      configEvolucao={configEvolucao}
      desbloqueia={desbloqueia ?? undefined}
      progressoesRecentes={progressoes}
      confianca={confianca}
      campanha={campanha}
      indicacao={indicacao}
      padraoCarga={padraoCarga}
      alcance={alcance}
      pulso={pulso}
      extra={extra ? { id: extra.id, titulo: extra.titulo, recuperacao: rec && ["bem", "cansado", "dor_leve", "dor_moderada", "dor", "prefiro_nao"].includes(rec) ? rec : null, tempoDisponivelMin: Number(tempo) > 0 ? Math.min(300, Number(tempo)) : null } : null}
    />
  );
}
