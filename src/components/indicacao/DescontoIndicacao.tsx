// “🎁 Você tem X% de desconto” (0102): amigos indicados que fecharam um plano.
import Link from "next/link";
import { BRAND } from "@/config/brand";
import { mensagemUsarDesconto, REGRAS_DESCONTO, type ResumoDesconto } from "@/lib/indicacao/desconto";

export function DescontoIndicacao({ r, nome, link = false }: { r: ResumoDesconto; nome?: string | null; /** No Início: leva para a página da indicação. */ link?: boolean }) {
  if (r.pct <= 0) return null;
  const whats = BRAND.contact.whatsapp ? `https://wa.me/${BRAND.contact.whatsapp}?text=${encodeURIComponent(mensagemUsarDesconto(r.pct, nome))}` : null;
  return (
    <section aria-label="Desconto por indicação" className="rounded-2xl border-2 border-success/60 bg-success/10 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-success">Indicação premiada</p>
      <h2 className="mt-1 text-2xl font-black">🎁 Você tem {r.pct}% de desconto</h2>
      <p className="mt-1 text-sm text-fg-muted">
        {r.fecharam === 1 ? "1 amigo fechou" : `${r.fecharam} amigos fecharam`} com o {BRAND.name} pelo seu convite. Vale em qualquer plano, sem prazo para usar.
        {r.guardado > 0 ? ` E tem mais ${r.guardado}% guardados para a próxima vez (o máximo é ${REGRAS_DESCONTO.maximo}% por plano).` : ""}
      </p>
      <div className="mt-3 space-y-2">
        {whats ? (
          <a href={whats} target="_blank" rel="noopener noreferrer" className="alvo flex min-h-12 w-full items-center justify-center rounded-xl bg-success px-4 font-bold text-bg">
            💬 Usar meu desconto no WhatsApp
          </a>
        ) : null}
        {link ? <Link href="/aluno/indicar" className="block text-center text-sm font-semibold text-accent underline underline-offset-4">Indicar mais amigos</Link> : null}
      </div>
    </section>
  );
}
