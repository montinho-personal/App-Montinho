// Painel do personal: pessoas diferentes que abriram o app (0072). Só números.
import { Card, CardBody } from "@/components/ui/Card";
import type { Contagem, ResumoAcessos } from "@/lib/acessos/contar";

const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const diaSemana = (dia: string) => SEMANA[new Date(`${dia}T12:00:00Z`).getUTCDay()];
const separado = (c: Contagem) => `${c.alunos} ${c.alunos === 1 ? "aluno" : "alunos"} · ${c.visitantes} ${c.visitantes === 1 ? "visitante" : "visitantes"}`;

export function AcessosDoDia({ r }: { r: ResumoAcessos }) {
  const max = Math.max(1, ...r.porDia.map((d) => d.total));
  return (
    <Card>
      <CardBody className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-fg-muted">Acessos de hoje</p>
          <p className="text-3xl font-bold tabular-nums">{r.hoje.total}</p>
          <p className="text-sm text-fg-muted">{separado(r.hoje)}</p>
          <p className="text-xs text-fg-subtle">ontem: {r.ontem.total}</p>
        </div>
        <div className="space-y-1 text-sm">
          <p>
            <span className="font-semibold tabular-nums">{r.dias7.total}</span> <span className="text-fg-muted">pessoas nos últimos 7 dias</span>
            <span className="block text-xs text-fg-subtle">{separado(r.dias7)}</span>
          </p>
          <p>
            <span className="font-semibold tabular-nums">{r.dias30.total}</span> <span className="text-fg-muted">pessoas nos últimos 30 dias</span>
            <span className="block text-xs text-fg-subtle">{separado(r.dias30)}</span>
          </p>
        </div>
        <div className="min-w-[220px] flex-1">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-fg-subtle">Pessoas por dia · alunos <span className="text-accent">■</span> visitantes <span className="text-fg-muted">■</span></p>
          <div className="flex h-16 items-end gap-1.5" role="list" aria-label="Acessos por dia nos últimos 7 dias">
            {r.porDia.map((d, i) => (
              <div key={d.dia} role="listitem" className="flex flex-1 flex-col items-center gap-0.5" title={`${diaSemana(d.dia)} ${d.dia.slice(8, 10)}/${d.dia.slice(5, 7)}: ${d.total} (${separado(d)})`}>
                <span className="text-[10px] tabular-nums text-fg-subtle">{d.total}</span>
                <div className="flex w-full flex-col justify-end" style={{ height: `${Math.round((d.total / max) * 40)}px` }}>
                  <div className="w-full rounded-t-sm bg-fg-muted/60" style={{ flexGrow: d.visitantes }} />
                  <div className={`w-full bg-accent ${d.visitantes ? "" : "rounded-t-sm"}`} style={{ flexGrow: d.alunos }} />
                </div>
                <span className={`text-[10px] ${i === 6 ? "font-bold text-fg" : "text-fg-subtle"}`}>{i === 6 ? "hoje" : diaSemana(d.dia)}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="w-full text-[11px] text-fg-subtle">Cada pessoa conta 1 vez por dia, ao abrir o app (horário de Brasília). Contagem desde 23/10/2026.</p>
      </CardBody>
    </Card>
  );
}
