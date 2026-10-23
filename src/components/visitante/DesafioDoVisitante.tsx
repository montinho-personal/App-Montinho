import { Card, CardBody } from "@/components/ui/Card";
import { desafiosDoAluno } from "@/lib/data/visitantes";
import { listSessoes } from "@/lib/data/sessoes";
import { classificarSessao } from "@/lib/aderencia/calcular";
import { estadoDesafio } from "@/lib/visitante/desafio";
import { dataBR } from "@/lib/visitante/acesso";

const dataCurta = (d: string) => d.split("-").reverse().slice(0, 2).join("/");

/** Modo Visitante: o desafio em que a pessoa entrou, com o progresso. Sem desafio, não mostra nada. */
export async function DesafioDoVisitante({ alunoId }: { alunoId: string }) {
  const desafios = await desafiosDoAluno(alunoId).catch(() => []);
  const d = desafios[0];
  if (!d) return null;
  const sessoes = await listSessoes(alunoId, { limite: 200 });
  const e = estadoDesafio(d, sessoes.filter((s) => classificarSessao(s) === "concluida"));
  const periodo = d.inicio && d.fim ? `De ${dataCurta(d.inicio)} a ${dataCurta(d.fim)}` : d.fim ? `Até ${dataCurta(d.fim)}` : null;
  const status =
    e.estado === "concluido"
      ? `Concluído em ${dataBR(e.concluidoEm)}! Sua medalha está na Jornada.`
      : e.estado === "encerrado"
        ? `O prazo terminou com ${e.feitos} de ${e.meta} treinos. Toda semana conta: bora pela próxima?`
        : e.estado === "em_breve"
          ? `Começa em ${e.diasParaComecar} ${e.diasParaComecar === 1 ? "dia" : "dias"}.`
          : e.diasRestantes
            ? `${e.meta - e.feitos === 1 ? "Falta" : "Faltam"} ${e.meta - e.feitos} ${e.meta - e.feitos === 1 ? "treino" : "treinos"} · ${e.diasRestantes} ${e.diasRestantes === 1 ? "dia" : "dias"} para terminar.`
            : `${e.meta - e.feitos === 1 ? "Falta" : "Faltam"} ${e.meta - e.feitos} ${e.meta - e.feitos === 1 ? "treino" : "treinos"}.`;
  return (
    <Card className={e.estado === "concluido" ? "border-accent bg-accent-soft" : "border-accent/40"}>
      <CardBody className="space-y-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Seu desafio</p>
          <p className="font-bold leading-tight">{d.nome}</p>
          {d.descricao ? <p className="mt-1 text-sm text-fg-muted">{d.descricao}</p> : null}
          {periodo ? <p className="mt-1 text-xs text-fg-subtle">{periodo} · meta: {d.metaTreinos} treinos concluídos</p> : null}
        </div>
        <div className="flex gap-1.5" role="img" aria-label={`${e.feitos} de ${e.meta} treinos`}>
          {Array.from({ length: e.meta }, (_, i) => (
            <span key={i} className={`h-2.5 flex-1 rounded-full ${i < e.feitos ? "bg-accent" : "bg-white/10"}`} />
          ))}
        </div>
        <p className="text-sm">
          <strong>{e.feitos} de {e.meta}</strong> · {status}
        </p>
      </CardBody>
    </Card>
  );
}
