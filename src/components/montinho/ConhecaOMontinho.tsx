// Atalhos para “Minha história” e “Consultoria” (Perfil de todos; Início do visitante).
import Link from "next/link";

export function ConhecaOMontinho({ titulo = "Conheça o Montinho" }: { titulo?: string }) {
  return (
    <section aria-label={titulo} className="space-y-2 rounded-2xl border border-accent/50 bg-[linear-gradient(160deg,#2a2415_0%,#171717_75%)] p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-accent">{titulo}</p>
      <p className="text-sm text-fg-muted">Do “gordinho da turma” a −40 kg e mais de 100 alunos acompanhados.</p>
      <div className="grid grid-cols-2 gap-2">
        <Link href="/aluno/historia" className="touch flex flex-col justify-center rounded-xl border border-border bg-bg px-3 py-2.5">
          <span className="font-bold">📖 Minha história</span>
          <span className="text-[11px] text-fg-muted">Como tudo começou</span>
        </Link>
        <Link href="/aluno/consultoria" className="touch flex flex-col justify-center rounded-xl border border-border bg-bg px-3 py-2.5">
          <span className="font-bold">💎 Consultoria</span>
          <span className="text-[11px] text-fg-muted">Treinar comigo</span>
        </Link>
      </div>
    </section>
  );
}
