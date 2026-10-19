import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { listDieta } from "@/lib/db";
import { RefeicaoCard } from "./RefeicaoCard";

const ALUNO_ID = "aline";

export default async function DietaPage() {
  const dieta = await listDieta(ALUNO_ID);

  return (
    <div className="space-y-6">
      <header>
        <Badge tone="accent">Plano alimentar</Badge>
        <h1 className="text-2xl font-bold mt-3">Sua dieta de hoje</h1>
        <p className="text-fg-muted text-sm mt-1">
          Toque em uma refeição pra ver alimentos e substituições.
        </p>
      </header>

      <div className="space-y-3">
        {dieta.map((d) => (
          <RefeicaoCard key={d.id} refeicao={d} />
        ))}
      </div>

      <Card className="border-accent/20">
        <CardBody className="text-center py-5">
          <div className="text-xs text-fg-subtle uppercase tracking-wider mb-1">Dica do Pedro</div>
          <p className="text-sm text-fg-muted">
            Hidratação é tão importante quanto a comida. <strong className="text-fg">3L de água por dia</strong> é o mínimo.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
