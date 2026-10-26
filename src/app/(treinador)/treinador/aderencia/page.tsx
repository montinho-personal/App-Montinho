import { requireTreinadorPage } from "@/lib/auth/session";
import { listAlunos } from "@/lib/db";
import { aderenciaDeTodos } from "@/lib/data/aderencia";
import { dataLocal } from "@/lib/aderencia/calcular";
import { linhaCentral } from "@/lib/aderencia/central";
import { CentralAderenciaClient } from "./CentralAderenciaClient";
import { lerRegrasAcompanhamento } from "@/lib/data/preferencias";
import { extrasAcompanhamento } from "@/lib/data/acompanhamento-extra";

export const metadata = { title: "Central de aderência" };
export const dynamic = "force-dynamic";

export default async function CentralAderenciaPage() {
  const sessao = await requireTreinadorPage();
  const alunos = (await listAlunos()).filter((a) => a.status !== "arquivado");
  const [dados, regras, extras] = await Promise.all([aderenciaDeTodos(alunos), lerRegrasAcompanhamento(sessao.userId), extrasAcompanhamento(alunos.map((a) => a.id)).catch(() => ({}) as Awaited<ReturnType<typeof extrasAcompanhamento>>)]);
  const hoje = dataLocal(new Date());
  const linhas = alunos.map((a) => {
    const d = dados[a.id];
    return { ...linhaCentral({ id: a.id, nome: a.profile?.nome ?? "Aluno" }, d, d.ultimaSessao, hoje, d.datas, { sessaoAbertaDesde: d.sessaoAbertaDesde, planoAlteradoEm: d.planoAlteradoEm, pausaTipo: d.pausaTipo, treinosSemCarga: extras[a.id]?.treinosSemCarga, ultimaAvaliacao: extras[a.id]?.ultimaAvaliacao ?? null, inicio: a.data_inicio ?? dataLocal(a.created_at) }, regras), telefone: a.telefone ?? null, semanas: d.semanas.slice(-8).map(({ inicio, meta, pontos, pausada, atual, status }) => ({ inicio, meta, pontos, pausada, atual, status })) };
  });
  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs uppercase tracking-wider text-accent font-bold">Acompanhamento</p>
        <h1 className="text-2xl font-bold">Central de aderência</h1>
        <p className="text-sm text-fg-muted mt-1">Consistência de cada aluno em relação à própria meta semanal. Os sinais descrevem o que aconteceu (dias sem registro, queda de frequência, retomada) — a decisão de como agir é sua.</p>
      </header>
      <CentralAderenciaClient linhas={linhas} regras={regras} />
    </div>
  );
}
