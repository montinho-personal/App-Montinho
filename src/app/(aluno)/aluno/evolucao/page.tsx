import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SimpleLine } from "@/components/ui/SimpleChart";
import { Heatmap, HeatmapLegend } from "@/components/ui/Heatmap";
import { listEvolucao, listCheckIns, listLogbookByAluno } from "@/lib/db";
import { dataBR } from "@/lib/format";

const ALUNO_ID = "aline";

export default async function EvolucaoPage() {
  const [evolucao, checkIns, logbook] = await Promise.all([
    listEvolucao(ALUNO_ID),
    listCheckIns(ALUNO_ID, 84),
    listLogbookByAluno(ALUNO_ID, 500),
  ]);

  // Constrói heatmap: dias com treino registrado + check-ins
  const diasTreino = new Set(logbook.map((l) => l.data));
  const diasCheckin = new Set(checkIns.map((c) => c.data));
  const heatmapDias = Array.from(new Set([...diasTreino, ...diasCheckin])).map((data) => {
    const teveTreino = diasTreino.has(data);
    const teveCheckin = diasCheckin.has(data);
    const intensidade = teveTreino && teveCheckin ? 4 : teveTreino ? 3 : teveCheckin ? 2 : 0;
    const partes: string[] = [];
    if (teveTreino) partes.push("treino");
    if (teveCheckin) partes.push("check-in");
    return { data, intensidade, tooltip: `${data} — ${partes.join(" + ") || "nada"}` };
  });
  const atual = evolucao[evolucao.length - 1];
  const inicial = evolucao[0];

  const diferencaPeso =
    atual && inicial ? (atual.peso_kg ?? 0) - (inicial.peso_kg ?? 0) : 0;
  const diferencaGordura =
    atual && inicial ? (atual.gordura_pct ?? 0) - (inicial.gordura_pct ?? 0) : 0;

  return (
    <div className="space-y-5">
      <header>
        <Badge tone="gold">Evolução</Badge>
        <h1 className="text-2xl font-bold mt-3">Seu progresso</h1>
        <p className="text-fg-muted text-sm mt-1">Peso, medidas, fotos e gráficos ao longo do tempo.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Sua aderência</span>
            <span className="text-xs font-normal text-fg-subtle">últimos 84 dias</span>
          </CardTitle>
        </CardHeader>
        <CardBody>
          <Heatmap dias={heatmapDias} />
          <div className="flex items-center justify-between mt-3">
            <div className="text-xs text-fg-subtle">
              <span className="text-accent font-bold">{diasTreino.size}</span> treinos · <span className="text-accent font-bold">{diasCheckin.size}</span> check-ins
            </div>
            <HeatmapLegend />
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardBody className="text-center py-5">
            <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">Peso atual</div>
            <div className="text-3xl font-bold mt-1">{atual?.peso_kg ?? "—"}<span className="text-sm text-fg-muted ml-1">kg</span></div>
            {diferencaPeso !== 0 ? (
              <div className={`text-xs font-semibold mt-1 ${diferencaPeso < 0 ? "text-success" : "text-fg-subtle"}`}>
                {diferencaPeso > 0 ? "+" : ""}{diferencaPeso.toFixed(1)}kg
              </div>
            ) : null}
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-5">
            <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">% Gordura</div>
            <div className="text-3xl font-bold mt-1">{atual?.gordura_pct ?? "—"}<span className="text-sm text-fg-muted ml-1">%</span></div>
            {diferencaGordura !== 0 ? (
              <div className={`text-xs font-semibold mt-1 ${diferencaGordura < 0 ? "text-success" : "text-fg-subtle"}`}>
                {diferencaGordura > 0 ? "+" : ""}{diferencaGordura.toFixed(1)}%
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>

      {evolucao.length >= 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Peso ao longo do tempo</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col items-center">
            <SimpleLine
              data={evolucao.map((e) => e.peso_kg ?? 0)}
              height={120}
              width={320}
              tone="accent"
            />
            <div className="flex justify-between w-full mt-3 text-[10px] text-fg-subtle">
              {evolucao.map((e) => (
                <div key={e.id} className="text-center">
                  <div className="text-fg font-mono font-bold text-xs">{e.peso_kg}kg</div>
                  <div>{dataBR(e.data)}</div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Medidas</span>
            <Button variant="primary" size="sm">+ Nova medição</Button>
          </CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {evolucao.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-fg-subtle">
              Você ainda não registrou medidas. Comece agora pra acompanhar sua evolução.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {evolucao.slice().reverse().map((e) => (
                <li key={e.id} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">{dataBR(e.data)}</span>
                    <span className="text-xs font-mono text-fg-muted">{e.peso_kg}kg · {e.gordura_pct}%</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <Medida label="Cintura" valor={e.cintura_cm} />
                    <Medida label="Quadril" valor={e.quadril_cm} />
                    <Medida label="Braço" valor={e.braco_cm} />
                    <Medida label="Coxa" valor={e.coxa_cm} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card className="border-dashed">
        <CardBody className="text-center py-8">
          <div className="text-3xl mb-2 opacity-50">📷</div>
          <div className="font-bold text-sm">Fotos de evolução</div>
          <div className="text-xs text-fg-muted mt-1 mb-4">
            Adicione fotos frente/lado/costas mensalmente.
          </div>
          <Button variant="secondary" size="sm">+ Adicionar foto</Button>
        </CardBody>
      </Card>
    </div>
  );
}

function Medida({ label, valor }: { label: string; valor: number | null }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">{label}</div>
      <div className="text-sm font-mono font-bold mt-1">{valor ?? "—"}<span className="text-fg-subtle ml-0.5">cm</span></div>
    </div>
  );
}
