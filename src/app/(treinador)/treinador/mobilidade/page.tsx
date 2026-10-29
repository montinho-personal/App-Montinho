// Mobilidade e alongamento no painel: quem precisa (anamnese ou prescrição),
// quem fez hoje/na semana, colocar no protocolo e avisar no WhatsApp.
import { requireTreinadorPage } from "@/lib/auth/session";
import { pessoasParaEnviar } from "@/lib/data/mobilidade";
import { mobilidadeDeTodos as mobilidadeIndicadaDeTodos } from "@/lib/data/mobilidade-indicada";
import { linkVideo, PROTOCOLOS, SLUGS_MOBILIDADE, todosExercicios } from "@/lib/mobilidade/protocolos";
import { EnviarMobilidade } from "@/components/mobilidade/EnviarMobilidade";
import { PrescreverMobilidade } from "@/components/mobilidade/PrescreverMobilidade";

export const metadata = { title: "Mobilidade" };
export const dynamic = "force-dynamic";

export default async function MobilidadeTreinadorPage() {
  await requireTreinadorPage();
  const [pessoas, lista] = await Promise.all([pessoasParaEnviar(), mobilidadeIndicadaDeTodos()]);
  const confirmar = lista.filter((l) => l.soAnamnese).length;
  const fizeramHoje = lista.filter((l) => l.s?.feitaHoje).length;
  const ativos = lista.filter((l) => l.m).length;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-2xl font-black">🧘 Mobilidade e alongamento</h1>
        <p className="mt-1 text-sm text-fg-muted">Quem contou dor, lesão ou falta de mobilidade na anamnese já aparece aqui com a mobilidade indicada. Confirme no protocolo: o aluno vê no Início todo dia e recebe o lembrete no celular (com o troféu em jogo).</p>
      </header>

      <section aria-label="Resumo" className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-border bg-surface p-3"><p className="text-2xl font-black">{ativos}</p><p className="text-[11px] text-fg-muted">com mobilidade</p></div>
        <div className="rounded-xl border border-success/40 bg-surface p-3"><p className="text-2xl font-black">{fizeramHoje}</p><p className="text-[11px] text-fg-muted">fizeram hoje</p></div>
        <div className="rounded-xl border border-accent/50 bg-surface p-3"><p className="text-2xl font-black text-accent">{confirmar}</p><p className="text-[11px] text-fg-muted">a confirmar (anamnese)</p></div>
      </section>

      <section aria-labelledby="quem" className="space-y-2">
        <h2 id="quem" className="text-xs font-bold uppercase tracking-wider text-fg-muted">Quem precisa de mobilidade</h2>
        {lista.length ? (
          lista.map((l) => (
            <div key={l.alunoId} className="space-y-1">
              <p className="px-1 text-sm font-bold">{l.nome}{l.visitante ? <span className="ml-2 rounded-full border border-border px-2 text-[10px] font-normal text-fg-subtle">visitante</span> : null}</p>
              <PrescreverMobilidade
                alunoId={l.alunoId}
                nome={l.nome}
                telefone={l.telefone}
                e={{ protocolos: l.m?.protocolos ?? ["superiores"], diasSemana: l.m?.diasSemana ?? 7, motivo: l.m?.origem === "personal" ? l.m.motivo : "", ativo: !!l.m, origem: l.m?.origem ?? (l.desligada ? "personal" : null), regioesAnamnese: l.regioesAnamnese, diasFeitos: l.s?.diasNaSemana ?? null, feitaHoje: !!l.s?.feitaHoje }}
              />
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-fg-muted">Ninguém com dor ou falta de mobilidade na anamnese. Para indicar a mobilidade a alguém, abra a ficha do aluno: o quadro “🧘 Mobilidade no protocolo” fica logo abaixo do cabeçalho.</p>
        )}
      </section>

      <EnviarMobilidade pessoas={pessoas} />
      <ul className="grid gap-3 sm:grid-cols-2">
        {SLUGS_MOBILIDADE.map((s) => {
          const p = PROTOCOLOS[s];
          return (
            <li key={s} className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-3xl" aria-hidden>{p.emoji}</p>
              <h2 className="mt-1 font-black">{p.nome}</h2>
              <p className="text-xs text-fg-muted">{p.chamada} · ~{p.minutos} min · {todosExercicios(p).length} exercícios</p>
              <a href={linkVideo(p)} target="_blank" rel="noopener noreferrer" className="alvo mt-2 inline-block text-sm font-semibold text-accent">▶ Ver o vídeo</a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
