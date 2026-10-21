// Nota do personal no exercício: orientações prontas aparecem como blocos com
// título; o texto livre continua como “Nota do Montinho”.
import { BRAND } from "@/config/brand";
import { blocosDaNota } from "@/lib/orientacoes";

export function NotaDoPersonal({ nota }: { nota: string | null | undefined }) {
  const blocos = blocosDaNota(nota);
  if (!blocos.length) return null;
  const livres = blocos.filter((b) => !b.titulo);
  const orientacoes = blocos.filter((b) => b.titulo);
  return (
    <div className="space-y-2">
      {livres.length ? (
        <div className="rounded-md border border-accent/20 bg-accent-soft/60 px-3 py-2 text-sm text-fg-muted">
          <span className="font-semibold text-accent">Nota do {BRAND.name}:</span>{" "}
          {livres.map((b, i) => (
            <span key={i} className="whitespace-pre-line">
              {i ? " " : ""}
              {b.texto}
            </span>
          ))}
        </div>
      ) : null}
      {orientacoes.map((b) => (
        <div key={b.titulo} className="rounded-md border border-accent/30 bg-bg/40 px-3 py-2">
          <p className="text-xs font-bold uppercase tracking-wide text-accent">{b.titulo}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-fg">{b.texto}</p>
        </div>
      ))}
    </div>
  );
}
