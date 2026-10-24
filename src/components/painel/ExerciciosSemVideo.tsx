// Painel do personal: exercícios das fichas ativas que ainda não têm vídeo.
import { Card, CardBody } from "@/components/ui/Card";
import type { SemVideo } from "@/lib/videos/sem-video";

export function ExerciciosSemVideo({ lista }: { lista: SemVideo[] }) {
  if (!lista.length) return null;
  const deAlunos = lista.filter((s) => s.pessoas.some((p) => !p.visitante)).length;
  return (
    <Card className="border-warning/40">
      <CardBody className="space-y-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-warning">🎬 Exercícios sem vídeo</p>
          <p className="text-sm text-fg-muted">
            {lista.length} {lista.length === 1 ? "exercício" : "exercícios"} nas fichas ativas
            {deAlunos ? ` · ${deAlunos} de alunos` : ""}. Grave ou mande o link do vídeo e ele aparece para quem faz.
          </p>
        </div>
        <Lista itens={lista.slice(0, 6)} />
        {lista.length > 6 ? (
          <details>
            <summary className="cursor-pointer text-xs font-semibold text-accent">Ver todos ({lista.length})</summary>
            <Lista itens={lista.slice(6)} />
          </details>
        ) : null}
      </CardBody>
    </Card>
  );
}

function Lista({ itens }: { itens: SemVideo[] }) {
  return (
    <ul className="divide-y divide-border text-sm">
      {itens.map((s) => (
        <li key={s.exercicio} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2">
          <span className="font-semibold">
            {s.exercicio}
            {s.nomeLivre ? <span className="ml-1.5 text-[11px] font-normal text-fg-subtle">(nome escrito à mão, fora da biblioteca)</span> : null}
          </span>
          <span className="text-xs text-fg-muted">{s.pessoas.map((p) => (p.visitante ? `${p.nome} (visitante)` : p.nome)).join(", ")}</span>
        </li>
      ))}
    </ul>
  );
}
