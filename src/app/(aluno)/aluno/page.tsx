import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { CheckInDiario } from "@/components/aluno/CheckInDiario";
import { getAluno, getCheckInHoje, listLogbookByAluno, listTreinos } from "@/lib/db";
import { tempoRelativo, diasAte } from "@/lib/format";

// Em produção, o aluno será resolvido da sessão.
// Por ora usamos a Aline como padrão.
const ALUNO_ID = "aline";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const CRONOGRAMA: Array<{ dia: number; treinoLetra: "A" | "B" | "C" | "D" | "E" | null }> = [
  { dia: 0, treinoLetra: null },   // Dom descanso
  { dia: 1, treinoLetra: "A" },    // Seg
  { dia: 2, treinoLetra: "B" },    // Ter
  { dia: 3, treinoLetra: "C" },    // Qua
  { dia: 4, treinoLetra: "D" },    // Qui
  { dia: 5, treinoLetra: "E" },    // Sex
  { dia: 6, treinoLetra: null },   // Sáb descanso
];

export default async function AlunoHomePage() {
  const [aluno, treinos, checkInHoje, logbook] = await Promise.all([
    getAluno(ALUNO_ID),
    listTreinos(ALUNO_ID),
    getCheckInHoje(ALUNO_ID),
    listLogbookByAluno(ALUNO_ID, 200),
  ]);
  if (!aluno) return null;

  const treinosMap = new Map(treinos.map((t) => [t.letra, t]));
  const hojeDow = new Date().getDay();
  const hojeCfg = CRONOGRAMA.find((c) => c.dia === hojeDow);
  const treinoHoje = hojeCfg?.treinoLetra ? treinosMap.get(hojeCfg.treinoLetra) : null;
  const dias = diasAte(aluno.acesso_ate);
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
  const logsSemana = logbook.filter((log) => new Date(log.data) >= seteDiasAtras);
  const volumeSemana = logsSemana.reduce(
    (acc, log) => acc + (log.carga_kg ?? 0) * (log.reps ?? 0),
    0
  );
  const maiorCarga = logbook.reduce((max, log) => Math.max(max, log.carga_kg ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Saudação */}
      <header className="flex items-center gap-3">
        <Avatar nome={aluno.profile?.nome ?? "?"} size={48} />
        <div className="flex-1">
          <div className="text-xs text-fg-subtle uppercase tracking-wider">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          <h1 className="text-xl font-bold leading-tight">
            Bom treino, <span className="text-accent">{aluno.profile?.nome.split(" ")[0]}</span>
          </h1>
        </div>
      </header>

      {/* Check-in diário */}
      <CheckInDiario jaRespondido={!!checkInHoje} />

      {/* Card de status de acesso */}
      {dias !== null && dias <= 7 ? (
        <Card className={dias < 0 ? "border-red/40 bg-red/5" : "border-gold/40 bg-gold/5"}>
          <CardBody className="flex items-center gap-3">
            <span className="text-2xl">{dias < 0 ? "🔒" : "⏰"}</span>
            <div className="flex-1">
              <div className="font-semibold text-sm">
                {dias < 0
                  ? `Acesso vencido há ${Math.abs(dias)} dias`
                  : `Sua mensalidade vence em ${dias} dias`}
              </div>
              <div className="text-xs text-fg-subtle">
                {dias < 0 ? "Renove para continuar treinando." : "Renove para continuidade ininterrupta."}
              </div>
            </div>
            <Button variant={dias < 0 ? "danger" : "gold"} size="sm">
              Renovar
            </Button>
          </CardBody>
        </Card>
      ) : null}

      {/* Treino do dia */}
      {treinoHoje ? (
        <Link href={`/aluno/treino/${treinoHoje.id}`}>
          <Card className="border-accent/40 bg-grain-strong relative overflow-hidden hover:scale-[1.01] transition-transform cursor-pointer">
            <CardBody>
              <Badge tone="accent">Treino de hoje · {DIAS[hojeDow]}</Badge>
              <div className="flex items-center gap-4 mt-3">
                <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center shrink-0">
                  <span className="text-3xl font-black text-bg">{treinoHoje.letra}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-lg leading-tight">{treinoHoje.nome}</h2>
                  <p className="text-xs text-fg-subtle mt-1">Toque pra começar o treino →</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </Link>
      ) : (
        <Card className="border-success/30 bg-success/5">
          <CardBody className="text-center py-6">
            <div className="text-3xl mb-2">😌</div>
            <div className="font-bold text-success">Dia de descanso</div>
            <div className="text-xs text-fg-subtle mt-1">Foque na recuperação. Volta forte amanhã.</div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Seu logbook</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-3 gap-3">
            <AlunoMetric label="Séries na semana" value={String(logsSemana.length)} />
            <AlunoMetric label="Volume registrado" value={`${Math.round(volumeSemana)}kg`} />
            <AlunoMetric label="Maior carga" value={maiorCarga ? `${maiorCarga}kg` : "—"} />
          </div>
          <p className="mt-4 text-xs text-fg-subtle">
            Registre carga e reps durante o treino para o Pedro ajustar progressão com histórico real.
          </p>
        </CardBody>
      </Card>

      {/* Cards de todos os treinos */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-fg-muted mb-3">
          Sua rotina semanal
        </h2>
        <div className="space-y-3">
          {treinos.map((t) => {
            const isHoje = treinoHoje?.id === t.id;
            return (
              <Link key={t.id} href={`/aluno/treino/${t.id}`}>
                <Card className={`hover:border-accent/40 transition-colors cursor-pointer ${isHoje ? "border-accent/40" : ""}`}>
                  <CardBody className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      isHoje ? "bg-accent text-bg" : "bg-accent/10 border border-accent/30 text-accent"
                    }`}>
                      <span className="text-xl font-black">{t.letra}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm leading-tight truncate">{t.nome}</div>
                      <div className="text-xs text-fg-subtle mt-0.5">
                        {DIAS[CRONOGRAMA.find((c) => c.treinoLetra === t.letra)?.dia ?? 0]}
                      </div>
                    </div>
                    <span className="text-fg-subtle text-lg">→</span>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Streak */}
      <Card className="border-gold/30 bg-gold/5">
        <CardBody className="text-center py-6">
          <div className="text-3xl mb-1">🔥</div>
          <div className="font-bold text-gold text-lg">7 dias de sequência</div>
          <div className="text-xs text-fg-muted mt-1">Continue assim, atleta. Último treino {tempoRelativo(aluno.ultimo_treino_em)}.</div>
        </CardBody>
      </Card>
    </div>
  );
}

function AlunoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg px-3 py-3">
      <div className="text-[10px] uppercase tracking-wider text-fg-subtle">{label}</div>
      <div className="mt-1 text-lg font-black text-fg">{value}</div>
    </div>
  );
}
