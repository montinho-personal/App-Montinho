import { describe, expect, it } from "vitest";
import { planoDaSessao } from "./plano-sessao";
import { estimarPrescricao } from "./prescricao";

const ex = (id: string, nome: string) => ({ id, nome, series: 3, reps: "8-12", descanso_seg: 90, series_aquecimento: 0, tecnica: "normal", bloco: null as string | null, unilateral: false, grupo_muscular: null });
const base = [ex("a", "Elevação lateral"), ex("b", "Desenvolvimento"), ex("c", "Elevação frontal"), ex("d", "Extensora"), ex("e", "Flexora"), ex("f", "Abdutora"), ex("g", "Adutora")];
const sessao = (bisets: Record<string, string> = {}) => base.map((e) => ({ id: `se-${e.id}`, exercicio_id: e.id, prescricao: bisets[e.id] ? { bloco_aluno: bisets[e.id] } : {} }));
const tempo = (l: typeof base) => Math.round(estimarPrescricao(l as never).totalSeg / 60);

describe("plano de tempo da sessão", () => {
  it("sem mudança na hora, é a mesma foto do começo", () => {
    expect(planoDaSessao(base, sessao())).toBe(base);
  });

  it("bi-set do aluno DIMINUI o tempo previsto e põe os dois lado a lado", () => {
    const p = planoDaSessao(base, sessao({ c: "J1", e: "J1" }));
    expect(p.map((x) => x.id)).toEqual(["a", "b", "c", "e", "d", "f", "g"]);
    expect(tempo(p)).toBeLessThan(tempo(base));
  });

  it("exercício extra soma o tempo dele (e só ele)", () => {
    const extra = { ...ex("se-x", "Rosca martelo") };
    const s = [...sessao(), { id: "se-x", exercicio_id: null, prescricao: { extra_aluno: true } }];
    const p = planoDaSessao(base, s, [extra]);
    expect(p.map((x) => x.id).at(-1)).toBe("se-x");
    const dif = tempo(p) - tempo(base);
    expect(dif).toBeGreaterThan(2);
    expect(dif).toBeLessThan(8);
  });

  it("troca dividida em duas linhas não conta o exercício duas vezes", () => {
    const s = [...sessao(), { id: "se-a2", exercicio_id: "a", prescricao: {} }];
    const extra = { ...ex("se-x", "Rosca") };
    const p = planoDaSessao(base, [...s, { id: "se-x", exercicio_id: null, prescricao: {} }], [extra]);
    expect(p.filter((x) => x.id === "a")).toHaveLength(1);
  });
});
