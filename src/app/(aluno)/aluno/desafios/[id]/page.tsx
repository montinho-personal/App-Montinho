// Placar de um desafio entre amigos (0094).
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAlunoPage } from "@/lib/auth/session";
import { detalheDesafio, pessoasParaDesafio } from "@/lib/data/desafios";
import { resumoDesafio, TIPOS_DESAFIO } from "@/lib/desafios/regras";
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
  const disputa = d.tipo === "mais_treinos" || d.tipo === "madrugador";
  const eu = d.placar.find((l) => l.eu);
  return (
    <div className="space-y-5">
      <Link href="/aluno/desafios" className="alvo inline-block text-sm text-fg-muted hover:text-fg">← Desafios</Link>
      {novo ? <p role="status" className="rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm font-semibold text-success">Desafio criado! Agora chame a galera 👇</p> : null}
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-accent">{tipo.emoji} {tipo.titulo}</p>
        <h1 className="text-2xl font-black leading-tight">{d.nome}</h1>
        <p className="text-sm text-fg-muted">{tipo.descricao}{d.tipo === "meta_fixa" ? ` Meta: ${d.meta} treinos.` : d.tipo === "semanas" ? ` Meta: ${d.meta} treinos por semana.` : ""}</p>
        <p className="text-xs text-fg-subtle">De {br(d.inicio)} a {br(d.fim)}{d.criadorNome ? ` · criado por ${d.criadorNome}` : ""}</p>
      </header>
      {d.meuStatus === "convidado" && !encerrado ? (
        <div className="space-y-2 rounded-2xl border-2 border-accent bg-accent/10 p-4">
          <p className="font-semibold">Você foi convidado para este desafio.</p>
          <ResponderConvite id={d.id} />
        </div>
      ) : null}
      {encerrado && eu ? (
        <p className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm font-semibold">
          {eu.cumpriu ? (disputa ? "🥇 Você foi o campeão deste desafio!" : "✅ Palavra cumprida: você bateu a meta!") : `Desafio encerrado: você fez ${eu.rotulo}. Bora para o próximo!`}
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
              {!disputa && l.cumpriu ? <span className="text-sm font-bold text-success">✓ meta</span> : null}
            </li>
          ))}
        </ol>
        {d.convidados.length ? <p className="text-xs text-fg-subtle">Esperando resposta: {d.convidados.map((c) => c.nome).join(", ")}</p> : null}
      </section>
      {d.meuStatus === "aceito" && !encerrado ? <ConvidarDesafio id={d.id} codigo={d.codigo} nome={d.nome} criador={d.criadorNome} resumo={resumoDesafio(d)} pessoas={pessoas} jaEstao={[...d.placar.map((l) => l.alunoId)]} /> : null}
      <p className="text-[11px] text-fg-subtle">Conta treino concluído com séries anotadas, no máximo 1 por dia (horário de Brasília). Nada de quilos: ninguém sai na frente por ser mais forte.</p>
    </div>
  );
}
