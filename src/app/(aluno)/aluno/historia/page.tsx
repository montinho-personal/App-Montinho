// “Minha história” — quem é o Montinho (textos em src/lib/montinho/apresentacao.ts).
import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { BRAND } from "@/config/brand";
import { Logo } from "@/components/brand/Logo";
import { Voltar } from "@/components/ui/Voltar";
import { FalarComMontinho } from "@/components/montinho/FalarComMontinho";
import { CompartilharPagina } from "@/components/montinho/CompartilharPagina";
import { HISTORIA, NUMEROS } from "@/lib/montinho/apresentacao";

export const metadata = { title: "Minha história" };

export default async function HistoriaPage() {
  const sessao = await requireAlunoPage();
  const visitante = ehVisitante(sessao);
  return (
    <div className="space-y-10 pb-6">
      <div className="flex items-center justify-between gap-2">
        <Voltar href="/aluno/perfil" />
        <CompartilharPagina origem="historia" />
      </div>

      <header className="space-y-4 pt-2 text-center">
        <Logo height={56} className="mx-auto" />
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent">Minha história</p>
        <h1 className="text-4xl font-black leading-[1.05] tracking-tight">{HISTORIA.abertura}</h1>
        <p className="mx-auto max-w-xs text-lg text-fg-muted">{HISTORIA.subtitulo}</p>
      </header>

      <section aria-label="Em números" className="grid grid-cols-3 gap-2">
        {NUMEROS.map((n) => (
          <div key={n.valor} className="rounded-2xl border border-accent/40 bg-[linear-gradient(160deg,#2a2415_0%,#171717_80%)] px-2 py-4 text-center">
            <p className="text-2xl font-black text-accent">{n.valor}</p>
            <p className="mt-1 text-[11px] leading-tight text-fg-muted">{n.rotulo}</p>
          </div>
        ))}
      </section>

      {HISTORIA.capitulos.map((c, i) => (
        <section key={c.titulo} className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-fg-subtle">Capítulo {i + 1}</p>
          <h2 className="text-2xl font-extrabold leading-tight">{c.titulo}</h2>
          {c.paragrafos.map((p) => (
            <p key={p.slice(0, 24)} className="text-[17px] leading-relaxed text-fg-muted">{p}</p>
          ))}
          {c.destaque ? <p className="border-l-4 border-accent pl-4 text-xl font-bold leading-snug">{c.destaque}</p> : null}
        </section>
      ))}

      <section className="space-y-5 rounded-3xl border-2 border-accent bg-[linear-gradient(160deg,#2a2415_0%,#0a0a0a_85%)] px-5 py-8 text-center">
        <p className="text-2xl font-black leading-snug">“{HISTORIA.fecho}”</p>
        <p className="text-xs text-fg-subtle">— {BRAND.name}. Não é promessa de prazo nem de resultado: é sobre continuar.</p>
        <p className="text-base text-fg-muted">Quer fazer esse caminho comigo?</p>
        {BRAND.contact.whatsapp ? <FalarComMontinho origem="historia" whatsapp={BRAND.contact.whatsapp} visitante={visitante} /> : null}
        <CompartilharPagina origem="historia" destaque />
        <Link href="/aluno/consultoria" className="alvo block text-sm font-semibold text-accent underline underline-offset-4">Conheça a consultoria →</Link>
      </section>
    </div>
  );
}
