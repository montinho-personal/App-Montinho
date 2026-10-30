import { saudacao as saudacaoSP } from "@/components/brand/BrandLockup";
import { SincronizarCardios } from "@/components/strava/SincronizarCardios";
import { CODIGOS_MANUAIS, LENDARIAS } from "@/lib/conquistas/regras";
import { CelebrarAtivadas } from "@/components/conquistas/CelebrarAtivadas";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { requireAlunoPage } from "@/lib/auth/session";
import { getAluno, listDieta } from "@/lib/db";
import { contextoPulsoAluno } from "@/lib/data/pulso";
import { PulsoCard } from "@/components/pulso/PulsoCard";
import { CancelarTreino } from "@/components/treinos/CancelarTreino";
import { getPlanoAtivo } from "@/lib/data/programas";
import { placarDoAluno } from "@/lib/data/livre-metas";
import { LivreMetasCard } from "@/components/livre-metas/LivreMetasCard";
import { FacaOQueQuiser } from "@/components/livre-metas/FacaOQueQuiser";
import { minhaIndicacao } from "@/lib/data/indicacao";
import { DescontoIndicacao } from "@/components/indicacao/DescontoIndicacao";
import { IncentivoIndicacao } from "@/components/indicacao/IncentivoIndicacao";
import { getSessaoEmAndamento, listSessoes } from "@/lib/data/sessoes";
import { listIntervencoes } from "@/lib/data/acompanhamento";
import { estadoSemana, resumoPeriodo } from "@/lib/relatorios/calcular";
import { dataBR, tempoRelativo } from "@/lib/format";
import { BRAND } from "@/config/brand";
import { aderenciaDoAluno } from "@/lib/data/aderencia";
import { ProgressoSemana } from "@/components/aderencia/ProgressoSemana";
import { acoesAlcance, listarConquistas, listarReconhecimentos, totalQuizPublicado } from "@/lib/data/conquistas";
import { proximaMedalha, vitrineDeMedalhas } from "@/lib/conquistas/vitrine";
import { sessaoParaConquista } from "@/lib/conquistas/mapear";
import { MedalhaIcone } from "@/components/conquistas/MedalhaIcone";
import { getConfigExtra } from "@/lib/data/extras";
import { estrategiaVigente } from "@/lib/data/estrategias";
import { faseAtual, inicioDasFases } from "@/lib/estrategia/fases";
import { dataLocal, somarDias } from "@/lib/aderencia/calcular";
import { SuaEstrategiaCard } from "@/components/estrategia/SuaEstrategiaCard";
import { listarHistoricoResumo } from "@/lib/data/historico";
import { cargasEmAlta } from "@/lib/relatorios/cargas-em-alta";
import { SemanasBarras } from "@/components/graficos/SemanasBarras";
import { CargasEmAltaLista } from "@/components/graficos/CargasEmAltaLista";
import { vitoriasDoAluno } from "@/lib/data/evolucao";
import { VITORIA_NEUTRA } from "@/lib/evolucao/vitoria";
import { albumParaAluno } from "@/lib/data/desbloqueia";
import { candidatasAnuncio, progressoAlbum } from "@/lib/desbloqueia/motor";
import { paraVisao } from "@/components/desbloqueia/visao";
import { AnuncioDescoberta } from "@/components/desbloqueia/AnuncioDescoberta";
import { redirect } from "next/navigation";
import { FEATURES } from "@/lib/env";
import { ehVisitante } from "@/lib/auth/guards";
import { perfilVisitante } from "@/lib/data/visitantes";
import { podeRegistrar } from "@/lib/visitante/acesso";
import { DesafioDoVisitante } from "@/components/visitante/DesafioDoVisitante";
import { CtaVisitante } from "@/components/visitante/CtaVisitante";
import { OfertaPlano } from "@/components/ofertas/OfertaPlano";
import { PedirWhatsapp } from "@/components/visitante/PedirWhatsapp";
import { ComeceAquiSite } from "@/components/visitante/ComeceAquiSite";
import { ConhecaOMontinho } from "@/components/montinho/ConhecaOMontinho";
import { GuardarTreinosOffline } from "@/components/offline/GuardarTreinosOffline";
import { campanhaDoVisitante } from "@/lib/data/campanhas";
import { conviteLiberado, linkOferta } from "@/lib/visitante/campanhas";
import { ConviteAmigo } from "@/components/visitante/ConviteAmigo";
import { OfertaVisitante } from "@/components/visitante/OfertaVisitante";
import { estadoDoAcesso } from "@/lib/visitante/acesso";
import { EntradaDesafios } from "@/components/desafios/EntradaDesafios";
import { listarMeusDesafios, minhasCutucadas, recadosDosDesafios } from "@/lib/data/desafios";
import { hrefDaSessao } from "@/lib/treino/livre";
import { cardioDoAluno, progressoCardio } from "@/lib/data/cardio";
import { trofeusNosProximosDias } from "@/lib/conquistas/ao-alcance";
import { tecnicasFeitas } from "@/lib/conquistas/regras";
import { TrofeusHojeEProximos } from "@/components/conquistas/TrofeusAoAlcance";
import { pendentesHoje } from "@/lib/cardio/regras";
import { CardioHoje } from "@/components/cardio/CardioHoje";
import { DiaConcluido } from "@/components/inicio/DiaConcluido";
import { RevisarConhecimento } from "@/components/desbloqueia/RevisarConhecimento";
import { MobilidadeHoje } from "@/components/mobilidade/MobilidadeHoje";
import { FeriadoDestaque } from "@/components/inicio/FeriadoDestaque";
import { MissaoDeHoje } from "@/components/inicio/MissaoDeHoje";
import { missaoDeHoje } from "@/lib/inicio/missao";
import { ehDeHoje } from "@/lib/conquistas/ao-alcance";
import { destaqueFeriado } from "@/lib/conquistas/feriados";
import { mobilidadeIndicada } from "@/lib/data/mobilidade-indicada";
import { resumoRevisao } from "@/lib/desbloqueia/revisao";
import { estadoDoDia, fraseDoDia } from "@/lib/inicio/dia";
import { contaCarimbo } from "@/lib/conquistas/carimbos";
import { carimbosDe } from "@/lib/data/ranking";
import { LIMITES_CARDIO } from "@/lib/cardio/regras";
import { SemanaCardioCard } from "@/components/cardio/SemanaCardioCard";
import { telaDaTribo } from "@/lib/data/tribo";
import { mensagensDaTribo } from "@/lib/tribo/regras";
import { CelebrarTribo } from "@/components/tribo/CelebrarTribo";

