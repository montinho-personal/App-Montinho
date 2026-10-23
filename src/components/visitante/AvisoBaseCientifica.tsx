// Aviso que acompanha todo treino montado pelo app para o visitante (Monte com
// IA e treinos prontos): base científica + biblioteca do Montinho, e que nada
// substitui a orientação de um profissional.
import { BRAND } from "@/config/brand";
import { FONTES, linkDaFonte } from "@/lib/desbloqueia/fontes";
import { AVISO_RESPONSABILIDADE, FONTES_DO_PLANO } from "@/lib/visitante/gerar-treino";

export function AvisoBaseCientifica({ compacto = false }: { compacto?: boolean }) {
  const fontes = FONTES_DO_PLANO.map((id) => FONTES[id]).filter(Boolean);
  return (
    <aside className="space-y-2 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-fg-muted" aria-label="Sobre estes treinos">
      <p className="text-sm font-semibold text-fg">🔬 Treinos baseados em estudos científicos</p>
      <p>{AVISO_RESPONSABILIDADE}</p>
      {compacto ? null : (
        <details>
          <summary className="cursor-pointer font-semibold text-accent">Ver os estudos usados</summary>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {fontes.map((f) => {
              const link = linkDaFonte(f);
              return <li key={f.id}>{link ? <a href={link} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{f.citacao}</a> : f.citacao}</li>;
            })}
          </ul>
        </details>
      )}
      <a href={`https://wa.me/${BRAND.contact.whatsapp}?text=${encodeURIComponent("Olá, Montinho! Quero um treino feito para mim. [APP-TREINO-PRONTO]")}`} target="_blank" rel="noopener noreferrer" className="alvo inline-block font-semibold text-accent underline-offset-2 hover:underline">
        Quero um treino feito pelo Montinho para mim →
      </a>
    </aside>
  );
}
