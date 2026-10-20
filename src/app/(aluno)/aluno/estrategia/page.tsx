import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { estrategiaVigente } from "@/lib/data/estrategias";
import { faseAtual, inicioDasFases } from "@/lib/estrategia/fases";
import { dataLocal } from "@/lib/aderencia/calcular";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { BRAND } from "@/config/brand";
import { dataBR } from "@/lib/format";

export const metadata = { title: "Sua estratégia" };

function Lista({ itens }: { itens: string[] }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {itens.map((i) => (
        <li key={i} className="flex gap-2"><span className="text-success" aria-hidden>✓</span><span>{i}</span></li>
      ))}
    </ul>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{titulo}</CardTitle></CardHeader>
      <CardBody className="space-y-2 text-sm">{children}</CardBody>
    </Card>
  );
}

export default async function EstrategiaPage() {
  const sessao = await requireAlunoPage();
  const [aluno, row] = await Promise.all([getAluno(sessao.alunoId), estrategiaVigente(sessao.alunoId)]);
  if (!row) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Sua estratégia</h1>
        <p className="text-sm text-fg-muted">O {BRAND.name} ainda não publicou sua estratégia aqui.</p>
        <Link href="/aluno" className="text-sm text-accent underline">← Voltar ao início</Link>
      </div>
    );
  }
  const e = row.dados;
  const fase = faseAtual(e.fases, inicioDasFases(aluno?.data_inicio, e.data), dataLocal(new Date()));
  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs uppercase tracking-wider text-fg-subtle">Planejamento exclusivo{e.data ? ` · ${dataBR(e.data)}` : ""}</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight">{e.titulo ?? "Sua estratégia"}</h1>
        {e.frase ? <p className="mt-2 text-sm italic text-fg-muted">“{e.frase}”</p> : null}
      </header>

      <Card>
        <CardBody className="grid grid-cols-2 gap-3 text-sm [overflow-wrap:anywhere]">
          <div><p className="text-[11px] uppercase tracking-wider text-fg-subtle">Objetivo</p><p className="font-semibold">{e.objetivo ?? "—"}</p></div>
          <div><p className="text-[11px] uppercase tracking-wider text-fg-subtle">Rotina</p><p className="font-semibold">{e.diasPorSemana ? `${e.diasPorSemana} dias/semana` : "—"}{e.minutosPorTreino ? ` · ${e.minutosPorTreino} min` : ""}</p></div>
          <div><p className="text-[11px] uppercase tracking-wider text-fg-subtle">Divisão</p><p className="font-semibold">{e.divisao ?? "—"}</p></div>
          <div><p className="text-[11px] uppercase tracking-wider text-fg-subtle">Intensidade</p><p className="font-semibold">{e.intensidade ?? "—"}</p></div>
          {e.prioridades.length ? <div className="col-span-2"><p className="text-[11px] uppercase tracking-wider text-fg-subtle">Prioridades</p><p className="font-semibold">{e.prioridades.join(", ")}</p></div> : null}
        </CardBody>
      </Card>

      {e.fases.length ? (
        <Bloco titulo="Sua evolução, fase a fase">
          <ol className="space-y-2">
            {e.fases.map((f) => {
              const atual = fase && !fase.encerrada && fase.fase.numero === f.numero;
              return (
                <li key={f.numero} className={`rounded-lg border px-3 py-2 ${atual ? "border-fg-muted" : "border-border"}`}>
                  <p className="font-semibold">Fase {f.numero} · {f.nome}{f.semanas ? <span className="font-normal text-fg-muted"> ({f.semanas} semanas)</span> : null}</p>
                  {atual ? <p className="text-xs text-fg-muted">Você está aqui — semana {fase.semana}{fase.semanasFase ? ` de ${fase.semanasFase}` : ""}{fase.fimFase ? ` · até ${dataBR(fase.fimFase)}` : ""}.</p> : null}
                </li>
              );
            })}
          </ol>
        </Bloco>
      ) : null}

      {e.preparacao.length ? (
        <Bloco titulo="Antes de cada treino">
          <p className="font-semibold">{e.preparacao.join(" · ")}</p>
          {e.preparacaoMotivo ? <p className="text-fg-muted">Por quê: {e.preparacaoMotivo}.</p> : null}
        </Bloco>
      ) : null}

      {e.comoPriorizar.length ? <Bloco titulo="Como vamos priorizar"><Lista itens={e.comoPriorizar} /></Bloco> : null}
      {e.logicaExercicios.length ? <Bloco titulo="Como escolhi seus exercícios"><Lista itens={e.logicaExercicios} /></Bloco> : null}
      {e.adaptacoes ? <Bloco titulo="Adaptações para você"><p>{e.adaptacoes}</p></Bloco> : null}
      {e.aerobico ? <Bloco titulo="Aeróbico"><p>{e.aerobico.charAt(0).toUpperCase() + e.aerobico.slice(1)}.</p></Bloco> : null}
      {e.progressao.length ? <Bloco titulo="Regras da sua progressão"><Lista itens={e.progressao} /></Bloco> : null}
      {e.checkinSemanal.length ? (
        <Bloco titulo="Seu papel no processo">
          <p>Toda semana, conte ao {BRAND.name}:</p>
          <div className="flex flex-wrap gap-2">{e.checkinSemanal.map((c) => <span key={c} className="rounded-full border border-border px-3 py-1 text-xs font-semibold">{c}</span>)}</div>
          <p className="text-xs text-fg-muted">Dá para registrar sono e dor no check-in do dia, na tela inicial; cargas e execução você registra durante o treino.</p>
        </Bloco>
      ) : null}
      {e.pontosFortes.length ? <Bloco titulo="Pontos a seu favor"><Lista itens={e.pontosFortes} /></Bloco> : null}
      {e.encerramento ? (
        <Card className="bg-grain-strong">
          <CardBody className="space-y-2 text-sm">
            <p>{e.encerramento}</p>
            <p className="text-xs text-fg-subtle">— {BRAND.fullName}</p>
          </CardBody>
        </Card>
      ) : null}
      <Link href="/aluno" className="inline-block text-sm text-accent underline">← Voltar ao início</Link>
    </div>
  );
}
