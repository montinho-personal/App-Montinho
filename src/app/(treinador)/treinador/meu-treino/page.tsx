// “Meu treino”: o personal usa o app como um aluno (pedido do Montinho, 28/10/2026).
// A ficha dele é um aluno ligado ao próprio login, fora do ranking.
import Link from "next/link";
import { requireTreinadorPage } from "@/lib/auth/session";
import { meuAlunoId } from "@/lib/data/meu-treino";
import { getPlanoAtivo } from "@/lib/data/programas";
import { ehLivreMetas, placarDoAluno } from "@/lib/data/livre-metas";
import { PlacarMetas } from "@/components/livre-metas/PlacarMetas";
import { CriarMeuTreino } from "./CriarMeuTreino";

export const metadata = { title: "Meu treino" };
export const dynamic = "force-dynamic";

export default async function MeuTreinoPage() {
  const sessao = await requireTreinadorPage();
  const alunoId = await meuAlunoId(sessao.userId);
  if (!alunoId) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">🏋️ Meu treino</h1>
        <p className="text-sm text-fg-muted">Use o app como se fosse um aluno: treine, anote as séries, ganhe troféus e veja tudo do jeito que seus alunos veem. Você fica fora do ranking dos alunos.</p>
        <CriarMeuTreino />
      </div>
    );
  }
  const { programa, treinos } = await getPlanoAtivo(alunoId);
  const livre = ehLivreMetas(programa);
  const p = livre ? await placarDoAluno(alunoId).catch(() => null) : null;
  const porta = "touch flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm hover:border-accent";
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold">🏋️ Meu treino</h1>
        <p className="text-sm text-fg-muted">Sua ficha de aluno. Você fica fora do ranking dos alunos.</p>
      </header>
      <a href={livre ? "/api/meu-treino?ir=/aluno/livre" : "/api/meu-treino"} className="touch flex flex-col items-center justify-center rounded-xl bg-accent px-4 py-4 text-center font-bold text-bg hover:bg-accent-hover">
        <span className="text-lg">{livre ? "▶ Começar meu treino livre" : "▶ Entrar no app como aluno"}</span>
        <span className="text-xs font-normal text-bg/80">{livre ? "Suas metas ficam guardadas: é só escolher os exercícios de hoje." : "Para voltar, toque em “Voltar ao painel” no topo do app."}</span>
      </a>
      {livre ? <a href="/api/meu-treino" className="block text-center text-sm text-accent underline underline-offset-4">Ou entrar no app como aluno (início, troféus, evolução…)</a> : null}
      {p?.placar.length ? <PlacarMetas placar={p.placar} sugestao={p.sugestao} /> : null}
      <div className="space-y-2">
        <Link href={`/treinador/alunos/${alunoId}/livre-metas`} className={porta}>
          <span>
            <span className="block font-semibold">🎯 Protocolo livre (por metas) {livre ? "· LIGADO" : ""}</span>
            <span className="block text-xs text-fg-muted">Só as séries por semana de cada músculo; você escolhe os exercícios na hora.</span>
          </span>
          <span aria-hidden className="text-accent">→</span>
        </Link>
        <Link href={`/treinador/alunos/${alunoId}/treinos`} className={porta}>
          <span>
            <span className="block font-semibold">📝 Montar minhas fichas (A, B, C…)</span>
            <span className="block text-xs text-fg-muted">{treinos.filter((t) => t.ativo).length ? `${treinos.filter((t) => t.ativo).length} treino(s) na ficha.` : "Nenhum treino na ficha ainda."}</span>
          </span>
          <span aria-hidden className="text-accent">→</span>
        </Link>
        <Link href={`/treinador/alunos/${alunoId}/cardio`} className={porta}>
          <span className="font-semibold">❤️ Meu cardio</span>
          <span aria-hidden className="text-accent">→</span>
        </Link>
      </div>
    </div>
  );
}
