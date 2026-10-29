// Mobilidade e alongamento no painel: os dois protocolos e “Enviar para um
// aluno no WhatsApp” (o aluno comentou que está com dor → o personal manda na hora).
import { requireTreinadorPage } from "@/lib/auth/session";
import { pessoasParaEnviar } from "@/lib/data/mobilidade";
import { linkVideo, PROTOCOLOS, SLUGS_MOBILIDADE, todosExercicios } from "@/lib/mobilidade/protocolos";
import { EnviarMobilidade } from "@/components/mobilidade/EnviarMobilidade";

export const metadata = { title: "Mobilidade" };
export const dynamic = "force-dynamic";

export default async function MobilidadeTreinadorPage() {
  await requireTreinadorPage();
  const pessoas = await pessoasParaEnviar();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-2xl font-black">🧘 Mobilidade e alongamento</h1>
        <p className="mt-1 text-sm text-fg-muted">Os dois protocolos que os alunos fazem pelo app (Treinar → Mobilidade). Mande para quem precisa direto no WhatsApp.</p>
      </header>
      <EnviarMobilidade pessoas={pessoas} aberto />
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
