import { BRAND } from "@/config/brand";

type LogoVariant = "full" | "mark" | "wordmark";
type LogoColor = "accent" | "white" | "black";

type LogoProps = {
  variant?: LogoVariant;
  /** "black" usa a variante para fundo claro; os demais usam a variante para fundo escuro. */
  color?: LogoColor;
  className?: string;
  height?: number;
  priority?: boolean;
};

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

export function Logo({ variant = "full", color = "white", className = "", height = 36, priority = false }: LogoProps) {
  if (!BRAND.logo.useText && variant !== "wordmark") {
    const src = variant === "mark" ? BRAND.logo.mark : color === "black" ? BRAND.logo.fullLight : BRAND.logo.full;
    const width = variant === "mark" ? height : Math.round(height * BRAND.logo.ratio);
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={BRAND.fullName}
        width={width}
        height={height}
        style={{ height, width: "auto", display: "block" }}
        className={className}
        decoding="async"
        {...(priority ? { fetchPriority: "high" as const } : { loading: "lazy" as const })}
      />
    );
  }

  const textColor = color === "black" ? "#0a0a0a" : color === "white" ? "var(--color-fg)" : "var(--color-accent)";

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
          color: "#0a0a0a",
          fontWeight: 900,
          fontSize: Math.round(height * 0.46),
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
        aria-label={BRAND.fullName}
      >
        {initials(BRAND.name)}
      </span>
    );
  }

  // Wordmark tipográfico: "MONTINHO" + "PERSONAL TRAINER"
  return (
    <span className={className} style={{ color: textColor, lineHeight: 1, whiteSpace: "nowrap", display: "inline-flex", flexDirection: "column", gap: Math.round(height * 0.08) }} aria-label={BRAND.fullName}>
      <span style={{ fontWeight: 900, fontSize: Math.round(height * 0.6), letterSpacing: "-0.02em", textTransform: "uppercase" }}>{BRAND.name}</span>
      <span style={{ fontWeight: 500, fontSize: Math.round(height * 0.26), letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.85 }}>Personal Trainer</span>
    </span>
  );
}
