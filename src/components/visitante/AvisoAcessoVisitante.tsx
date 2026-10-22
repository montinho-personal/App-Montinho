import { BRAND } from "@/config/brand";
import { FEATURES } from "@/lib/env";
import { dataBR, estadoDoAcesso } from "@/lib/visitante/acesso";

/** Faixa do visitante quando o acesso está perto de acabar ou já acabou. */
export function AvisoAcessoVisitante({ fim }: { fim: string | null }) {
  if (!FEATURES.modoVisitante) return null;
  const e = estadoDoAcesso(fim);
  if (e.estado === "permanente" || e.estado === "ativo") return null;
  const vencido = e.estado === "vencido";
  const texto = vencido
    ? `Seu acesso terminou em ${dataBR(e.fim)}. Seus treinos, medalhas e a sua Jornada continuam aqui para você ver.`
    : `Seu acesso termina em ${e.diasRestantes} ${e.diasRestantes === 1 ? "dia" : "dias"} (${dataBR(e.fim)}).`;
  const msg = vencido ? "Oi, Montinho! Meu acesso ao app terminou e quero continuar treinando." : "Oi, Montinho! Meu acesso ao app está terminando e quero continuar.";
  return (
    <div role="status" className={`mb-4 rounded-xl border px-4 py-3 text-sm ${vencido ? "border-accent bg-accent-soft text-fg" : "border-border text-fg-muted"}`}>
      <p>{texto}</p>
      {BRAND.contact.whatsapp ? (
        <a className="alvo mt-2 inline-block font-semibold text-accent underline-offset-2 hover:underline" href={`https://wa.me/${BRAND.contact.whatsapp}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">
          {vencido ? "Quero continuar — falar com o Montinho" : "Falar com o Montinho"}
        </a>
      ) : null}
    </div>
  );
}
