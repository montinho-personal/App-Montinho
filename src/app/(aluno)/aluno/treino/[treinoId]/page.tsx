import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getTreinoComExercicios, listLogbookByExercicio } from "@/lib/db";
import { ExercicioCard } from "./ExercicioCard";
import { FinalizarTreinoButton } from "./FinalizarTreinoButton";

type PageProps = { params: Promise<{ treinoId: string }> };

const ALUNO_ID = "aline";

export default async function TreinoExecucaoPage({ params }: PageProps) {
  const { treinoId } = await params;
  const treino = await getTreinoComExercicios(treinoId);
  if (!treino) notFound();

  // Carrega último logbook de cada exercício
  const exerciciosComUltimo = await Promise.all(
    treino.exercicios.map(async (e: (typeof treino.exercicios)[number]) => {
      const lb = await listLogbookByExercicio(ALUNO_ID, e.id);
      const ultimoPorSerie = new Map<number, { carga_kg: number | null; reps: number | null; ie: number | null }>();
      lb.forEach((l) => {
        if (!ultimoPorSerie.has(l.serie)) {
          ultimoPorSerie.set(l.serie, { carga_kg: l.carga_kg, reps: l.reps, ie: l.ie });
        }
      });
      return { exercicio: e, ultimo: ultimoPorSerie };
    })
  );

  return (
    <div className="space-y-5">
      <Link href="/aluno" className="text-fg-muted text-sm hover:text-fg flex items-center gap-1">
        ← Voltar
      </Link>

      {/* Cabeçalho do treino */}
      <Card className="border-accent/40 bg-grain-strong">
        <CardBody className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center shrink-0">
            <span className="text-3xl font-black text-bg">{treino.letra}</span>
          </div>
          <div className="flex-1 min-w-0">
            <Badge tone="accent">Treino {treino.letra}</Badge>
            <h1 className="font-bold text-lg leading-tight mt-2">{treino.nome}</h1>
            <p className="text-xs text-fg-subtle mt-1">{treino.exercicios.length} exercícios</p>
          </div>
        </CardBody>
      </Card>

      {treino.observacoes ? (
        <Card className="border-gold/20 bg-gold/5">
          <CardBody className="text-xs text-fg-muted">
            <span className="text-gold mr-1">⚠</span> {treino.observacoes}
          </CardBody>
        </Card>
      ) : null}

      <div className="space-y-3">
        {exerciciosComUltimo.map(({ exercicio, ultimo }, idx) => (
          <ExercicioCard
            key={exercicio.id}
            exercicio={exercicio}
            index={idx + 1}
            ultimo={ultimo}
          />
        ))}
      </div>

      <Card className="border-success/30 bg-success/5">
        <CardBody className="text-center py-5">
          <div className="text-sm text-fg-muted">Quando terminar todos os exercícios:</div>
          <FinalizarTreinoButton treinoId={treino.id} />
        </CardBody>
      </Card>
    </div>
  );
}
