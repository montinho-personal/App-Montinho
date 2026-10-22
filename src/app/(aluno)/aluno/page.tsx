import { saudacao as saudacaoSP } from "@/components/brand/BrandLockup";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { requireAlunoPage } from "@/lib/auth/session";
import { getAluno, listDieta, getCheckInHoje } from "@/lib/db";
import { getPlanoAtivo } from "@/lib/data/programas";
import { getSessaoEmAndamento, listSessoes } from "@/lib/data/sessoes";
import { listIntervencoes } from "@/lib/data/acompanhamento";
import { estadoSemana, resumoPeriodo } from "@/lib/relatorios/calcular";
import { dataBR, tempoRelativo } from "@/lib/format";
import { CheckInDiario } from "@/components/aluno/CheckInDiario";
import { BRAND } from "@/config/brand";
import { aderenciaDoAluno } from "@/lib/data/aderencia";
import { ProgressoSemana } from "@/components/aderencia/ProgressoSemana";
import { listarConquistas, listarReconhecimentos } from "@/lib/data/conquistas";
import { proximaMedalha, vitrineDeMedalhas } from "@/lib/conquistas/vitrine";
import { sessaoParaConquista } from "@/lib/conquistas/mapear";
import { MedalhaIcone } from "@/components/conquistas/MedalhaIcone";
import { getConfigExtra, listarExtras } from "@/lib/data/extras";
import { estrategiaVigente } from "@/lib/data/estrategias";
import { faseAtual, inicioDasFases } from "@/lib/estrategia/fases";
import { dataLocal } from "@/lib/aderencia/calcular";
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

export const metadata = { title: "Início" };

