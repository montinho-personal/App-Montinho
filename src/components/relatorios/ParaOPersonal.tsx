// Bloco “Para o personal” no topo da aba Evolução da ficha do aluno: os mesmos
// alertas do painel inicial (evidência · janela · ação), já com o atalho para
// a aba ou a tela onde se resolve. Server Component.
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import type { AlertaTreinador } from "@/lib/relatorios/calcular";

const DESTINO: Record<AlertaTreinador["tipo"], { rotulo: string; aba?: string; rota?: string }> = {
  aderencia: { rotulo: "Ver consistência", aba: "consistencia" },
  adaptacao: { rotulo: "Responder", aba: "acompanhamento" },
  desconforto: { rotulo: "Ver check-ins", aba: "checkins" },
  sem_evolucao: { rotulo: "Revisar treino", rota: "treinos" },
  sem_plano: { rotulo: "Montar treino", rota: "treinos" },
  sem_registro: { rotulo: "Enviar acesso", aba: "evolucao" },
};

export function ParaOPersonal({ alunoId, alertas }: { alunoId: string; alertas: AlertaTreinador[] }) {
  const lista = [...alertas].sort((a, b) => a.prioridade - b.prioridade);
  return (
    <Card className={lista.length ? "border-warning/40" : ""}>
      <CardBody className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Para o personal</p>
        {lista.length === 0 ? (
          <p className="text-sm text-fg-muted">Nada pedindo atenção agora: meta em dia, sem pedidos em aberto e sem dor alta nos check-ins.</p>
        ) : (
          <ul className="divide-y divide-border">
            {lista.map((al) => {
              const d = DESTINO[al.tipo];
              const href = d.rota ? `/treinador/alunos/${alunoId}/${d.rota}` : `#${d.aba}`;
              return (
                <li key={al.tipo} className="flex items-start gap-3 py-2.5">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${al.prioridade === 1 ? "bg-red" : al.prioridade === 2 ? "bg-warning" : "bg-fg-subtle"}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{al.evidencia}</p>
                    <p className="text-xs text-fg-subtle">
                      {al.janela} · {al.acao}
                    </p>
                  </div>
                  {al.tipo === "sem_registro" ? null : d.rota ? (
                    <Link href={href} className="alvo shrink-0 text-xs text-accent underline-offset-2 hover:underline">
                      {d.rotulo}
                    </Link>
                  ) : (
                    // Âncora simples: troca a aba da ficha (Tabs escuta o #).
                    <a href={href} className="alvo shrink-0 text-xs text-accent underline-offset-2 hover:underline">
                      {d.rotulo}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