export const metadata = { title: "Início" };

export default async function AlunoHomePage() {
  const sessao = await requireAlunoPage();
  const alunoId = sessao.alunoId;
  // Visitante novo: primeiro o questionário de boas-vindas.
  if (FEATURES.modoVisitante && ehVisitante(sessao) && sessao.mode === "live") {
    const perfil = await perfilVisitante(alunoId).catch(() => null);
    if (!perfil?.onboarding_concluido_em) redirect("/aluno/boas-vindas");
  }
  const [aluno, plano, emAndamento, sessoes, intervencoes, pulsoInicio, dieta, reconhecimentos, configExtra, estrategia, conquistas, historicoResumo] = await Promise.all([
    getAluno(alunoId),
    getPlanoAtivo(alunoId),
    getSessaoEmAndamento(alunoId),
    listSessoes(alunoId, { limite: 400 }), // mesmo alcance das Conquistas (auditoria 29/10/2026)
    listIntervencoes(alunoId, 3),
    contextoPulsoAluno(alunoId, "inicio").catch(() => null),
    listDieta(alunoId),
    listarReconhecimentos(alunoId, 1),
    getConfigExtra(alunoId),
    estrategiaVigente(alunoId),
    listarConquistas(alunoId),
    listarHistoricoResumo(alunoId),
  ]);
  if (!aluno) return null;
  const [aderencia, { atual: vitoria }, album] = await Promise.all([aderenciaDoAluno(aluno), vitoriasDoAluno(aluno, 0), albumParaAluno(aluno, conquistas)]);
  // Montinho Cardio: só aparece aqui para quem tem cardio prescrito.
  const cardio = await cardioDoAluno(alunoId, aderencia.semanas.filter((w) => w.pausada).map((w) => w.inicio)).catch(() => null);
  const cardioPendentes = cardio ? pendentesHoje(cardio.prescricoes, cardio.feitos, dataLocal(new Date())) : [];
  const albumResumo = progressoAlbum(album.itens);
  const medalhas = vitrineDeMedalhas({ conquistas, sessoes: sessoes.map(sessaoParaConquista), aderencia, hoje: dataLocal(new Date()), cardio: cardio ? { feitos: cardio.marco.feitos, temPrescricao: cardio.prescricoes.length > 0, prescricaoLonga: cardio.prescricoes.some((p) => p.duracao_min >= 60) } : null, extras: { quizTotal: await totalQuizPublicado() } });
  const proximaMed = proximaMedalha(medalhas);
  const codigosMedalha = new Set<string>(medalhas.map((m) => m.codigo));
  const recenteIso = somarDias(dataLocal(new Date()), -7);
  // Troféus que dá para ganhar hoje e nos próximos dias (treino, cardio, compartilhar, indicar, desafios…).
  const [progressoCardioAluno, acoes, mobIndicada] = await Promise.all([progressoCardio(alunoId).catch(() => null), acoesAlcance(sessao).catch(() => null), mobilidadeIndicada(alunoId).catch(() => null)]);
  const aoAlcance = trofeusNosProximosDias({ medalhas, aderencia, hoje: dataLocal(new Date()), cardio: progressoCardioAluno, acoes, tecnicasFeitas: new Set(tecnicasFeitas(sessoes.map(sessaoParaConquista)).map((t) => t.familia)), treinos: plano.treinos.filter((t) => t.ativo).map((t) => ({ letra: t.letra, exercicios: t.exercicios })) });
  const ganhas = medalhas.filter((m) => m.conquistada).length;

  const primeiroNome = (aluno.profile?.nome ?? sessao.nome).split(" ")[0];
  // Dia ainda sem exercícios (ex.: plano criado pela estratégia) não aparece para o aluno.
  const treinos = plano.treinos.filter((t) => t.ativo && (t.exercicios.length > 0 || (FEATURES.multimodalidade && (t.blocos?.length ?? 0) > 0)));
  const letras = treinos.map((t) => t.letra);
  const semana = estadoSemana(sessoes, plano.programa?.frequencia, letras);
  const proximo = treinos.find((t) => t.letra === semana.proximaLetra) ?? treinos[0] ?? null;
  const resumo30 = resumoPeriodo(sessoes, plano.programa?.frequencia, 30, new Date(), aderencia);
  // Horário de São Paulo (o servidor roda em UTC).
  const saudacao = saudacaoSP();
  const duracaoEstimada = proximo?.duracao_estimada_min ?? estimarDuracao(sessoes, proximo?.letra ?? null);
  const emAlta = cargasEmAlta(sessoes, historicoResumo, 2);
  const visiveis = intervencoes.filter((i) => i.visivel_aluno);
  // Campanhas do visitante (0068): oferta do fim do acesso e convite de amigo, em destaque.
  const campanha = FEATURES.modoVisitante && ehVisitante(sessao) ? await campanhaDoVisitante(alunoId, sessao.acessoFim ?? null).catch(() => null) : null;
  const ofertaHref = campanha?.oferta && BRAND.contact.whatsapp ? linkOferta(campanha.oferta, BRAND.contact.whatsapp) : null;
  const mostrarConvite = Boolean(campanha && conviteLiberado(campanha.treinosConcluidos, campanha.indicacao));
  // Convites para desafio entre amigos esperando resposta (0094).
  const [desafios, cutucadas] = await Promise.all([listarMeusDesafios(alunoId).catch(() => []), minhasCutucadas(alunoId).catch(() => [])]);
  const recadosDesafio = await recadosDosDesafios(alunoId, desafios).catch(() => []);
  // Protocolo livre (por metas) (0100): o cartão substitui o “próximo treino” das fichas.
  const placarSemana = emAndamento ? null : await placarDoAluno(alunoId, null, { qualquerPlano: true }).catch(() => null);
  const livreMetas = placarSemana?.origem === "livre_metas" ? placarSemana : null;
  // Indicação premiada (0102): desconto de quem indicou amigos que fecharam.
  const indicacao = sessao.comoPersonal ? null : await minhaIndicacao(alunoId).catch(() => null);
  // Treino de hoje já feito: o Início comemora (e destaca o cardio, se faltar).
  const hojeSP = dataLocal(new Date());
  const treinoDeHoje = sessoes.filter((s) => dataLocal(s.iniciado_em) === hojeSP && contaCarimbo(s)).at(-1) ?? null;
  const cardioMinHoje = (cardio?.feitos ?? []).filter((f) => f.data === hojeSP && f.status !== "nao_realizado").reduce((a, f) => a + f.duracaoMin, 0);
  const estadoDia = emAndamento ? "a_fazer" : estadoDoDia({ treinoHoje: !!treinoDeHoje, cardioHoje: cardioPendentes.length === 0 && cardioMinHoje >= LIMITES_CARDIO.minutosMin, cardioPendente: cardioPendentes.length > 0 }) /* com cardio prescrito pendente hoje, não é “Dia completo” (auditoria 29/10/2026) */;
  const carimbos = estadoDia === "a_fazer" ? null : await carimbosDe([alunoId]).then((r) => r[alunoId] ?? 0).catch(() => sessoes.filter(contaCarimbo).length);

  const ativadas = conquistas.filter((c) => !c.vista_em && (CODIGOS_MANUAIS.includes(c.codigo) || (codigosMedalha.has(c.codigo) && c.created_at >= recenteIso))).slice(0, 6);
  // Conquistas da Tribo (0115): concede o que for devido (também o que saiu com o aluno fora do app).
  const tribo = await telaDaTribo(alunoId).catch(() => null);
  const recadoTribo = tribo?.dados ? mensagensDaTribo(tribo.dados, hojeSP).find((m) => m.includes("hoje")) ?? null : null;

  // Missão de Hoje (Fase 1): só reorganiza o que o Início já sabe; nunca inventa prescrição.
  const doisDias = somarDias(hojeSP, -2);
  const missao = proximo
    ? missaoDeHoje({
        proximo: { letra: proximo.letra, nome: proximo.nome, exercicios: proximo.exercicios.length, minutos: duracaoEstimada ?? null },
        primeiroTreino: !sessoes.some(contaCarimbo),
        diasSemTreino: semana.diasSemUltimoTreino,
        retomada: semana.retomada,
        pausada: !!aderencia.semanaAtual?.pausada,
        meta: aderencia.semanaAtual?.meta ?? null,
        pontos: aderencia.semanaAtual?.pontos ?? 0,
        desconforto: pulsoInicio?.checkinPreHoje === "desconforto" || sessoes.some((s) => s.feedback_percepcao === "dor" && dataLocal(s.iniciado_em) >= doisDias),
        linhas: [
          (() => { const t = aoAlcance.find((i) => ehDeHoje(i.quando)); return t ? `🏆 Ainda hoje: ${t.titulo}. ${t.oQueFazer}` : null; })(),
          aderencia.semanaAtual?.meta ? `🎯 Meta da semana: ${Math.min(aderencia.semanaAtual.pontos, aderencia.semanaAtual.meta).toLocaleString("pt-BR")} de ${aderencia.semanaAtual.meta} treinos` : null,
          emAlta[0] ? `📈 ${emAlta[0].nome}: ${emAlta[0].primeira.toLocaleString("pt-BR")} → ${emAlta[0].ultima.toLocaleString("pt-BR")} kg` : null,
          recadoTribo ? `🤝 ${recadoTribo}` : null,
        ],
      })
    : null;
  return (
    <div className="space-y-5">
      {/* Troféu que saiu fora de uma tela de comemoração (Strava, semana, ativado pelo personal…) e
          ainda não foi visto: comemora aqui, uma vez só (até 6 por vez; o resto na próxima). */}
      <CelebrarAtivadas conquistas={ativadas} nome={primeiroNome} />
      {/* Troféus da tribo: só quando não há outra comemoração na tela (a fila fica para a próxima visita). */}
      {!ativadas.length && tribo?.minhas.some((c) => !c.vista_em) ? <CelebrarTribo conquistas={tribo.minhas.filter((c) => !c.vista_em)} nome={primeiroNome} marcos={tribo.dados?.marcos} /> : null}
      {/* Treinos guardados no celular para abrir sem internet na academia. */}
      <GuardarTreinosOffline urls={["/aluno/treinar", ...treinos.map((t) => `/aluno/treino/${t.id}`), ...(emAndamento && emAndamento.treino_id ? [hrefDaSessao(emAndamento)] : [])]} />
      <SincronizarCardios />
      <header>
        <p className="text-xs text-fg-subtle uppercase tracking-wider">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" })}</p>
        <h1 className="text-2xl font-bold leading-tight mt-1">
          {saudacao}, <span className="text-accent">{primeiroNome}</span>
        </h1>
      </header>

      {/* Feriado: em destaque desde a véspera (troféus com o nome do feriado). */}
      {(() => {
        const fer = destaqueFeriado(hojeSP);
        return fer ? <FeriadoDestaque d={fer} conquistas={conquistas} /> : null;
      })()}

      <EntradaDesafios desafios={desafios} compacto recados={recadosDesafio} cutucadas={cutucadas} />

      {recadoTribo ? (
        <Link href="/aluno/conquistas/tribo" className="flex items-center justify-between gap-3 rounded-xl border border-success/40 bg-success/10 px-4 py-2.5 text-sm font-semibold">
          <span>🤝 {recadoTribo}</span>
          <span aria-hidden className="text-accent">→</span>
        </Link>
      ) : null}

      {/* Depois do fim do acesso, a oferta já vem no topo de todas as telas (layout). */}
      {campanha?.oferta && ofertaHref && estadoDoAcesso(sessao.acessoFim ?? null).estado !== "vencido" ? <OfertaVisitante oferta={campanha.oferta} href={ofertaHref} tela="inicio" /> : null}

      {FEATURES.modoVisitante && ehVisitante(sessao) && !aluno.telefone?.trim() ? <PedirWhatsapp /> : null}

      {/* 1. Sessão em andamento, dia concluído ou próximo treino — CTA prioritário */}
      {estadoDia !== "a_fazer" && treinoDeHoje ? (
        <DiaConcluido estado={estadoDia} nome={primeiroNome} treinoHoje={treinoDeHoje.letra ? `Treino ${treinoDeHoje.letra}${treinoDeHoje.nome_treino ? ` · ${treinoDeHoje.nome_treino}` : ""}` : (treinoDeHoje.nome_treino ?? "Treino")} cardioMinHoje={cardioMinHoje} frase={fraseDoDia(hojeSP, estadoDia === "completo" && cardioMinHoje > 0)} trofeus={ganhas} carimbos={carimbos} pendentes={cardioPendentes} extraLiberado={!!configExtra?.habilitado} valeDoseDupla={!medalhas.some((m) => m.codigo === "dose_dupla" && m.conquistada)} valeDoisFolegos={cardioMinHoje >= LIMITES_CARDIO.minutosMin && !medalhas.some((m) => m.codigo === "dois_folegos" && m.conquistada)} />
      ) : emAndamento ? (
        <Card className="border-accent/50 bg-grain-strong">
          <CardBody className="space-y-3">
            <p className="text-[11px] uppercase tracking-wider text-accent font-bold">Treino em andamento</p>
            <h2 className="text-lg font-bold leading-tight">
              {emAndamento.letra ? `Treino ${emAndamento.letra} · ` : ""}
              {emAndamento.nome_treino}
            </h2>
            <p className="text-sm text-fg-muted">
              {emAndamento.series_planejadas ? `${emAndamento.series_concluidas} de ${emAndamento.series_planejadas} séries registradas` : emAndamento.series_concluidas === 1 ? "1 série registrada" : `${emAndamento.series_concluidas} séries registradas`} · iniciado {tempoRelativo(emAndamento.iniciado_em)}
            </p>
            <Link href={hrefDaSessao(emAndamento)} className="touch inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-base font-bold text-bg hover:bg-accent-hover">
              <Icon name="play" /> Continuar treino
            </Link>
            <div className="text-center">
              <CancelarTreino sessaoId={emAndamento.id} series={emAndamento.series_concluidas ?? 0} rotulo="Começou o treino errado? Cancelar este treino" />
            </div>
          </CardBody>
        </Card>
      ) : livreMetas ? (
        <LivreMetasCard p={livreMetas} />
      ) : proximo && missao ? (
        <MissaoDeHoje
          missao={missao}
          href={`/aluno/treino/${proximo.id}`}
          letra={proximo.letra}
          detalhe={`${proximo.exercicios.length} ${proximo.exercicios.length === 1 ? "exercício" : "exercícios"}${duracaoEstimada ? ` · ~${duracaoEstimada} min` : ""}`}
          protocolo={plano.programa?.nome && plano.programa.nome !== "Programa atual" ? plano.programa.nome : null}
          verTodos={treinos.length > 1}
        >
          {missao.cta && podeRegistrar(sessao.modalidade ?? "consultoria", sessao.acessoFim ?? null) ? <FacaOQueQuiser p={placarSemana} compacto /> : null}
        </MissaoDeHoje>
      ) : (
        FEATURES.modoVisitante && ehVisitante(sessao) ? (
          // Visitante: quem monta o treino é ele mesmo.
          <Card className="border-accent/40">
            <CardBody className="text-center py-8 space-y-3">
              <Icon name="dumbbell" size={32} className="mx-auto text-accent" />
              <h2 className="font-bold">Monte o seu primeiro treino</h2>
              {podeRegistrar("visitante", sessao.acessoFim ?? null) ? (
                <>
                  <p className="text-sm text-fg-muted">Escolha os exercícios da biblioteca do {BRAND.name}, com vídeo de execução, e ajuste séries, repetições e descanso. Leva uns 2 minutos.</p>
                  <Link href="/aluno/meus-treinos/novo" className="mx-auto flex min-h-12 max-w-xs items-center justify-center gap-2 rounded-xl bg-accent px-4 font-semibold text-bg">
                    <Icon name="plus" size={18} /> Montar meu treino
                  </Link>
                </>
              ) : (
                <p className="text-sm text-fg-muted">Seu acesso terminou. Para voltar a montar treinos, fale com o {BRAND.name}.</p>
              )}
            </CardBody>
          </Card>
        ) : (
        <Card className="border-dashed">
          <CardBody className="text-center py-8 space-y-2">
            <Icon name="dumbbell" size={32} className="mx-auto text-fg-subtle" />
            <h2 className="font-bold">Ainda não há treino liberado</h2>
            <p className="text-sm text-fg-muted">O {BRAND.name} está preparando seu programa. Assim que ele for publicado, aparece aqui.</p>
            {BRAND.contact.whatsapp ? (
              <a className="inline-block text-sm text-accent underline-offset-2 hover:underline min-h-6 py-0.5" href={`https://wa.me/${BRAND.contact.whatsapp}`} target="_blank" rel="noreferrer">
                Falar com o {BRAND.name}
              </a>
            ) : null}
          </CardBody>
        </Card>
        )
      )}

      {mobIndicada ? <MobilidadeHoje dados={mobIndicada} hoje={hojeSP} trofeus={conquistas.map((c) => c.codigo as string)} compacto /> : null}
      <TrofeusHojeEProximos itens={aoAlcance} />
      {(() => {
        const r = resumoRevisao(album.progresso, new Date().toISOString(), new Set(album.itens.map((i) => i.conteudo.id)));
        return <RevisarConhecimento agora={r.agora} primeira={r.primeira} aprendidas={r.aprendidas} compacto />;
      })()}

      {FEATURES.modoVisitante && ehVisitante(sessao) && !emAndamento && !proximo && podeRegistrar("visitante", sessao.acessoFim ?? null) ? <ComeceAquiSite tela="inicio" /> : null}
      {cardio?.prescricoes.length ? (
        <div className="space-y-2">
          <SemanaCardioCard semana={cardio.semanas.find((w) => w.atual) ?? null} link />
          {estadoDia === "falta_cardio" ? null : <CardioHoje pendentes={cardioPendentes} nome={primeiroNome} livre={false} compacto />}
        </div>
      ) : cardio ? (
        // Sem cardio no protocolo: dá para anotar o que fizer por conta própria.
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-bold">❤️‍🔥 Fez algum cardio?</p>
            <p className="text-xs text-fg-muted">{cardio.marco.feitos ? `${cardio.marco.feitos} ${cardio.marco.feitos === 1 ? "cardio anotado" : "cardios anotados"}. ` : ""}Anote aqui e ganhe troféus de cardio.</p>
          </div>
          <Link href="/aluno/cardio" className="touch shrink-0 rounded-lg border border-accent/60 px-3 py-2 text-sm font-semibold text-accent">Anotar</Link>
        </div>
      ) : null}
      {FEATURES.modoVisitante && ehVisitante(sessao) ? <DesafioDoVisitante alunoId={alunoId} /> : null}
      {FEATURES.modoVisitante && ehVisitante(sessao) && !sessao.comoPersonal ? <ConhecaOMontinho /> : null}
      {indicacao?.pct ? <DescontoIndicacao r={indicacao} nome={sessao.nome} link aluno={!ehVisitante(sessao)} /> : null}
      {mostrarConvite && campanha ? <ConviteAmigo amigos={campanha.indicacao.amigos} diasGanhos={campanha.indicacao.diasGanhos} tela="inicio" /> : null}
      {FEATURES.modoVisitante && !ehVisitante(sessao) && !sessao.comoPersonal && !indicacao?.pct ? <IncentivoIndicacao momento="inicio" aluno fecharam={indicacao?.fecharam ?? 0} /> : null}
      {/* No máximo um convite por tela: com campanha em destaque, sai o convite comum. */}
      {FEATURES.modoVisitante && ehVisitante(sessao) && !campanha?.oferta && !mostrarConvite ? <CtaVisitante alunoId={alunoId} tela="inicio" acessoFim={sessao.acessoFim ?? null} /> : null}
      {/* Oferta dos planos (Consultoria/Pacote Flexível), com limite e pausas; a oferta do fim do acesso do visitante tem a vez. */}
      {!sessao.comoPersonal && !campanha?.oferta && BRAND.contact.whatsapp ? <OfertaPlano tela="inicio" whatsapp={BRAND.contact.whatsapp} /> : null}

      {/* Pequena vitória da semana: só evidência real; sem ela, texto neutro */}
      <Link href="/aluno/vitorias" className="block">
        <Card className={`transition-colors hover:border-accent/40 ${vitoria ? "border-accent/40" : ""}`}>
          <CardBody className="space-y-1 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Sua pequena vitória da semana</p>
            {vitoria ? (
              <>
                <p className="font-semibold leading-tight">{vitoria.mensagem}</p>
                <p className="text-xs font-semibold text-accent">Entenda sua evolução →</p>
              </>
            ) : (
              <p className="text-sm text-fg-muted">{VITORIA_NEUTRA}</p>
            )}
          </CardBody>
        </Card>
      </Link>

      <AnuncioDescoberta candidatas={candidatasAnuncio(album.itens).slice(0, 8).map(paraVisao)} explorados={albumResumo.explorados} total={albumResumo.total} origem="inicio" />

      {estrategia ? <SuaEstrategiaCard e={estrategia.dados} fase={faseAtual(estrategia.dados.fases, inicioDasFases(aluno.data_inicio, estrategia.dados.data), dataLocal(new Date()))} /> : null}

      {proximaMed ? (
        <Link href="/aluno/jornada" className="block">
          <Card className="transition-colors hover:border-accent/40">
            <CardBody className="flex items-center gap-3 py-3">
              <MedalhaIcone selo={proximaMed.selo} conquistada={false} atual={proximaMed.atual} alvo={proximaMed.alvo} tamanho={52} lendaria={LENDARIAS.has(proximaMed.codigo)} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-fg-muted">Sua próxima medalha · {ganhas} de {medalhas.length}</p>
                <p className="font-semibold leading-tight">{proximaMed.titulo}</p>
                {proximaMed.alvo ? (
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden>
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(((proximaMed.atual ?? 0) / proximaMed.alvo) * 100)}%` }} />
                  </div>
                ) : null}
                {proximaMed.falta ? <p className="mt-1 text-xs text-fg-muted">{proximaMed.falta}</p> : null}
              </div>
            </CardBody>
          </Card>
        </Link>
      ) : null}

      {/* 2. Progresso da semana em relação à meta individual */}
      {aderencia.semanaAtual?.meta ? (
        <Card>
          <CardBody className="space-y-2">
            <ProgressoSemana semana={aderencia.semanaAtual} sequencia={aderencia.sequencia} extras={aderencia.semanaAtual.extras} />
            <SemanasBarras semanas={aderencia.semanas} quantidade={8} altura={52} className="pt-1" />
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <Link href="/aluno/evolucao#consistencia" className="inline-block text-xs text-accent underline-offset-2 hover:underline min-h-6 py-0.5">
                Ver calendário de consistência
              </Link>
              <Link href="/aluno/conquistas" className="inline-block text-xs text-accent underline-offset-2 hover:underline min-h-6 py-0.5">
                Minhas conquistas
              </Link>
              <Link href="/aluno/jornada" className="inline-block text-xs text-accent underline-offset-2 hover:underline min-h-6 py-0.5">
                Minha Jornada
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {/* Treino extra: só aparece se o personal liberou (nunca empurra treino a mais) */}
      {configExtra?.habilitado && !emAndamento ? (
        <Link href="/aluno/extra" className="block">
          <Card className="hover:border-accent/40 transition-colors">
            <CardBody className="flex items-center gap-3 py-3">
              <div className="flex-1">
                <p className="font-semibold text-sm">Quero fazer um treino extra</p>
                <p className="text-xs text-fg-subtle">Está com disposição para treinar mais hoje? Veja se existe uma sessão extra liberada para você.</p>
              </div>
              <Icon name="chevron" className="text-fg-subtle" />
            </CardBody>
          </Card>
        </Link>
      ) : null}

      {/* Reconhecimento escrito pelo personal (recente) */}
      {reconhecimentos[0] && Date.parse(reconhecimentos[0].created_at) > new Date().getTime() - 14 * 86_400_000 ? (
        <Link href="/aluno/conquistas" className="block">
          <Card className="border-accent/50 hover:border-accent transition-colors">
            <CardBody className="space-y-1 py-3">
              <p className="text-[11px] uppercase tracking-wider text-accent font-bold">Reconhecimento do {BRAND.name}</p>
              <p className="text-sm">“{reconhecimentos[0].mensagem}”</p>
              <p className="text-[11px] text-fg-subtle">Escrita pelo seu personal · {dataBR(reconhecimentos[0].created_at)}</p>
            </CardBody>
          </Card>
        </Link>
      ) : null}

      {/* 3. Último progresso relevante (só o que os registros provam) */}
      {resumo30.conquistas.length || emAlta.length ? (
        <Card className="border-success/30">
          <CardBody className="space-y-3">
            <p className="text-[11px] uppercase tracking-wider text-success font-semibold">Seu progresso real</p>
            {resumo30.conquistas.length ? (
              <div>
                <p className="font-bold">{resumo30.conquistas[0].titulo}</p>
                <p className="text-sm text-fg-muted">{resumo30.conquistas[0].detalhe}</p>
              </div>
            ) : null}
            {emAlta.length ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-fg-muted">Cargas que subiram desde o primeiro registro</p>
                <CargasEmAltaLista itens={emAlta} compacto />
              </div>
            ) : null}
            <Link href="/aluno/evolucao" className="inline-block text-sm text-accent underline-offset-2 hover:underline min-h-6 py-0.5">
              Ver evolução
            </Link>
          </CardBody>
        </Card>
      ) : null}

      {/* Montinho Pulso: no Início só para quem está voltando (o check-in diário 1–10 foi aposentado). */}
      {pulsoInicio ? <PulsoCard ctx={pulsoInicio} momento="inicio" /> : null}

      {/* Mensagens reais do treinador (autoria identificada) */}
      {visiveis.length ? (
        <section className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-fg-muted">Do {BRAND.name} para você</h2>
          {visiveis.map((i) => (
            <Card key={i.id}>
              <CardBody className="py-3">
                <p className="text-sm">{i.descricao}</p>
                <p className="text-[11px] text-fg-subtle mt-1">
                  {i.autor?.nome ?? BRAND.name} · {dataBR(i.created_at)}
                </p>
              </CardBody>
            </Card>
          ))}
        </section>
      ) : null}

      {dieta.length ? (
        <Link href="/aluno/dieta" className="block">
          <Card className="hover:border-accent/40 transition-colors">
            <CardBody className="flex items-center gap-3 py-3">
              <div className="flex-1">
                <p className="font-semibold text-sm">Plano alimentar</p>
                <p className="text-xs text-fg-subtle">{dieta.length} refeições cadastradas</p>
              </div>
              <Icon name="chevron" className="text-fg-subtle" />
            </CardBody>
          </Card>
        </Link>
      ) : null}
    </div>
  );
}

function estimarDuracao(sessoes: Awaited<ReturnType<typeof listSessoes>>, letra: string | null): number | null {
  if (!letra) return null;
  const d = sessoes.filter((s) => s.letra === letra && s.status === "concluida" && s.duracao_seg).slice(0, 5).map((s) => s.duracao_seg as number);
  if (d.length < 2) return null; // só mostra quando há dados confiáveis
  return Math.round(d.reduce((a, b) => a + b, 0) / d.length / 60);
}
