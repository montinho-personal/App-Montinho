// Últimas semanas em barras: altura = treinos válidos ÷ meta da semana.
// Dourado = progresso; ✓ = meta cumprida; listrado = pausa combinada;
// tracejado = semana sem prescrição. A semana atual fica mais clara (em curso).
import type { Semana } from "@/lib/aderencia/calcular";
import { dataBR } from "@/lib/format";

export type SemanaBarra = Pick<Semana, "inicio" | "meta" | "pontos" | "pausada" | "atual" | "status">;

const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const curta = (iso: string) => dataBR(iso).slice(0, 5);

function dica(s: SemanaBarra): string {
  const quando = s.atual ? "Esta semana" : `Semana de ${curta(s.inicio)}`;
  if (s.pausada) return `${quando}: pausa combinada (não conta como falta)`;
  if (!s.meta) return `${quando}: sem treino prescrito`;
  return `${quando}: ${num(s.pontos)} de ${s.meta} treinos${s.pontos >= s.meta ? " · meta cumprida" : ""}`;
}

export function SemanasBarras({ semanas, quantidade = 8, altura = 64, compacto = false, className = "", textoDica = dica }: { semanas: SemanaBarra[]; quantidade?: number; altura?: number; compacto?: boolean; className?: string; textoDica?: (s: SemanaBarra) => string }) {
  const lista = semanas.slice(-quantidade);
  // Sem nenhuma semana com treino prescrito, as barras não dizem nada: some.
  if (lista.length < 2 || !lista.some((s) => s.meta || s.pausada)) return null;
  const cumpridas = lista.filter((s) => s.meta && !s.pausada && !s.atual && s.pontos >= s.meta).length;
  const fechadas = lista.filter((s) => s.meta && !s.pausada && !s.atual).length;
  const resumo = `Últimas ${lista.length} semanas: meta cumprida em ${cumpridas} de ${fechadas}.`;
  return (
    <figure className={className} aria-label={resumo}>
      <div className="flex items-end gap-1" style={{ height: altura }} role="img" aria-label={resumo}>
        {lista.map((s) => {
          const fr = s.meta && !s.pausada ? Math.min(1, s.pontos / s.meta) : 0;
          const cumprida = !!s.meta && !s.pausada && s.pontos >= s.meta;
          return (
            <div key={s.inicio} title={textoDica(s)} className="relative flex h-full flex-1 flex-col justify-end">
              {cumprida && !compacto ? <span className="absolute inset-x-0 -top-0.5 text-center text-[9px] font-bold leading-none text-success" aria-hidden>✓</span> : null}
              <div
                className={`relative w-full overflow-hidden rounded-t-[4px] ${s.pausada ? "bg-[repeating-linear-gradient(135deg,var(--color-border)_0_3px,transparent_3px_6px)]" : !s.meta ? "border border-dashed border-border" : "bg-border/60"} ${s.atual ? "outline outline-1 outline-accent/40" : ""}`}
                style={{ height: compacto ? "100%" : "calc(100% - 12px)" }}
              >
                {fr > 0 ? <div className={`absolute inset-x-0 bottom-0 rounded-t-[4px] bg-accent ${s.atual ? "opacity-60" : ""}`} style={{ height: `${Math.max(fr * 100, 6)}%` }} /> : null}
              </div>
            </div>
          );
        })}
      </div>
      {!compacto ? (
        <figcaption className="mt-1 flex justify-between text-[10px] text-fg-subtle" aria-hidden>
          <span>{curta(lista[0].inicio)}</span>
          <span>{lista.at(-1)!.atual ? "esta semana" : curta(lista.at(-1)!.inicio)}</span>
        </figcaption>
      ) : null}
    </figure>
  );
}
