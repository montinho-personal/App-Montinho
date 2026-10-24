// Desafios entre amigos (0094): convites recebidos, em andamento e encerrados.
import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { listarMeusDesafios } from "@/lib/data/desafios";
import { resumoDesafio, TIPOS_DESAFIO } from "@/lib/desafios/regras";
import { CardDesafio } from "@/components/desafios/CardDesafio";
import { ResponderConvite } from "@/components/desafios/ResponderConvite";

export const metadata = { title: "Desafios" };
export const dynamic = "force-dynamic";

export default async function DesafiosPage() {
  const sessao = await requireAlunoPage();
  const todos = await listarMeusDesafios(sessao.alunoId).catch(() => []);
  const convites = todos.filter((d) => d.meuStatus === "convidado" && d.situacao !== "encerrado");
  const ativos = todos.filter((d) => d.meuStatus === "aceito" && d.situacao !== "encerrado");
  const encerrados = todos.filter((d) => d.meuStatus === "aceito" && d.situacao === "encerrado");
  return (
    <div className="space-y-5">
      <Link href="/aluno/ranking" className="alvo inline-block text-sm text-fg-muted hover:text-fg">← Ranking</Link>
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Treinar junto é mais fácil</p>
        <h1 className="mt-1 text-2xl font-black">⚔️ Desafios entre amigos</h1>
        <p className="mt-1 text-sm text-fg-muted">Crie um desafio, chame quem você quiser (até quem ainda não usa o app) e acompanhe o placar. O app confere sozinho: conta treino concluído, 1 por dia.</p>
      </header>
      <Link href="/aluno/desafios/novo" className="alvo flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-4 text-base font-bold text-bg">
        ⚔️ Criar desafio
      </Link>
      {convites.length ? (
        <section className="space-y-2" aria-label="Convites">
          <h2 className="text-sm font-bold uppercase tracking-wider text-fg-muted">Convites para você</h2>
          {convites.map((d) => (
            <div key={d.id} className="space-y-3 rounded-2xl border-2 border-accent bg-accent/10 p-4">
              <div>
                <p className="font-bold">{TIPOS_DESAFIO[d.tipo].emoji} {d.nome}</p>
                <p className="text-xs text-fg-muted">{resumoDesafio(d)} · {d.aceitos} {d.aceitos === 1 ? "participante" : "participantes"}</p>
                <Link href={`/aluno/desafios/${d.id}`} className="alvo text-xs font-semibold text-accent underline-offset-2 hover:underline">Ver placar →</Link>
              </div>
              <ResponderConvite id={d.id} />
            </div>
          ))}
        </section>
      ) : null}
      <section className="space-y-2" aria-label="Seus desafios">
        <h2 className="text-sm font-bold uppercase tracking-wider text-fg-muted">Seus desafios</h2>
        {ativos.length ? ativos.map((d) => <CardDesafio key={d.id} d={d} />) : <p className="rounded-xl border border-border bg-card p-4 text-sm text-fg-muted">Nenhum desafio agora. Que tal criar um e chamar quem treina com você?</p>}
      </section>
      {encerrados.length ? (
        <section className="space-y-2" aria-label="Encerrados">
          <h2 className="text-sm font-bold uppercase tracking-wider text-fg-muted">Encerrados</h2>
          {encerrados.map((d) => <CardDesafio key={d.id} d={d} />)}
        </section>
      ) : null}
      <p className="text-xs text-fg-subtle">⚔️ Criador de Desafios, 🥇 Campeão do Desafio, ✅ Palavra Cumprida e 🔥 Desafiante Nato são troféus que saem dos desafios.</p>
    </div>
  );
}
