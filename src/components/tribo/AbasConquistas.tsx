// Central de Conquistas: Minhas (existente) · Tribo · Missões coletivas.
import Link from "next/link";

const ABAS = [
  { id: "minhas", href: "/aluno/conquistas", rotulo: "🏅 Minhas" },
  { id: "tribo", href: "/aluno/conquistas/tribo", rotulo: "🤝 Tribo" },
  { id: "missoes", href: "/aluno/conquistas/missoes", rotulo: "🎯 Missões" },
] as const;

export function AbasConquistas({ ativa }: { ativa: (typeof ABAS)[number]["id"] }) {
  return (
    <nav aria-label="Central de Conquistas" className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-surface p-1">
      {ABAS.map((a) => (
        <Link
          key={a.id}
          href={a.href}
          aria-current={a.id === ativa ? "page" : undefined}
          className={`alvo flex min-h-10 items-center justify-center rounded-lg px-2 text-center text-xs font-bold ${a.id === ativa ? "bg-accent text-bg" : "text-fg-muted hover:text-fg"}`}
        >
          {a.rotulo}
        </Link>
      ))}
    </nav>
  );
}
