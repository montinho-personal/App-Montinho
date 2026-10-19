import { BRAND } from "@/config/brand";

type LogoVariant = "full" | "mark" | "wordmark";
type LogoColor = "accent" | "white" | "black";

type LogoProps = {
  variant?: LogoVariant;
  /** "white" usa o texto claro; "black" usa preto; qualquer outro usa a cor de destaque. */
  color?: LogoColor;
  className?: string;
  height?: number;
  priority?: boolean;
};

/** Iniciais a partir do nome da marca: "FELIPE TEAM" -> "FT", "Squad" -> "S". */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

export function Logo({
  variant = "full",
  color = "accent",
  className = "",
  height = 36,
  priority = false,
}: LogoProps) {
  // ── Modo IMAGEM: usa os SVGs apontados em brand.ts (logo.useText = false) ──
  if (!BRAND.logo.useText) {
    const src = variant === "mark" ? BRAND.logo.mark : BRAND.logo.full;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={BRAND.name}
        style={{ height, width: "auto" }}
        className={className}
        {...(priority ? { fetchPriority: "high" as const } : {})}
      />
    );
  }

  // ── Modo TEXTO (padrão): desenha o nome da marca como logotipo ──
  const textColor =
    color === "black" ? "#000" : color === "white" ? "var(--color-fg)" : "var(--color-accent)";

  // Símbolo quadrado: caixa com a cor de destaque e as iniciais.
  if (variant === "mark") {
    return (
      <span
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: height,
          height,
          borderRadius: Math.round(height * 0.28),
          background: "var(--color-accent)",
          color: "#fff",
          fontWeight: 900,
          fontSize: Math.round(height * 0.46),
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
        aria-label={BRAND.name}
      >
        {initials(BRAND.name)}
      </span>
    );
  }

  // Logotipo horizontal: o nome em destaque.
  return (
    <span
      className={className}
      style={{
        color: textColor,
        fontWeight: 900,
        fontSize: Math.round(height * 0.82),
        letterSpacing: "-0.03em",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {BRAND.name}
    </span>
  );
}