export default async function AlunoHomePage() {
  const sessao = await requireAlunoPage();
  const alunoId = sessao.alunoId;
  // Visitante novo: primeiro o questionário de boas-vindas.
  if (FEATURES.modoVisitante && ehVisitante(sessao) && sessao.mode === "live") {
    const perfil = await perfilVisitante(alunoId).catch(() => null);
    if (!perfil?.onboarding_concluido_em) redirect("/aluno/boas-vindas");
  }
  const [aluno, plano, emAndamento, sessoes, intervencoes, checkInHoje, dieta, reconhecimentos, configExtra, extras, estrategia, conquistas, historicoResumo] = await Promise.all([
    getAluno(alunoId),
    getPlanoAtivo(alunoId),
    getSessaoEmAndamento(alunoId),
    listSessoes(alunoId, { limite: 120 }),
    listIntervencoes(alunoId, 3),
    getCheckInHoje(alunoId),
    listDieta(alunoId),
    listarReconhecimentos(alunoId, 1),
    getConfigExtra(alunoId),
    listarExtras(alunoId, true),
    estrategiaVigente(alunoId),
    listarConquistas(alunoId),
    listarHistoricoResumo(alunoId),
  ]);
  if (!aluno) return null;
  const [aderencia, { atual: vitoria }, album] = await Promise.all([aderenciaDoAluno(aluno), vitoriasDoAluno(aluno, 0), albumParaAluno(aluno, conquistas)]);
  const albumResumo = progressoAlbum(album.itens);
  const medalhas = vitrineDeMedalhas({ conquistas, sessoes: sessoes.map(sessaoParaConquista), aderencia, hoje: dataLocal(new Date()) });
  const proximaMed = proximaMedalha(medalhas);
  const ganhas = medalhas.filter((m) => m.conquistada).length;

  const primeiroNome = (aluno.profile?.nome ?? sessao.nome).split(" ")[0];
  // Dia ainda sem exercícios (ex.: plano criado pela estratégia) não aparece para o aluno.
  const treinos = plano.treinos.filter((t) => t.ativo && t.exercicios.length > 0);
  const letras = treinos.map((t) => t.letra);
  const semana = estadoSemana(sessoes, plano.programa?.frequencia, letras);
  const proximo = treinos.find((t) => t.letra === semana.proximaLetra) ?? treinos[0] ?? null;
  const resumo30 = resumoPeriodo(sessoes, plano.programa?.frequencia, 30, new Date(), aderencia);
  // Horário de São Paulo (o servidor roda em UTC).
  const saudacao = saudacaoSP();
  const duracaoEstimada = proximo?.duracao_estimada_min ?? estimarDuracao(sessoes, proximo?.letra ?? null);
  const emAlta = cargasEmAlta(sessoes, historicoResumo, 2);
  const visiveis = intervencoes.filter((i) => i.visivel_aluno);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs text-fg-subtle uppercase tracking-wider">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="text-2xl font-bold leading-tight mt-1">
          {saudacao}, <span className="text-accent">{primeiroNome}</span>
        </h1>
      </header>

      {/* 1. Sessão em andamento ou próximo treino — CTA prioritário */}
      {emAndamento ? (
        <Card className="border-accent/50 bg-grain-strong">
          <CardBody className="space-y-3">
            <p className="text-[11px] uppercase tracking-wider text-accent font-bold">Treino em andamento</p>
            <h2 className="text-lg font-bold leading-tight">
              {emAndamento.letra ? `Treino ${emAndamento.letra} · ` : ""}
              {emAndamento.nome_treino}
            </h2>
            <p className="text-sm text-fg-muted">
              {emAndamento.series_concluidas} de {emAndamento.series_planejadas} séries registradas · iniciado {tempoRelativo(emAndamento.iniciado_em)}
            </p>
            <Link href={`/aluno/treino/${emAndamento.treino_id}?sessao=${emAndamento.id}`} className="touch inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-base font-bold text-bg hover:bg-accent-hover">
              <Icon name="play" /> Continuar treino
            </Link>
          </CardBody>
        </Card>
      ) : proximo ? (
        <Card className="border-accent/40 bg-grain-strong">
          <CardBody className="space-y-3">
            <p className="text-[11px] uppercase tracking-wider text-accent font-bold">{semana.retomada ? "Seu treino continua aqui" : "Seu próximo treino"}</p>
            {plano.programa?.nome && plano.programa.nome !== "Programa atual" ? <p className="text-xs text-fg-muted">Protocolo: <span className="font-semibold text-fg">{plano.programa.nome}</span></p> : null}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center shrink-0" aria-hidden>
                <span className="text-2xl font-black text-bg">{proximo.letra}</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold leading-tight">{proximo.nome}</h2>
                <p className="text-sm text-fg-muted mt-0.5">
                  {proximo.exercicios.length} exercícios
                  {duracaoEstimada ? ` · ~${duracaoEstimada} min` : ""}
                </p>
              </div>
            </div>
            {semana.retomada ? <p className="text-sm text-fg-muted">Faz {semana.diasSemUltimoTreino} dias desde o último registro. Vamos retomar no seu ritmo?</p> : null}
            <Link href={`/aluno/treino/${proximo.id}`} className="touch inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-base font-bold text-bg hover:bg-accent-hover">
              <Icon name="play" /> Começar treino
            </Link>
            {treinos.length > 1 ? (
              <Link href="/aluno/treinar" className="block py-1 text-center text-sm text-fg-muted hover:text-fg">
                Prefere outro treino hoje? Ver todos
              </Link>
            ) : null}
          </CardBody>
        </Card>
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

      {FEATURES.modoVisitante && ehVisitante(sessao) ? <DesafioDoVisitante alunoId={alunoId} /> : null}
      {FEATURES.modoVisitante && ehVisitante(sessao) ? <CtaVisitante alunoId={alunoId} tela="inicio" acessoFim={sessao.acessoFim ?? null} /> : null}

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
              <MedalhaIcone selo={proximaMed.selo} conquistada={false} atual={proximaMed.atual} alvo={proximaMed.alvo} tamanho={52} />
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
      {configExtra?.habilitado && extras.length && !emAndamento ? (
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

      <CheckInDiario jaRespondido={!!checkInHoje} />

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
