// “Sua semana de cardio”: meta, realizado, progresso e o que falta.
// Sem calorias: o indicador é cumprir o prescrito.
import Link from "next/link";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { resumoSemana, type SemanaCardio } from "@/lib/cardio/regras";

export function SemanaCardioCard({ semana, link = false }: { semana: SemanaCardio | null; link?: boolean }) {
  if (!semana || !semana.alvoMin) return null;
  const r = resumoSemana(semana);
  const cumprida = semana.status === "cumprida" || semana.metaMinutos;
  const frase = cumprida
    ? "Semana de cardio cumprida. Chalalá! Daqui pra frente é manter, não exagerar."
    : semana.minutos === 0
      ? "Bora começar? Um cardio de cada vez."
      : r.pct != null && r.pct >= 50
        ? "Mais da metade feita. No ritmo certo!"
        : "Começou bem. Cada cardio conta.";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold">❤️‍🔥 Sua semana de cardio</p>
        {link ? <Link href="/aluno/cardio" className="text-xs text-accent underline-offset-2 hover:underline">Abrir</Link> : null}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div><dt className="text-[11px] text-fg-muted">Meta</dt><dd className="text-lg font-bold">{semana.alvoMin} min</dd></div>
        <div><dt className="text-[11px] text-fg-muted">Realizado</dt><dd className="text-lg font-bold">{semana.minutos} min</dd></div>
        <div><dt className="text-[11px] text-fg-muted">Progresso</dt><dd className="text-lg font-bold">{r.pct}%</dd></div>
      </dl>
      <ProgressBar value={r.pct ?? 0} tone={cumprida ? "success" : "accent"} className="mt-3" />
      <p className="mt-2 text-sm">
        {cumprida ? "✅ Meta da semana batida." : `Próximo objetivo: ${r.faltamMin} min restantes`}
        {!cumprida && r.faltamSessoes ? ` · ${r.faltamSessoes} ${r.faltamSessoes === 1 ? "cardio" : "cardios"} pendente${r.faltamSessoes === 1 ? "" : "s"}` : ""}
        <span className="block text-xs text-fg-muted">Dias com cardio: {semana.sessoes} de {semana.alvoSessoes} · {frase}</span>
      </p>
    </div>
  );
}
