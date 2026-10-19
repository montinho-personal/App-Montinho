import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { listDieta } from "@/lib/db";
import { RefeicaoCard } from "./RefeicaoCard";
import { requireAlunoPage } from "@/lib/auth/session";
import Link from "next/link";

export const metadata = { title: "Plano alimentar" };

export default async function DietaPage() {
  const sessao = await requireAlunoPage();
  const dieta = await listDieta(sessao.alunoId);

  return (
    <div className="space-y-6">
      <Link href="/aluno" className="text-fg-muted text-sm hover:text-fg">← Início</Link>
      <header>
        <Badge tone="accent">Plano alimentar</Badge>
        <h1 className="text-2xl font-bold mt-3">Seu plano alimentar</h1>
        <p className="text-fg-muted text-sm mt-1">
          Toque em uma refeição pra ver alimentos e substituições.
        </p>
      </header>

      {dieta.length === 0 ? (
        <Card className="border-dashed"><CardBody className="text-center py-8 text-sm text-fg-muted">Nenhum plano alimentar cadastrado ainda.</CardBody></Card>
      ) : (
        <div className="space-y-3">
          {dieta.map((d) => (
            <RefeicaoCard key={d.id} refeicao={d} />
          ))}
        </div>
      )}

      <Card className="border-accent/20">
        <CardBody className="text-center py-5">
          <div className="text-xs text-fg-subtle uppercase tracking-wider mb-1">Orientação do Montinho</div>
          <p className="text-sm text-fg-muted">
            Hidratação faz parte do plano. Mantenha a garrafa por perto durante o dia e no treino.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
