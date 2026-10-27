// Montinho Cardio — visão do personal: quem tem cardio prescrito, adesão da
// semana, minutos previstos × feitos, esforço, sinais e troféus recentes.
// Ferramenta de acompanhamento, não diagnóstico. Contato só pelo WhatsApp.
import Link from "next/link";
import { requireTreinadorPage } from "@/lib/auth/session";
import { painelCardio } from "@/lib/data/cardio";
import { listarConquistas } from "@/lib/data/conquistas";
import { lerModelosMensagem } from "@/lib/data/preferencias";
import { CODIGOS_CARDIO } from "@/lib/cardio/regras";
import { dataLocal, somarDias } from "@/lib/aderencia/calcular";
import { nomeDaConquista } from "@/lib/conquistas/conteudo";
import { PainelCardioClient } from "./PainelCardioClient";
import { EscolherAlunoCardio } from "./EscolherAlunoCardio";
import { listAlunos } from "@/lib/db";

export const metadata = { title: "Montinho Cardio" };

export default async function PainelCardioPage() {
  const sessao = await requireTreinadorPage();
  const [linhas, conquistas, modelos, alunos] = await Promise.all([painelCardio(), listarConquistas(null, { desde: `${somarDias(dataLocal(new Date()), -14)}T00:00:00-03:00`, limite: 300 }), lerModelosMensagem(sessao.userId), listAlunos()]);
  const nomes = new Map(linhas.map((l) => [l.alunoId, l.nome]));
  const trofeus = conquistas.filter((c) => (CODIGOS_CARDIO as string[]).includes(c.codigo) && nomes.has(c.aluno_id)).slice(0, 12);
  const comPrescricao = linhas.filter((l) => l.prescricoes.length);
  const previsto = comPrescricao.reduce((t, l) => t + (l.semanaAtual?.alvoMin ?? 0), 0);
  const feito = comPrescricao.reduce((t, l) => t + Math.min(l.semanaAtual?.minutos ?? 0, l.semanaAtual?.alvoMin ?? 0), 0);
  const cumpriram = comPrescricao.filter((l) => l.ultimaFechada?.status === "cumprida").length;
  const comFechada = comPrescricao.filter((l) => l.ultimaFechada).length;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Acompanhamento</p>
        <h1 className="text-2xl font-bold">❤️‍🔥 Montinho Cardio</h1>
        <p className="mt-1 text-sm text-fg-muted">Cardio prescrito × realizado de cada aluno. Os sinais mostram o que aconteceu; não são diagnóstico.</p>
      </header>
      <EscolherAlunoCardio alunos={alunos.filter((a) => a.status !== "arquivado").map((a) => ({ id: a.id, nome: a.profile?.nome ?? "Aluno", temCardio: linhas.some((l) => l.alunoId === a.id && l.prescricoes.length > 0) })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))} />
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi rotulo="Com cardio prescrito" valor={String(comPrescricao.length)} />
        <Kpi rotulo="Minutos da semana" valor={`${feito} de ${previsto}`} />
        <Kpi rotulo="Cumpriram a última semana" valor={comFechada ? `${cumpriram} de ${comFechada}` : "—"} />
        <Kpi rotulo="Troféus de cardio (14 dias)" valor={String(trofeus.length)} />
      </dl>
      {linhas.length ? (
        <PainelCardioClient linhas={linhas} modelos={modelos} />
      ) : (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-fg-muted">
          Nenhum aluno com cardio ainda. Escolha um aluno acima e toque em “❤️ Prescrever”.
        </div>
      )}
      {trofeus.length ? (
        <section className="space-y-2">
          <h2 className="font-bold">🏆 Troféus de cardio recentes</h2>
          <ul className="divide-y divide-border rounded-xl border border-border text-sm">
            {trofeus.map((c) => (
              <li key={c.id} className="flex justify-between gap-2 px-3 py-2">
                <span><Link href={`/treinador/alunos/${c.aluno_id}`} className="font-semibold hover:underline">{nomes.get(c.aluno_id)}</Link> · {nomeDaConquista(c.codigo, c.titulo)}</span>
                <span className="text-xs text-fg-muted">{new Date(c.conquistado_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Kpi({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <dt className="text-[11px] text-fg-muted">{rotulo}</dt>
      <dd className="text-lg font-bold">{valor}</dd>
    </div>
  );
}
