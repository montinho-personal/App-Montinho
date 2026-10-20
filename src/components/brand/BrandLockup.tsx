// Assinatura da marca no topo do app: símbolo (halter "M") + nome em
// tipografia nítida. O texto embutido no logotipo SVG fica ilegível em
// telas pequenas; aqui o nome é texto real (DM Sans), em tamanho de leitura.
import { BRAND } from "@/config/brand";

type Props = { tamanho?: "md" | "lg"; className?: string; priority?: boolean };

export function BrandLockup({ tamanho = "md", className = "", priority = false }: Props) {
  const lg = tamanho === "lg";
  const marca = lg ? 46 : 40;
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span className="relative grid shrink-0 place-items-center" style={{ width: marca, height: marca }}>
        {/* brilho dourado discreto atrás do símbolo */}
        <span aria-hidden className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgba(186,158,80,0.35),transparent)]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND.logo.mark} alt="" width={marca} height={marca} className="relative" style={{ width: marca, height: marca }} {...(priority ? { fetchPriority: "high" as const } : { loading: "lazy" as const })} />
      </span>
      <span className="flex flex-col leading-none">
        <span className={`${lg ? "text-[24px]" : "text-[21px]"} font-black uppercase tracking-[-0.01em] bg-gradient-to-b from-white to-[#c9c9c9] bg-clip-text text-transparent`}>{BRAND.name}</span>
        <span className={`${lg ? "text-[10.5px]" : "text-[9.5px]"} mt-1 font-semibold uppercase tracking-[0.32em] text-accent`}>Personal Trainer</span>
      </span>
      <span className="sr-only">{BRAND.fullName}</span>
    </span>
  );
}

/** Linha dourada (assinatura) na base do cabeçalho. */
export function FioDourado() {
  return <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/80 to-transparent" />;
}

/** Saudação pelo horário de São Paulo (calculada no servidor). */
export function saudacao(agora = new Date()): string {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(agora));
  return h < 5 ? "Boa noite" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}
