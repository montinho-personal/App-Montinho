// Início do aluno: a estratégia do personal em poucas linhas — frase, fase
// atual e o que enviar toda semana. Leva à página completa.
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { BRAND } from "@/config/brand";
import type { EstrategiaImportada } from "@/lib/estrategia/ler";
import type { FaseAtual } from "@/lib/estrategia/fases";

export function SuaEstrategiaCard({ e, fase }: { e: EstrategiaImportada; fase: FaseAtual | null }) {
  return (
    <Link href="/aluno/estrategia" className="block">
      <Card className="transition-colors hover:border-fg-subtle">
        <CardBody className="space-y-2 py-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-fg-muted">Sua estratégia</p>
          <p className="font-bold leading-snug">{e.titulo ?? "Seu planejamento"}</p>
          {e.frase ? <p className="text-sm italic text-fg-muted">“{e.frase}”</p> : null}
          {fase ? (
            <div>
              <p className="text-sm">
                {fase.encerrada ? (
                  <>Ciclo concluído — o {BRAND.name} vai reavaliar com você.</>
                ) : (
                  <>
                    <span className="font-semibold">Fase {fase.fase.numero} · {fase.fase.nome}</span>
                    {fase.semanasFase ? <span className="text-fg-muted"> — semana {fase.semana} de {fase.semanasFase}</span> : null}
                  </>
                )}
              </p>
              {fase.semanasFase && !fase.encerrada ? (
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden>
                  <div className="h-full rounded-full bg-fg-muted" style={{ width: `${Math.min(100, (fase.semana / fase.semanasFase) * 100)}%` }} />
                </div>
              ) : null}
            </div>
          ) : null}
          {e.checkinSemanal.length ? <p className="text-xs text-fg-muted">Toda semana, conte ao {BRAND.name}: {e.checkinSemanal.join(" · ")}.</p> : null}
          <p className="text-xs font-semibold text-accent">Ver a estratégia completa →</p>
        </CardBody>
      </Card>
    </Link>
  );
}
