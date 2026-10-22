import { describe, expect, it } from "vitest";
import type { ResultadoAderencia, Semana } from "@/lib/aderencia/calcular";
import { aderenciaDaJanela, alertasDoAluno, resumoPeriodo } from "./calcular";

const sem = (inicio: string, pontos: number, meta: number | null, extra: Partial<Semana> = {}): Semana => ({
  inicio, meta, pontos, concluidas: Math.floor(pontos), parciais: pontos % 1 ? 1 : 0, extras: 0, pausada: false, atual: false, status: meta && pontos >= meta ? "cumprida" : "parcial", ...extra,
});

/** 9 semanas fechadas (as 4 últimas com 3 de 4; as 4 anteriores com 2 de 4, uma pausada) + a atual. */
function central(): ResultadoAderencia {
  const semanas: Semana[] = [
    sem("2026-08-17", 4, 4),
    sem("2026-08-24", 2, 4), sem("2026-08-31", 2, 4), sem("2026-09-07", 0, 4, { pausada: true, status: "pausada" }), sem("2026-09-14", 2, 4),
    sem("2026-09-21", 3, 4), sem("2026-09-28", 3, 4), sem("2026-10-05", 3, 4), sem("2026-10-12", 3, 4),
    sem("2026-10-19", 1.5, 4, { atual: true, status: "em_andamento" }),
  ];
  return {
    semanas,
    semanaAtual: semanas.at(-1)!,
    indices: { semanaAtual: { pct: 38, pontos: 1.5, meta: 4, semanas: 1 }, d28: { pct: 75, pontos: 12, meta: 16, semanas: 4 }, s12: { pct: 0, pontos: 0, meta: 0, semanas: 0 }, total: { pct: 0, pontos: 0, meta: 0, semanas: 0 } },
    sequencia: { atual: 0, melhor: 1, semanasParticipando: 8, semanasCumpridas: 1 },
    dias: {},
  };
}

describe("aderência do relatório = conta do card Consistência", () => {
  it("7 dias = esta semana; 30 dias = últimas 4 semanas fechadas, comparando com as 4 anteriores (pausa fora)", () => {
    const r = central();
    expect(aderenciaDaJanela(r, 7)).toEqual({ pct: 38, anterior: 75, rotulo: "esta semana" });
    // 4 anteriores: 2+2+2 de 12 (a pausada sai da conta) = 50%
    expect(aderenciaDaJanela(r, 30)).toEqual({ pct: 75, anterior: 50, rotulo: "últimas 4 semanas" });
    expect(aderenciaDaJanela(r, 90).rotulo).toBe("últimas 12 semanas");
  });

  it("o resumo usa a central quando ela vem, e diz de onde veio o número", () => {
    const r = resumoPeriodo([], { A: 1, B: 1, C: 1 }, 30, new Date("2026-10-19T12:00:00Z"), central());
    expect(r.aderencia).toBe(75);
    expect(r.aderenciaAnterior).toBe(50);
    expect(r.aderenciaJanela).toBe("últimas 4 semanas");
    expect(r.tendencia).toBe("melhor");
    const sem = resumoPeriodo([], { A: 1 }, 30, new Date("2026-10-19T12:00:00Z"));
    expect(sem.aderenciaJanela).toBeNull();
  });

  it("alerta de aderência pela meta das 2 últimas semanas fechadas", () => {
    const r = central();
    r.semanas.splice(-3, 2, sem("2026-10-05", 1, 4), sem("2026-10-12", 1.5, 4));
    const a = alertasDoAluno({ alunoId: "x", alunoNome: "X", status: "ativo", sessoes: [], frequencia: { A: 1 }, temPlano: true, adaptacoesAbertas: 0, checkinsDorAlta: 0, aderencia: r });
    const al = a.find((x) => x.tipo === "aderencia");
    expect(al?.evidencia).toBe("2,5 de 8 treinos da meta (31%)");
    expect(alertasDoAluno({ alunoId: "x", alunoNome: "X", status: "ativo", sessoes: [], frequencia: { A: 1 }, temPlano: true, adaptacoesAbertas: 0, checkinsDorAlta: 0, aderencia: central() }).some((x) => x.tipo === "aderencia")).toBe(false);
  });
});
