import { Badge } from "@/components/ui/Badge";
import { listTemplates, listBiblioteca } from "@/lib/db";
import { TemplatesClient } from "./TemplatesClient";

export default async function TemplatesPage() {
  const [templates, biblioteca] = await Promise.all([listTemplates(), listBiblioteca()]);
  return (
    <div className="space-y-6">
      <header>
        <Badge tone="gold">Templates</Badge>
        <h1 className="text-3xl font-bold mt-3">Biblioteca de treinos</h1>
        <p className="text-fg-muted text-sm mt-1">
          Crie modelos de treino reutilizáveis. Cada template pode ser clonado pra qualquer aluno
          em segundos — você escolhe quantos treinos, quais exercícios, séries e reps.
        </p>
      </header>
      <TemplatesClient templates={templates} biblioteca={biblioteca} />
    </div>
  );
}
