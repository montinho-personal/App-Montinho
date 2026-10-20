import { describe, expect, it } from "vitest";
import { calcularVolumeSemanal, type DiaVolume } from "./calcular";
import { bonusTecnica, descreverTecnica, fatorRir } from "./tecnicas";

const dia = (exs: DiaVolume["exercicios"]): DiaVolume[] => [{ letra: "A", exercicios: exs }];
const total = (dias: DiaVolume[], opc: Parameters<typeof calcularVolumeSemanal>[1], grupo = "triceps") =>
  calcularVolumeSemanal(dias, opc).linhas.find((l) => l.grupo === grupo)!;

describe("técnicas avançadas no volume", () => {
  it("drop set na regra moderada: 3 séries com 2 drops na última = 3 + 1 (teto 2 por série)", () => {
    const l = total(dia([{ id: "1", nome: "Tríceps corda", grupo: "triceps", series: 3, tecnica: "dropset", tecnicaExtras: 2, tecnicaSeries: 1 }]), { frequencia: { A: 1 } });
    expect(l.total).toBe(4);
    expect(l.deTecnicas).toBe(1);
  });

  it("drop set com muitos drops respeita o teto (1 série nunca vira mais que 2)", () => {
    expect(bonusTecnica({ tecnica: "dropset", tecnicaExtras: 6, tecnicaSeries: 1 }, 3, "moderada").bonus).toBe(1);
  });

  it("regra clássica: drops e mini-séries não somam (comportamento antigo)", () => {
    const l = total(dia([{ id: "1", nome: "Tríceps corda", grupo: "triceps", series: 3, tecnica: "dropset", tecnicaExtras: 2 }]), { frequencia: { A: 1 }, regraTecnicas: "classica" });
    expect(l.total).toBe(3);
    expect(l.deTecnicas).toBe(0);
  });

  it("regra alta: cada drop vale 1 série", () => {
    const l = total(dia([{ id: "1", nome: "Tríceps corda", grupo: "triceps", series: 3, tecnica: "dropset", tecnicaExtras: 2, tecnicaSeries: 1 }]), { frequencia: { A: 1 }, regraTecnicas: "alta" });
    expect(l.total).toBe(5);
  });

  it("rest-pause sem informação: assume 2 mini-séries na última série e avisa", () => {
    const r = calcularVolumeSemanal(dia([{ id: "1", nome: "Supino", grupo: "peito", series: 3, tecnica: "rest_pause" }]), { frequencia: { A: 2 } });
    const l = r.linhas.find((x) => x.grupo === "peito")!;
    expect(l.total).toBe(8); // (3 + 1) × 2 sessões
    expect(r.avisos.some((a) => a.includes("assumimos"))).toBe(true);
  });

  it("myo-reps: padrão é a técnica em todas as séries (3 minis = +1 por série)", () => {
    const l = total(dia([{ id: "1", nome: "Elevação lateral", grupo: "ombro_lateral", series: 2, tecnica: "myo_reps" }]), { frequencia: { A: 1 }, agruparOmbros: false }, "ombro_lateral");
    expect(l.total).toBe(4);
    expect(bonusTecnica({ tecnica: "myo_reps", tecnicaExtras: 5 }, 1, "moderada").bonus).toBeCloseTo(1.5);
  });

  it("aquecimento continua fora e a técnica nunca passa das séries válidas", () => {
    const l = total(dia([{ id: "1", nome: "Tríceps corda", grupo: "triceps", series: 3, seriesAquecimento: 3, tecnica: "dropset", tecnicaExtras: 2 }]), { frequencia: { A: 1 } });
    expect(l?.total ?? 0).toBe(0);
    expect(bonusTecnica({ tecnica: "dropset", tecnicaExtras: 1, tecnicaSeries: 9 }, 2, "moderada").seriesComTecnica).toBe(2);
  });

  it("cluster, superset, bi-set e pirâmide contam 1 por série", () => {
    for (const tecnica of ["cluster", "superset", "biset", "piramide", "isometria"] as const) {
      const l = total(dia([{ id: "1", nome: "X", grupo: "triceps", series: 4, tecnica }]), { frequencia: { A: 1 } });
      expect(l.total, tecnica).toBe(4);
    }
  });

  it("secundário ponderado acompanha as séries equivalentes da técnica", () => {
    const r = calcularVolumeSemanal(
      dia([{ id: "1", nome: "Supino", grupo: "peito", secundarios: ["triceps"], pesosSecundarios: { triceps: 0.5 }, series: 2, tecnica: "dropset", tecnicaExtras: 2, tecnicaSeries: 1 }]),
      { frequencia: { A: 1 }, incluirSecundario: true }
    );
    expect(r.linhas.find((x) => x.grupo === "peito")!.total).toBe(3);
    expect(r.linhas.find((x) => x.grupo === "triceps")!.secundario).toBe(1.5);
  });

  it("ajuste por RIR (opcional): RIR 4–5 vale meia série, acima de 5 não conta", () => {
    expect([fatorRir(null), fatorRir(2), fatorRir(4), fatorRir(6)]).toEqual([1, 1, 0.5, 0]);
    const exs: DiaVolume["exercicios"] = [{ id: "1", nome: "Rosca", grupo: "biceps", series: 4, rir: 4 }];
    expect(total(dia(exs), { frequencia: { A: 1 } }, "biceps").total).toBe(4);
    expect(total(dia(exs), { frequencia: { A: 1 }, ajustarPorRir: true }, "biceps").total).toBe(2);
  });

  it("descreve a técnica em português para o aluno", () => {
    expect(descreverTecnica({ tecnica: "dropset", tecnicaExtras: 2 }, 3)).toBe("2 drops na última série");
    expect(descreverTecnica({ tecnica: "myo_reps" }, 2)).toBe("3 mini-séries em cada série");
    expect(descreverTecnica({ tecnica: "rest_pause", tecnicaExtras: 1, tecnicaSeries: 2 }, 3)).toBe("1 mini-série nas últimas 2 séries");
    expect(descreverTecnica({ tecnica: "superset" }, 3)).toBeNull();
  });
  it("cada grupo informa quais técnicas usa e quanto cada uma somou", () => {
    const r = calcularVolumeSemanal(
      dia([
        { id: "1", nome: "Tríceps corda", grupo: "triceps", series: 3, tecnica: "dropset", tecnicaExtras: 2, tecnicaSeries: 1 },
        { id: "2", nome: "Tríceps francês", grupo: "triceps", series: 3, tecnica: "superset" },
        { id: "3", nome: "Rosca", grupo: "biceps", series: 3 },
      ]),
      { frequencia: { A: 2 } }
    );
    expect(r.linhas.find((l) => l.grupo === "triceps")!.tecnicas).toEqual({ dropset: 2, superset: 0 });
    expect(r.linhas.find((l) => l.grupo === "biceps")!.tecnicas).toEqual({});
  });
});
