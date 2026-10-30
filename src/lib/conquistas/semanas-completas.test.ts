import { describe, expect, it } from "vitest";
import type { Semana } from "@/lib/aderencia/calcular";
import { progressoSemanasCompletas, trofeusDeSemanasCompletas } from "./semanas-completas";

const sem = (inicio: string, status: Semana["status"], meta = 3): Semana => ({ inicio, meta, pontos: 0, concluidas: 0, parciais: 0, extras: 0, pausada: status === "pausada", atual: false, status });
let n = 0;
const s = (dia: string, feitas: number, plan = 20, extra = false) => ({ id: `s${++n}`, iniciado_em: `${dia}T11:00:00Z`, status: "concluida", modo: extra ? "extra" : "normal", series_planejadas: plan, series_concluidas: feitas, treino_id: "t", duracao_seg: 3600 }) as never;
const segunda = (i: number) => new Date(Date.UTC(2026, 0, 5) + i * 7 * 86_400_000).toISOString().slice(0, 10);

describe("semanas completas (não precisam ser seguidas) e Semana Perfeita", () => {
  it("conta semanas cumpridas no total, mesmo com semanas falhadas no meio", () => {
    const semanas = Array.from({ length: 12 }, (_, i) => sem(segunda(i), i % 2 ? "parcial" : "cumprida"));
    const sessoes = semanas.map((w) => s(w.inicio, 20));
    const t = trofeusDeSemanasCompletas(semanas, sessoes);
    expect(t.filter((x) => x.codigo.startsWith("semanas_completas")).map((x) => x.codigo)).toEqual(["semanas_completas_5"]);
    expect(progressoSemanasCompletas(semanas, sessoes)).toEqual({ completas: 6, perfeitas: 6 });
  });

  it("Semana Perfeita: todos os treinos do plano com 100% das séries; extra não atrapalha", () => {
    const w1 = segunda(0), w2 = segunda(1);
    const semanas = [sem(w1, "cumprida"), sem(w2, "cumprida")];
    const sessoes = [s(w1, 20), s(w1, 18), s(w2, 20), s(w2, 20), s(w2, 3, 20, true)];
    const t = trofeusDeSemanasCompletas(semanas, sessoes);
    expect(t.map((x) => x.codigo)).toEqual(["semana_perfeita"]);
    expect(t[0].evidencia.ultimaSemana).toBe(w2);
  });

  it("semana não cumprida nunca é perfeita", () => {
    const w = segunda(0);
    expect(trofeusDeSemanasCompletas([sem(w, "parcial")], [s(w, 20)])).toEqual([]);
  });
});
