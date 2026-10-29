// “Consultoria” — o que é treinar com o Montinho (textos em src/lib/montinho/apresentacao.ts). Sem preço: valores pelo WhatsApp.
import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { BRAND } from "@/config/brand";
import { Logo } from "@/components/brand/Logo";
import { Voltar } from "@/components/ui/Voltar";
import { FalarComMontinho } from "@/components/montinho/FalarComMontinho";
import { CONSULTORIA, NUMEROS } from "@/lib/montinho/apresentacao";

export const metadata = { title: "Consultoria" };

export default async function ConsultoriaPage() {
  const sessao = await requireAlunoPage();
  const visitante = ehVisitante(sessao);
  const botao = BRAND.contact.whatsapp ? <FalarComMontinho origem="consultoria" whatsapp={BRAND.contact.whatsapp} visitante={visitante} /> : null;
  return (
    <div className="space-y-10 pb-6">
      <Voltar href="/aluno/perfil" />

      <header className="space-y-4 pt-2 text-center">
        <Logo height={56} className="mx-auto" />
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent">Consultoria Montinho</p>
        <h1 className="text-4xl font-black leading-[1.05] tracking-tight">
          {CONSULTORIA.abertura}
          <span className="block text-accent">{CONSULTORIA.subtitulo}</span>
        </h1>
      </header>

      <section className="space-y-3">
        {CONSULTORIA.intro.map((p) => (
          <p key={p.slice(0, 24)} className="text-[17px] leading-relaxed text-fg-muted">{p}</p>
        ))}
        <div className="pt-2">{botao}</div>
        <p className="text-center text-xs text-fg-subtle">A primeira conversa é gratuita e sem compromisso.</p>
      </section>

      <section aria-label="Em números" className="grid grid-cols-3 gap-2">
        {NUMEROS.map((n) => (
          <div key={n.valor} className="rounded-2xl border border-accent/40 bg-[linear-gradient(160deg,#2a2415_0%,#171717_80%)] px-2 py-4 text-center">
            <p className="text-2xl font-black text-accent">{n.valor}</p>
            <p className="mt-1 text-[11px] leading-tight text-fg-muted">{n.rotulo}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-extrabold leading-tight">O que muda quando eu estou junto</h2>
        <div className="grid gap-3">
          {CONSULTORIA.pilares.map((p) => (
            <div key={p.titulo} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-lg font-bold"><span aria-hidden>{p.icone}</span> {p.titulo}</p>
              <p className="mt-1 text-sm leading-relaxed text-fg-muted">{p.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-extrabold leading-tight">Três jeitos de treinar comigo</h2>
        <div className="grid gap-3">
          {CONSULTORIA.modalidades.map((m) => (
            <div key={m.nome} className="rounded-2xl border-l-4 border-accent bg-card p-4">
              <p className="text-lg font-bold">{m.nome}</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">{m.onde}</p>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{m.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-extrabold leading-tight">Como funciona</h2>
        <ol className="space-y-3">
          {CONSULTORIA.passos.map((p, i) => (
            <li key={p.titulo} className="flex gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent font-black text-bg">{i + 1}</span>
              <span>
                <span className="block font-bold">{p.titulo}</span>
                <span className="block text-sm text-fg-muted">{p.texto}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3 rounded-3xl border border-accent/40 bg-[linear-gradient(160deg,#2a2415_0%,#111111_80%)] p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">E tem mais uma coisa</p>
        <h2 className="text-2xl font-extrabold leading-tight">Este app. Feito para você não parar.</h2>
        <ul className="space-y-2">
          {CONSULTORIA.app.map((a) => (
            <li key={a} className="flex gap-2 text-sm leading-relaxed"><span aria-hidden className="text-accent">✓</span><span>{a}</span></li>
          ))}
        </ul>
        <p className="text-xs text-fg-subtle">Na consultoria, quem monta e acompanha o seu treino aqui dentro sou eu.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-extrabold leading-tight">Gente de verdade</h2>
        <div className="grid gap-2">
          {CONSULTORIA.resultados.map((r) => (
            <div key={r.nome} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <span className="font-bold">{r.nome}</span>
              <span className="text-right text-sm text-accent">{r.texto}</span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-accent/50 bg-card px-4 py-3">
            <span className="font-bold">O próprio Montinho</span>
            <span className="text-right text-sm text-accent">−40 kg em 12 meses</span>
          </div>
        </div>
        <p className="text-xs text-fg-subtle">{CONSULTORIA.avisoResultados}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-extrabold leading-tight">Perguntas que todo mundo faz</h2>
        {CONSULTORIA.perguntas.map((q) => (
          <details key={q.p} className="group rounded-xl border border-border bg-card px-4 py-3">
            <summary className="cursor-pointer list-none font-bold">
              {q.p} <span aria-hidden className="float-right text-accent group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">{q.r}</p>
          </details>
        ))}
      </section>

      <section className="space-y-5 rounded-3xl border-2 border-accent bg-[linear-gradient(160deg,#2a2415_0%,#0a0a0a_85%)] px-5 py-8 text-center">
        <p className="text-2xl font-black leading-snug">{CONSULTORIA.fecho}</p>
        <p className="text-sm text-fg-muted">Valores, horários e modalidades: é só me chamar.</p>
        {botao}
        <Link href="/aluno/historia" className="alvo block text-sm font-semibold text-accent underline underline-offset-4">Conheça a minha história →</Link>
      </section>
    </div>
  );
}
