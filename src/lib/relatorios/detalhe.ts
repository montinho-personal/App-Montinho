// ============================================================================
// Relatório detalhado — tempo, descanso, extras, versões reduzidas,
// disposição antes do treino e interrupções. Só mostra o que é confiável:
// cada métrica tem um mínimo de dados; abaixo disso, vira null (a tela
// explica a ausência em vez de inventar).
// ============================================================================

import { dataLocal } from "@/lib/aderencia/calcular";
import type { SessaoCompleta } from "@/lib/data/sessoes";

export const REGRAS_DETALHE = { minSessoesTempo: 2, minIntervalosDescanso: 10, descansoMinSeg: 15, descansoMaxSeg: 600, toleranciaTempo: 0.15, diasInterrupcao: 14 };

export type CheckinResumo = { muito_bem: number; normal: number; cansado: number; desconforto: number; prefiro_nao: number; sem_resposta: number };

export type DetalheRelatorio = {
  tempo: { sessoes: number; mediaRealMin: number; mediaPlanejadaMin: number | null; dentroDoPrevisto: number | null; comparaveis: number } | null;
  descansoMedianoSeg: number | null;
  intervalosDescanso: number;
  extras: { sessoes: number; minutos: number; series: number };
  reduzidas: { sessoes: number; exerciciosAdiados: number };
  series: { planejadas: number; feitas: number };
  checkin: CheckinResumo;
  interrupcoes: Array<{ de: string; ate: string; dias: number }>;
};

const mediana = (xs: number[]) => {
  const v = [...xs].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

export function detalheRelatorio(todas: SessaoCompleta[], desde: string, hoje: string): DetalheRelatorio {
  const finalizadas = todas.filter((s) => s.status !== "em_andamento");
  const noPeriodo = finalizadas.filter((s) => {
    const d = dataLocal(s.iniciado_em);
    return d >= desde && d <= hoje;
  });
  const programa = noPeriodo.filter((s) => s.modo !== "extra" && s.series_concluidas > 0);

  // Tempo real × planejado (só sessões concluídas com duração plausível).
  const comTempo = programa.filter((s) => s.status === "concluida" && (s.duracao_seg ?? 0) >= 300 && (s.duracao_seg ?? 0) <= 4 * 3600);
  const comparaveis = comTempo.filter((s) => (s.tempo_estimado_seg ?? 0) > 0);
  const tempo =
    comTempo.length >= REGRAS_DETALHE.minSessoesTempo
      ? {
          sessoes: comTempo.length,
          mediaRealMin: Math.round(comTempo.reduce((a, s) => a + (s.duracao_seg ?? 0), 0) / comTempo.length / 60),
          mediaPlanejadaMin: comparaveis.length ? Math.round(comparaveis.reduce((a, s) => a + (s.tempo_estimado_seg ?? 0), 0) / comparaveis.length / 60) : null,
          dentroDoPrevisto: comparaveis.length ? comparaveis.filter((s) => Math.abs((s.duracao_seg ?? 0) / (s.tempo_estimado_seg ?? 1) - 1) <= REGRAS_DETALHE.toleranciaTempo).length : null,
          comparaveis: comparaveis.length,
        }
      : null;

  // Descanso: intervalo entre séries consecutivas do MESMO exercício, só quando
  // marcadas ao vivo (intervalos fora de 15 s–10 min são descartados).
  const intervalos: number[] = [];
  for (const s of programa)
    for (const e of s.exercicios) {
      const t = e.series.filter((x) => x.tipo !== "aquecimento" && x.concluida_em).map((x) => Date.parse(x.concluida_em)).sort((a, b) => a - b);
      for (let i = 1; i < t.length; i++) {
        const seg = (t[i] - t[i - 1]) / 1000;
        if (seg >= REGRAS_DETALHE.descansoMinSeg && seg <= REGRAS_DETALHE.descansoMaxSeg) intervalos.push(seg);
      }
    }

  const extras = noPeriodo.filter((s) => s.modo === "extra" && (s.series_concluidas > 0 || (s.duracao_seg ?? 0) > 0));
  const reduzidas = programa.filter((s) => s.modo === "reduzido");
  const checkin: CheckinResumo = { muito_bem: 0, normal: 0, cansado: 0, desconforto: 0, prefiro_nao: 0, sem_resposta: 0 };
  for (const s of programa) checkin[(s.checkin_pre ?? "sem_resposta") as keyof CheckinResumo]++;

  // Interrupções: intervalos de 14+ dias sem treino que tocam o período.
  const datas = [...new Set(finalizadas.filter((s) => s.series_concluidas > 0 || (s.duracao_seg ?? 0) > 0).map((s) => dataLocal(s.iniciado_em)))].sort();
  const interrupcoes: DetalheRelatorio["interrupcoes"] = [];
  for (let i = 1; i < datas.length; i++) {
    const dias = Math.round((Date.parse(`${datas[i]}T12:00:00Z`) - Date.parse(`${datas[i - 1]}T12:00:00Z`)) / 86_400_000);
    if (dias >= REGRAS_DETALHE.diasInterrupcao && datas[i] >= desde) interrupcoes.push({ de: datas[i - 1], ate: datas[i], dias });
  }

  return {
    tempo,
    descansoMedianoSeg: intervalos.length >= REGRAS_DETALHE.minIntervalosDescanso ? Math.round(mediana(intervalos)) : null,
    intervalosDescanso: intervalos.length,
    extras: { sessoes: extras.length, minutos: Math.round(extras.reduce((a, s) => a + (s.duracao_seg ?? 0), 0) / 60), series: extras.reduce((a, s) => a + s.series_concluidas, 0) },
    reduzidas: { sessoes: reduzidas.length, exerciciosAdiados: reduzidas.reduce((a, s) => a + (((s.snapshot as { reducao?: { adiados?: unknown[] } } | null)?.reducao?.adiados?.length) ?? 0), 0) },
    series: { planejadas: programa.reduce((a, s) => a + s.series_planejadas, 0), feitas: programa.reduce((a, s) => a + s.series_concluidas, 0) },
    checkin,
    interrupcoes,
  };
}
