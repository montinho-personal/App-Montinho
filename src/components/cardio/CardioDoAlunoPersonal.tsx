// Cardio de um aluno visto pelo personal: sinais, semana, prescrição,
// registrar pelo aluno e histórico. Usado na tela “Treino de cardio” e na aba
// “❤️ Cardio” da ficha.
import { Card, CardBody } from "@/components/ui/Card";
import { pendentesHoje } from "@/lib/cardio/regras";
import type { CardioDoAluno } from "@/lib/data/cardio";
import { PrescricaoCardio } from "./PrescricaoCardio";
import { SemanaCardioCard } from "./SemanaCardioCard";
import { HistoricoCardio, SemanasCardio } from "./HistoricoCardio";
import { SinaisCardio } from "./SinaisCardio";
import { CardioHoje } from "./CardioHoje";

export function CardioDoAlunoPersonal({ alunoId, c, treinos, hoje }: { alunoId: string; c: CardioDoAluno | null; treinos: Array<{ id: string; letra: string; nome: string }>; hoje: string }) {
  if (!c) return <p className="text-sm text-fg-muted">Não foi possível carregar o cardio agora.</p>;
  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-3">
          <p className="font-bold">Prescrição de cardio</p>
          <PrescricaoCardio alunoId={alunoId} prescricoes={c.prescricoes} treinos={treinos} />
        </CardBody>
      </Card>
      <SinaisCardio sinais={c.sinais} />
      <SemanaCardioCard semana={c.semanas.find((w) => w.atual) ?? null} />
      <SemanasCardio semanas={c.semanas} />
      <div className="space-y-2">
        <p className="font-bold">Registrar pelo aluno</p>
        <CardioHoje pendentes={pendentesHoje(c.prescricoes, c.feitos, hoje)} titulo="Prescrito para hoje" compacto rota={`/api/alunos/${alunoId}/cardio/registros`} />
      </div>
      <div className="space-y-2">
        <p className="font-bold">Histórico ({c.marco.feitos} {c.marco.feitos === 1 ? "cardio" : "cardios"})</p>
        <HistoricoCardio feitos={c.feitos} rotaCorrecao={`/api/alunos/${alunoId}/cardio/registros`} personal />
      </div>
    </div>
  );
}

/** “2 cardios · 150 min/semana” ou “Sem cardio prescrito”. */
export function resumoDoCardio(c: CardioDoAluno | null): string {
  if (!c?.prescricoes.length) return "Sem cardio prescrito";
  const min = c.prescricoes.reduce((t, p) => t + p.frequencia_semanal * p.duracao_min, 0);
  return `${c.prescricoes.length} ${c.prescricoes.length === 1 ? "cardio" : "cardios"} · ${min} min/semana`;
}
