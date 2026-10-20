"use client";

// Painel compacto de duração estimada de um treino (montador). Os números vêm
// de estimarDuracao(); nada aqui é valor de exemplo.

import { useState } from "react";
import { formatarDuracao, PARAMETROS_TEMPO_PADRAO, type ParametrosTempo, type ResultadoTempo } from "@/lib/tempo/estimar";

type Props = {
  resultado: ResultadoTempo;
  /** Parâmetros efetivos (app → treinador → treino). */
  efetivos: ParametrosTempo;
  /** Ajustes só deste treino. */
  doTreino: Partial<ParametrosTempo>;
  tempoAlvo: string;
  onTreino: (t: Partial<ParametrosTempo>) => void;
  onTempoAlvo: (min: string) => void;
  onSalvarPadrao: (t: Partial<ParametrosTempo>) => void;
};

const CAMPOS: Array<{ k: keyof ParametrosTempo; rotulo: string; ajuda: string; passo?: number }> = [
  { k: "descansoEntreSeriesSeg", rotulo: "Descanso entre séries (s)", ajuda: "Vale quando a série/exercício não tem descanso próprio." },
  { k: "descansoAposExercicioSeg", rotulo: "Descanso após o exercício (s)", ajuda: "Depois do último set, antes do próximo exercício. Não conta após o último." },
  { k: "segundosPorRep", rotulo: "Segundos por repetição", ajuda: "Usado quando o exercício não tem cadência prescrita (estimativa).", passo: 0.5 },
  { k: "transicaoSeg", rotulo: "Transição entre exercícios (s)", ajuda: "Trocar aparelho, ajustar carga/banco, deslocar." },
  { k: "preparacaoInicialSeg", rotulo: "Preparação inicial (s)", ajuda: "Chegada ao primeiro exercício." },
  { k: "descansoAquecimentoSeg", rotulo: "Descanso do aquecimento (s)", ajuda: "Após cada série de aquecimento." },
];

const minutos = (s: number) => Math.round(s / 60);

export function PainelTempo({ resultado, efetivos, doTreino, tempoAlvo, onTreino, onTempoAlvo, onSalvarPadrao }: Props) {
  const [aberto, setAberto] = useState(false);
  const alvo = Number(tempoAlvo) || null;
  const totalMin = minutos(resultado.totalSeg);
  const diferenca = alvo ? totalMin - alvo : null;

  if (!resultado.series) return null;

  return (
    <div className="border-b border-border bg-surface/50 px-3 py-2 text-[12px]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-bold">
          ⏱ Tempo estimado: <span className="font-mono text-accent">{formatarDuracao(resultado.totalSeg)}</span>
        </span>
        <span className="text-fg-muted">
          Execução {minutos(resultado.execucaoSeg)} min · Descanso {minutos(resultado.descansoSeg)} min · Transições {minutos(resultado.transicaoSeg)} min
        </span>
        <span className="text-fg-subtle">
          {resultado.exercicios} exercício(s) · {resultado.series} série(s)
        </span>
        {alvo ? (
          <span className={Math.abs(diferenca!) <= 5 ? "text-success" : diferenca! > 0 ? "text-warning" : "text-fg-muted"} title="Comparação com o tempo-alvo deste treino (orientativo)">
            alvo {alvo} min: {diferenca === 0 ? "no alvo" : diferenca! > 0 ? `${diferenca} min acima` : `${-diferenca!} min abaixo`}
          </span>
        ) : null}
        <button type="button" onClick={() => setAberto((v) => !v)} className="ml-auto text-accent underline-offset-2 hover:underline" aria-expanded={aberto}>
          {aberto ? "fechar tempos" : "ajustar tempos"}
        </button>
      </div>
      {resultado.estimativas.length ? <p className="mt-1 text-[11px] text-fg-subtle">Estimativa: {resultado.estimativas.join(" ")}</p> : null}

      {aberto ? (
        <div className="mt-2 space-y-2 rounded-md border border-border bg-card p-2.5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label className="space-y-0.5">
              <span className="block text-[11px] text-fg-muted">Tempo-alvo do treino (min)</span>
              <input inputMode="numeric" value={tempoAlvo} placeholder="—" onChange={(e) => onTempoAlvo(e.target.value.replace(/\D/g, "").slice(0, 3))} className="h-8 w-full rounded border border-border bg-bg px-2 font-mono" />
            </label>
            {CAMPOS.map((c) => (
              <label key={c.k} className="space-y-0.5" title={c.ajuda}>
                <span className="block text-[11px] text-fg-muted">{c.rotulo}</span>
                <input
                  inputMode="decimal"
                  value={doTreino[c.k] !== undefined ? String(doTreino[c.k]) : ""}
                  placeholder={String(efetivos[c.k])}
                  onChange={(e) => {
                    const v = e.target.value.replace(",", ".").replace(/[^0-9.]/g, "");
                    const novo = { ...doTreino };
                    if (v === "") delete novo[c.k];
                    else (novo[c.k] as number) = Number(v);
                    onTreino(novo);
                  }}
                  className="h-8 w-full rounded border border-border bg-bg px-2 font-mono"
                />
              </label>
            ))}
          </div>
          <label className="inline-flex items-center gap-1.5 text-[11px] text-fg-muted" title="Se marcado, a transição acontece durante o descanso após o exercício e só o excedente é somado.">
            <input
              type="checkbox"
              checked={efetivos.transicaoDentroDoDescanso}
              onChange={(e) => onTreino({ ...doTreino, transicaoDentroDoDescanso: e.target.checked })}
            />
            transição acontece durante o descanso (não soma em separado)
          </label>
          <p className="text-[11px] text-fg-subtle">
            Em branco = seu padrão (ou o do app: {PARAMETROS_TEMPO_PADRAO.descansoEntreSeriesSeg} s entre séries, {PARAMETROS_TEMPO_PADRAO.descansoAposExercicioSeg} s após o exercício). Descansos definidos no exercício ou na série valem sobre estes. A estimativa é orientativa: não reduza descansos só para caber no tempo.
          </p>
          <button type="button" onClick={() => onSalvarPadrao({ ...efetivos })} className="rounded border border-border px-2 py-1 text-[11px] font-semibold text-fg-muted hover:text-fg">
            Usar estes tempos como meu padrão (todos os alunos)
          </button>
        </div>
      ) : null}
    </div>
  );
}
