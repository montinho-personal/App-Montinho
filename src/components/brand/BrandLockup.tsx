// Assinatura da marca no topo do app: símbolo (halter "M") com o nome AO LADO,
// usando o próprio texto do logotipo oficial (mesma fonte, cores e
// distribuição: MONTINHO em cima, PERSONAL TRAINER embaixo na mesma largura).
// Cores do logo: aço (cinza metálico) e branco — sem o dourado.
import { BRAND } from "@/config/brand";

type Props = { tamanho?: "md" | "lg"; className?: string; priority?: boolean };

/** Proporção do recorte do texto do logotipo (public/brand/wordmark.svg, viewBox 475×114). */
const RATIO_TEXTO = 475 / 114;

export function BrandLockup({ tamanho = "md", className = "", priority = false }: Props) {
  const marca = tamanho === "lg" ? 46 : 40;
  const texto = tamanho === "lg" ? 34 : 30;
  const carga = priority ? { fetchPriority: "high" as const } : { loading: "lazy" as const };
  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <span className="relative grid shrink-0 place-items-center" style={{ width: marca, height: marca }}>
        {/* reflexo metálico discreto atrás do símbolo */}
        <span aria-hidden className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.14),transparent)]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND.logo.mark} alt="" width={marca} height={marca} className="relative" style={{ width: marca, height: marca }} {...carga} />
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BRAND.logo.wordmark} alt={BRAND.fullName} width={Math.round(texto * RATIO_TEXTO)} height={texto} style={{ height: texto, width: "auto" }} {...carga} />
    </span>
  );
}

/** Fio metálico (cinza do logo) na base do cabeçalho. */
export function FioMarca() {
  return <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#9a9a9a] to-transparent" />;
}

/** Saudação pelo horário de São Paulo (calculada no servidor). */
export function saudacao(agora = new Date()): string {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(agora));
  return h < 5 ? "Boa noite" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}
