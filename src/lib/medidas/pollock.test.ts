import { describe, expect, it } from "vitest";
import { calcularPollock, densidade7Dobras, extrasDoPollock, gorduraSiri, idadeNaData, valorDoPonto } from "./pollock";

const todos = (v: number) => ({ peitoral: [v], axilar_media: [v], triceps: [v], subescapular: [v], abdominal: [v], suprailiaca: [v], coxa: [v] });

describe("7 dobras (Jackson & Pollock + Siri)", () => {
  it("equações conferidas à mão", () => {
    // Homem, 30 anos, soma 100 mm: D = 1,112 − 0,043499 + 0,0055 − 0,0086478 = 1,0653532
    expect(densidade7Dobras(100, 30, "M")).toBeCloseTo(1.0653532, 6);
    expect(gorduraSiri(1.0653532)).toBeCloseTo(14.64, 1);
    // Mulher, 30 anos, soma 100 mm: D = 1,097 − 0,046971 + 0,0056 − 0,0038484 = 1,0517806
    expect(densidade7Dobras(100, 30, "F")).toBeCloseTo(1.0517806, 6);
    expect(gorduraSiri(1.0517806)).toBeCloseTo(20.63, 1);
  });
  it("valor do ponto: mediana de 3, média de 2, aviso quando não batem", () => {
    expect(valorDoPonto([12, 13, 30])).toEqual({ valor: 13, remedir: false, fora: false });
    expect(valorDoPonto([12, 13])).toEqual({ valor: 12.5, remedir: false, fora: false });
    expect(valorDoPonto([10, 14]).remedir).toBe(true);
    expect(valorDoPonto([null, 0, 200])).toEqual({ valor: null, remedir: false, fora: true });
    expect(valorDoPonto([12, 13])).toMatchObject({ fora: false });
  });
  it("calcula com tudo preenchido, massa magra e gorda pelo peso", () => {
    const r = calcularPollock({ sexo: "M", idade: 30, pesoKg: 80, leituras: { ...todos(14), coxa: [16] } });
    expect(r.completo).toBe(true);
    expect(r.soma).toBe(100);
    expect(r.gorduraPct).toBe(14.6);
    expect(r.massaGordaKg).toBe(11.7);
    expect(r.massaMagraKg).toBe(68.3);
    expect(extrasDoPollock(r).find((x) => x.nome === "Soma das 7 dobras")?.valor).toBe(100);
  });
  it("vai mostrando o que falta, avisa fora da faixa de idade e sem sexo", () => {
    expect(calcularPollock({ sexo: "F", idade: 30, pesoKg: 60, leituras: { triceps: [15] } }).faltam).toHaveLength(6);
    expect(calcularPollock({ sexo: "F", idade: 62, pesoKg: 60, leituras: todos(15) }).avisos.join(" ")).toMatch(/18 a 55/);
    expect(calcularPollock({ sexo: null, idade: 30, pesoKg: 60, leituras: todos(15) }).gorduraPct).toBeNull();
  });
  it("leitura digitada errada (fora de 2–80 mm) não entra na conta e avisa", () => {
    const r = calcularPollock({ sexo: "F", idade: 30, pesoKg: 60, leituras: { ...todos(15), triceps: [15, 150] } });
    expect(r.pontos.triceps).toBe(15);
    expect(r.fora).toEqual(["triceps"]);
    expect(r.avisos.join(" ")).toMatch(/fora de 2 a 80 mm.*Tríceps/);
  });
  it("conta conferida à mão (mulher, 7 dobras) e arredondamentos", () => {
    // Mulher, 25 anos, soma 120 mm: D = 1,097 − 0,0563652 + 0,008064 − 0,003207 = 1,0454918 → %G = 23,46
    const r = calcularPollock({ sexo: "F", idade: 25, pesoKg: 62, leituras: { peitoral: [10], axilar_media: [12], triceps: [20], subescapular: [15], abdominal: [25], suprailiaca: [18], coxa: [20] } });
    expect(r.soma).toBe(120);
    expect(r.densidade).toBe(1.0455);
    expect(r.gorduraPct).toBe(23.5);
    expect(r.massaGordaKg).toBe(14.6);
    expect(r.massaMagraKg).toBe(47.4);
  });
  it("idade na data da avaliação", () => {
    expect(idadeNaData("1990-11-15", "2026-10-30")).toBe(35);
    expect(idadeNaData("1990-10-30", "2026-10-30")).toBe(36);
    expect(idadeNaData(null, "2026-10-30")).toBeNull();
  });
});
