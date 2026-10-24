// Placar de um desafio entre amigos (0094).
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAlunoPage } from "@/lib/auth/session";
import { detalheDesafio, marcarCutucadasVistas, minhasCutucadas, pessoasParaDesafio } from "@/lib/data/desafios";
import { diaBrasilia, FOCOS, RECOMPENSA_DESAFIO, recadoDoPlacar, resumoDesafio, TIPOS_DESAFIO, totalDoTime } from "@/lib/desafios/regras";
import { Cutucar } from "@/components/desafios/Cutucar";
import { ConvidarDesafio } from "@/components/desafios/ConvidarDesafio";
import { ResponderConvite } from "@/components/desafios/ResponderConvite";

export const metadata = { title: "Desafio" };
export const dynamic = "force-dynamic";

const br = (d: string) => d.split("-").reverse().join("/");

export default async function DesafioPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ novo?: string }> }) {
  const sessao = await requireAlunoPage();
  const { id } = await params;
  const { novo } = await searchParams;
  const d = await detalheDesafio(id, sessao.alunoId).catch(() => null);
  if (!d) notFound();
  const tipo = TIPOS_DESAFIO[d.tipo];
  const encerrado = d.situacao === "encerrado";
  const pessoas = d.meuStatus === "aceito" && !encerrado ? await pessoasParaDesafio(sessao.alunoId).catch(() => []) : [];
  const modo = tipo.modo;
  const disputa = modo === "disputa";
  const eu = d.placar.find((l) => l.eu);
  const cutucadas = (await minhasCutucadas(sessao.alunoId).catch(() => [])).filter((c) => c.desafioId === d.id);
  if (cutucadas.length) await marcarCutucadasVistas(sessao.alunoId, d.id).catch(() => undefined);
  const recado = d.meuStatus === "aceito" ? recadoDoPlacar(d, d.placar, diaBrasilia(new Date())) : null;
  const total = modo === "time" ? totalDoTime(d.placar) : null;
  return (
    <div className="space-y-5">
      <Link href="/aluno/desafios" className="alvo inline-block text-sm text-fg-muted hover:text-fg">← Desafios</Link>
      {novo ? <p role="status" className="rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm font-semibold text-success">Desafio criado! Agora chame a galera 👇</p> : null}
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-accent">{tipo.emoji} {tipo.titulo}</p>
        <h1 className="text-2xl font-black leading-tight">{d.nome}</h1>
        <p className="text-sm text-fg-muted">
          {tipo.descricao}
          {d.tipo === "meta_fixa" ? ` Meta: ${d.meta} treinos.` : d.tipo === "semanas" ? ` Meta: ${d.meta} treinos por semana.` : d.tipo === "corrida" ? ` Chegada: ${d.meta} treinos.` : d.tipo === "dupla" ? ` Meta do time: ${d.meta} treinos.` : d.tipo === "musculo" ? ` Músculo: ${FOCOS[d.foco ?? "pernas"].rotulo}.` : ""}
        </p>
        <p className="text-xs text-fg-subtle">De {br(d.inicio)} a {br(d.fim)}{d.criadorNome ? ` · criado por ${d.criadorNome}` : ""}</p>
      </header>
      {d.meuStatus === "convidado" && !encerrado ? (
        <div className="space-y-2 rounded-2xl border-2 border-accent bg-accent/10 p-4">
          <p className="font-semibold">Você foi convidado para este desafio.</p>
          <ResponderConvite id={d.id} />
        </div>
      ) : null}
      {cutucadas.map((c) => (
        <p key={c.id} role="status" className="rounded-xl border border-accent/50 bg-accent/10 px-4 py-3 text-sm font-semibold">
          {c.emoji} {c.de} te cutucou! Bora responder no treino.
        </p>
      ))}
      {recado && !encerrado ? <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold">{recado}</p> : null}
      {encerrado && eu?.cumpriu && disputa && RECOMPENSA_DESAFIO.ativa ? <p className="rounded-xl border-2 border-accent bg-accent/15 px-4 py-3 text-sm font-bold">🎁 {RECOMPENSA_DESAFIO.texto}</p> : null}
      {d.tipo === "treino_desafio" && d.exercicios?.length ? (
        <section className="space-y-2 rounded-2xl border border-accent/40 bg-card p-4" aria-label="Treino do desafio">
          <h2 className="font-bold">📋 Treino do desafio</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {d.exercicios.map((e) => <li key={e.id}>{e.nome}</li>)}
          </ol>
          <p className="text-xs text-fg-muted">Conta o peso (carga × repetições) feito nesses exercícios no período, no seu treino ou num treino livre. Anote sempre a carga no mesmo aparelho.</p>
        </section>
      ) : null}
      {total != null ? (
        <p className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm font-bold">🤝 Time: {total} de {d.meta} treinos {total >= (d.meta ?? 0) ? "— meta batida!" : ""}</p>
      ) : null}
      {encerrado && eu ? (
        <p className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm font-semibold">
          {eu.cumpriu ? (disputa ? "🥇 Você foi o campeão deste desafio!" : modo === "time" ? "🤝 O time bateu a meta!" : "✅ Palavra cumprida: você bateu a meta!") : `Desafio encerrado: ${eu.rotulo}. Bora para o próximo!`}
        </p>
      ) : null}
      <section className="space-y-2" aria-label="Placar">
        <h2 className="text-sm font-bold uppercase tracking-wider text-fg-muted">{d.situacao === "agendado" ? "Quem já topou" : "Placar"}</h2>
        <ol className="space-y-2">
          {d.placar.map((l) => (
            <li key={l.alunoId} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${l.eu ? "border-accent bg-accent/10" : "border-border bg-card"}`}>
              <span className="w-8 text-center text-lg font-black">{l.posicao === 1 && l.pontos > 0 && disputa ? "🥇" : l.posicao === 2 && disputa ? "🥈" : l.posicao === 3 && disputa ? "🥉" : `${l.posicao}º`}</span>
              <span className="flex-1">
                <span className="block font-semibold">{l.nome}{l.eu ? " (você)" : ""}</span>
                <span className="block text-xs text-fg-muted">{l.rotulo}</span>
              </span>
              {modo === "meta" && l.cumpriu ? <span className="text-sm font-bold text-success">✓ meta</span> : null}
              {!l.eu && d.meuStatus === "aceito" && d.situacao === "andamento" ? <Cutucar desafioId={d.id} para={l.alunoId} nome={l.nome} /> : null}
            </li>
          ))}
        </ol>
        {d.convidados.length ? <p className="text-xs text-fg-subtle">Esperando resposta: {d.convidados.map((c) => c.nome).join(", ")}</p> : null}
      </section>
      {encerrado && d.meuStatus === "aceito" ? (
        <Link href={`/aluno/desafios/novo?revanche=${d.id}`} className="alvo flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-4 text-base font-bold text-bg">
          🔁 Revanche!
        </Link>
      ) : null}
      {d.meuStatus === "aceito" && !encerrado ? <ConvidarDesafio id={d.id} codigo={d.codigo} nome={d.nome} criador={d.criadorNome} resumo={resumoDesafio(d)} pessoas={pessoas} jaEstao={[...d.placar.map((l) => l.alunoId)]} /> : null}
      <p className="text-[11px] text-fg-subtle">{["volume", "treino_desafio", "evolucao"].includes(d.tipo) ? "Conta carga × repetições das séries anotadas (aquecimento não entra). Anote sempre no mesmo aparelho." : "Conta treino concluído com séries anotadas, no máximo 1 por dia (horário de Brasília)."}</p>
    </div>
  );
}
