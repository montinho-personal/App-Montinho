import { describe, expect, it } from "vitest";
import { proximaMedalha, vitrineDeMedalhas } from "./vitrine";
import type { SessaoConquista } from "./regras";

let n = 0;
const s = (dia: string, o: Partial<SessaoConquista> = {}): SessaoConquista => ({ id: `s${++n}`, iniciado_em: `${dia}T13:00:00Z`, status: "concluida", series_planejadas: 10, series_concluidas: 10, ...o });
const ader = (atual = 0, cumpridas = 0, participando = 0) => ({ sequencia: { atual, melhor: atual, semanasCumpridas: cumpridas, semanasParticipando: participando }, semanaAtual: null });

describe("vitrine de medalhas", () => {
  it("10 medalhas na ordem da jornada; conquistadas com data, abertas com progresso real", () => {
    const sessoes = Array.from({ length: 7 }, (_, i) => s(`2026-10-${String(i + 1).padStart(2, "0")}`));
    const ms = vitrineDeMedalhas({ conquistas: [{ codigo: "primeiro_treino", conquistado_em: "2026-10-01T13:00:00Z" }, { codigo: "recorde", conquistado_em: "2026-10-05T13:00:00Z" }], sessoes, aderencia: ader(2, 2, 3), hoje: "2026-10-20" });
    expect(ms.map((m) => m.codigo)).toEqual(["primeiro_treino", "primeira_meta_semanal", "relatorio_mensal", "treinos_10", "semanas_consistentes_4", "primeiro_mes", "treinos_25", "semanas_consistentes_8", "acompanhamento_12_semanas", "treinos_50"]);
    expect(ms[0]).toMatchObject({ conquistada: true, falta: null, nova: false });
    expect(ms.find((m) => m.codigo === "treinos_10")).toMatchObject({ conquistada: false, atual: 7, alvo: 10, falta: "Faltam 3 treino(s) concluído(s)." });
    expect(ms.find((m) => m.codigo === "semanas_consistentes_4")).toMatchObject({ atual: 2, alvo: 4 });
    expect(ms.find((m) => m.codigo === "primeiro_mes")).toMatchObject({ atual: 19, alvo: 28 });
  });
  it("extras, parciais e histórico importado sem aderência não contam como treino concluído", () => {
    const sessoes = [s("2026-10-01"), s("2026-10-02", { modo: "extra" }), s("2026-10-03", { series_concluidas: 2 }), s("2026-10-04", { conta_aderencia: false })];
    const ms = vitrineDeMedalhas({ conquistas: [], sessoes, aderencia: ader(), hoje: "2026-10-05" });
    expect(ms.find((m) => m.codigo === "treinos_10")?.atual).toBe(1);
  });
  it("próxima medalha = a mais perto de sair; ‘nova’ por 7 dias", () => {
    const sessoes = Array.from({ length: 9 }, (_, i) => s(`2026-10-${String(i + 1).padStart(2, "0")}`));
    const ms = vitrineDeMedalhas({ conquistas: [{ codigo: "primeiro_treino", conquistado_em: "2026-10-18T13:00:00Z" }, { codigo: "primeira_meta_semanal", conquistado_em: "2026-10-05T13:00:00Z" }], sessoes, aderencia: ader(1, 1, 2), hoje: "2026-10-20" });
    expect(proximaMedalha(ms)?.codigo).toBe("treinos_10");
    expect(ms[0].nova).toBe(true);
    expect(ms[1].nova).toBe(false);
  });
});
