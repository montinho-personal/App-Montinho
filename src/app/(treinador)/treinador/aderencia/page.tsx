import { requireTreinadorPage } from "@/lib/auth/session";
import { listAlunos } from "@/lib/db";
import { aderenciaDeTodos } from "@/lib/data/aderencia";
import { dataLocal, tendencia } from "@/lib/aderencia/calcular";
import { linhaCentral } from "@/lib/aderencia/central";
import { CentralAderenciaClient } from "./CentralAderenciaClient";
import { lerModelosMensagem, lerRegrasAcompanhamento } from "@/lib/data/preferencias";
import { extrasAcompanhamento } from "@/lib/data/acompanhamento-extra";
import { pulsoDeTodos, registrarAcessoSaude, type PulsoDoAluno } from "@/lib/data/pulso";
import { CentralPulsoClient } from "./CentralPulsoClient";
import Link from "next/link";

export const metadata = { title: "Central de aderência" };
export const dynamic = "force-dynamic";

export default async function CentralAderenciaPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const sessao = await requireTreinadorPage();
  const { aba } = await searchParams;
  const abaPulso = aba === "pulso";
  const alunos = (await listAlunos()).filter((a) => a.status !== "arquivado");
  const [dados, regras, extras, modelos] = await Promise.all([aderenciaDeTodos(alunos), lerRegrasAcompanhamento(sessao.userId), extrasAcompanhamento(alunos.map((a) => a.id)).catch(() => ({}) as Awaited<ReturnType<typeof extrasAcompanhamento>>), lerModelosMensagem(sessao.userId)]);
  const hoje = dataLocal(new Date());
  // Montinho Pulso de todos (as duas abas usam: a Aderência junta o Pulso aos sinais).
  const pulso = await pulsoDeTodos(
    alunos.map((a) => {
      const d = dados[a.id];
      const t = tendencia(d);
      return { id: a.id, nome: a.profile?.nome ?? "Aluno", telefone: a.telefone ?? null, quedaFrequencia: t !== null && t <= -regras.quedaPontos, frequenciaMantida: d.sequencia.atual >= 2, semanas: d.sequencia.atual };
    }),
    new Date(),
    modelos,
  ).catch((): PulsoDoAluno[] => []);
  const pulsoPorAluno = new Map(pulso.map((p) => [p.alunoId, p]));
  const linhas = alunos.map((a) => {
    const d = dados[a.id];
    const p = pulsoPorAluno.get(a.id);
    const pulsoCtx = p ? { categoria: p.resultado.categoria, semTempo: p.resultado.dificuldadesAtuais.some((x) => x === "falta_tempo" || x === "rotina_corrida") } : null;
    return { ...linhaCentral({ id: a.id, nome: a.profile?.nome ?? "Aluno" }, d, d.ultimaSessao, hoje, d.datas, { sessaoAbertaDesde: d.sessaoAbertaDesde, planoAlteradoEm: d.planoAlteradoEm, pausaTipo: d.pausaTipo, treinosSemCarga: extras[a.id]?.treinosSemCarga, ultimaAvaliacao: extras[a.id]?.ultimaAvaliacao ?? null, inicio: a.data_inicio ?? dataLocal(a.created_at), modelos, pulso: pulsoCtx }, regras), telefone: a.telefone ?? null, semanas: d.semanas.slice(-8).map(({ inicio, meta, pontos, pausada, atual, status }) => ({ inicio, meta, pontos, pausada, atual, status })) };
  });
  // Os dois painéis mostram dados derivados do Pulso: fica registrado (1×/dia por aluno).
  await registrarAcessoSaude(sessao.userId, pulso.filter((p) => p.resultado.ultimaResposta).map((p) => p.alunoId), "pulso_painel").catch(() => undefined);
  const aberto = pulso.filter((p) => p.chave && p.situacao === "aberto").length;
  const ABA = "touch rounded-t-lg border-b-2 px-3 py-2 text-sm font-semibold";
  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs uppercase tracking-wider text-accent font-bold">Acompanhamento</p>
        <h1 className="text-2xl font-bold">Central de aderência</h1>
        <p className="text-sm text-fg-muted mt-1">Consistência de cada aluno em relação à própria meta semanal. Os sinais descrevem o que aconteceu (dias sem registro, queda de frequência, retomada) — a decisão de como agir é sua.</p>
      </header>
      <nav className="flex gap-1 border-b border-border" aria-label="Abas da Central">
        <Link href="/treinador/aderencia" aria-current={!abaPulso ? "page" : undefined} className={`${ABA} ${!abaPulso ? "border-accent text-fg" : "border-transparent text-fg-muted"}`}>Aderência</Link>
        <Link href="/treinador/aderencia?aba=pulso" aria-current={abaPulso ? "page" : undefined} className={`${ABA} ${abaPulso ? "border-accent text-fg" : "border-transparent text-fg-muted"}`}>💛 Montinho Pulso{aberto ? ` (${aberto})` : ""}</Link>
      </nav>
      {abaPulso ? <CentralPulsoClient itens={pulso} modelos={modelos} /> : <CentralAderenciaClient linhas={linhas} regras={regras} modelos={modelos} />}
    </div>
  );
}
