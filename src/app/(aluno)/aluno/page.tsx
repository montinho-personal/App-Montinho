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

export const metadata = { title: "Início" };

export default async function AlunoHomePage() {
  const sessao = await requireAlunoPage();
  const alunoId = sessao.alunoId;
  const [aluno, plano, emAndamento, sessoes, intervencoes, checkInHoje, dieta] = await Promise.all([
    getAluno(alunoId),
    getPlanoAtivo(alunoId),
    getSessaoEmAndamento(alunoId),
    listSessoes(alunoId, { limite: 120 }),
    listIntervencoes(alunoId, 3),
    getCheckInHoje(alunoId),
    listDieta(alunoId),
  ]);
  if (!aluno) return null;

  const primeiroNome = (aluno.profile?.nome ?? sessao.nome).split(" ")[0];
  const treinos = plano.treinos.filter((t) => t.ativo);
  const letras = treinos.map((t) => t.letra);
  const semana = estadoSemana(sessoes, plano.programa?.frequencia, letras);
  const proximo = treinos.find((t) => t.letra === semana.proximaLetra) ?? treinos[0] ?? null;
  const resumo30 = resumoPeriodo(sessoes, plano.programa?.frequencia, 30);
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const duracaoEstimada = proximo?.duracao_estimada_min ?? estimarDuracao(sessoes, proximo?.letra ?? null);
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
              <Link href="/aluno/treinar" className="block text-center text-sm text-fg-muted hover:text-fg">
                Prefere outro treino hoje? Ver todos
              </Link>
            ) : null}
          </CardBody>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardBody className="text-center py-8 space-y-2">
            <Icon name="dumbbell" size={32} className="mx-auto text-fg-subtle" />
            <h2 className="font-bold">Ainda não há treino liberado</h2>
            <p className="text-sm text-fg-muted">O {BRAND.name} está preparando seu programa. Assim que ele for publicado, aparece aqui.</p>
            {BRAND.contact.whatsapp ? (
              <a className="inline-block text-sm text-accent underline-offset-2 hover:underline" href={`https://wa.me/${BRAND.contact.whatsapp}`} target="_blank" rel="noreferrer">
                Falar com o {BRAND.name}
              </a>
            ) : null}
          </CardBody>
        </Card>
      )}

      {/* 2. Progresso da semana (denominador = frequência do programa) */}
      {treinos.length ? (
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wider text-fg-subtle font-semibold">Esta semana</p>
              <p className="text-lg font-bold mt-0.5">
                {semana.feitasSemana} de {semana.planejadasSemana || treinos.length} treinos
              </p>
              <p className="text-xs text-fg-muted">{semana.letrasFeitasSemana.length ? `Feitos: ${semana.letrasFeitasSemana.join(", ")}` : "Nenhum ainda — a semana é flexível, sem culpa."}</p>
            </div>
            <div className="w-24 h-2 rounded-full bg-bg border border-border overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={semana.planejadasSemana || treinos.length} aria-valuenow={semana.feitasSemana} aria-label="Progresso da semana">
              <div className="h-full bg-accent" style={{ width: `${Math.min(100, (semana.feitasSemana / Math.max(1, semana.planejadasSemana || treinos.length)) * 100)}%` }} />
            </div>
          </CardBody>
        </Card>
      ) : null}

      {/* 3. Último progresso relevante */}
      {resumo30.conquistas.length ? (
        <Card className="border-success/30">
          <CardBody>
            <p className="text-[11px] uppercase tracking-wider text-success font-semibold">Progresso real (30 dias)</p>
            <p className="font-bold mt-1">{resumo30.conquistas[0].titulo}</p>
            <p className="text-sm text-fg-muted">{resumo30.conquistas[0].detalhe}</p>
            <Link href="/aluno/evolucao" className="inline-block mt-2 text-sm text-accent underline-offset-2 hover:underline">
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
