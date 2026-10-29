// Topo de “Minhas conquistas” (pedido do Montinho, 29/10/2026): os números que o
// aluno quer ver ao entrar — troféus, carimbos, semanas seguidas, recordes,
// cardio e o que dá para ganhar — e cada um leva direto ao lugar dele.
import Link from "next/link";

export type ResumoConquistas = {
  trofeus: number;
  totalTrofeus: number;
  carimbos: number;
  semanasSeguidas: number;
  recordes: number;
  cardios: number | null;
  aoAlcance: number;
  ganhosNaSemana: number;
};

function Bloco({ href, emoji, valor, rotulo, destaque = false }: { href: string; emoji: string; valor: string; rotulo: string; destaque?: boolean }) {
  return (
    <Link href={href} className={`flex min-h-[86px] flex-col justify-between rounded-xl border px-3 py-2.5 transition-colors hover:border-accent/70 ${destaque ? "border-accent/60 bg-accent/10" : "border-border bg-card"}`}>
      <span className="flex items-center justify-between gap-1 text-lg leading-none">
        <span aria-hidden>{emoji}</span>
        <span aria-hidden className="text-xs text-fg-subtle">›</span>
      </span>
      <span>
        <span className="block font-mono text-2xl font-black leading-tight tabular-nums">{valor}</span>
        <span className="block text-[11px] font-semibold leading-tight text-fg-muted">{rotulo}</span>
      </span>
    </Link>
  );
}

export function PainelConquistas({ r }: { r: ResumoConquistas }) {
  const pct = r.totalTrofeus ? Math.round((r.trofeus / r.totalTrofeus) * 100) : 0;
  return (
    <section aria-label="Resumo das suas conquistas" className="space-y-2">
      <Link href="/aluno/conquistas/todas" className="block rounded-2xl border border-accent/60 bg-grain-strong px-4 py-3">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-bold">🏆 Troféus conquistados</span>
          <span className="text-xs font-semibold text-accent">Ver todos ›</span>
        </span>
        <span className="mt-1 flex items-baseline gap-2">
          <span className="font-mono text-4xl font-black tabular-nums text-accent">{r.trofeus}</span>
          <span className="text-sm text-fg-muted">de {r.totalTrofeus}</span>
          {r.ganhosNaSemana ? <span className="ml-auto rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold text-bg">+{r.ganhosNaSemana} esta semana</span> : null}
        </span>
        <span className="mt-2 block h-2 overflow-hidden rounded-full bg-border" aria-hidden>
          <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </span>
      </Link>
      <div className="grid grid-cols-3 gap-2">
        <Bloco href="#ao-alcance" emoji="🎯" valor={String(r.aoAlcance)} rotulo={r.aoAlcance === 1 ? "pode ganhar logo" : "podem sair logo"} destaque={r.aoAlcance > 0} />
        <Bloco href="#carimbos" emoji="🎟️" valor={String(r.carimbos)} rotulo={r.carimbos === 1 ? "carimbo" : "carimbos"} />
        <Bloco href="/aluno/jornada" emoji="🔥" valor={String(r.semanasSeguidas)} rotulo={r.semanasSeguidas === 1 ? "semana seguida" : "semanas seguidas"} />
        <Bloco href={r.recordes ? "#recordes" : "/aluno/evolucao"} emoji="⚡" valor={String(r.recordes)} rotulo={r.recordes === 1 ? "recorde pessoal" : "recordes pessoais"} />
        <Bloco href="/aluno/cardio" emoji="❤️‍🔥" valor={r.cardios != null ? String(r.cardios) : "—"} rotulo={r.cardios === 1 ? "cardio" : "cardios"} />
        <Bloco href="/aluno/ranking" emoji="🥇" valor="Ver" rotulo="sua posição no ranking" />
      </div>
    </section>
  );
}
