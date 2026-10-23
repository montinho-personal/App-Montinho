import { describe, expect, it } from "vitest";
import { casarExercicio, lerLinha, lerTreinoEscrito } from "./importar-treino";

const BIB = [
  { id: "supino", nome: "Supino reto com barra", sinonimos: ["supino reto", "supino"] },
  { id: "puxada", nome: "Puxada frontal na polia", sinonimos: ["puxada frente", "pulldown"] },
  { id: "leg", nome: "Leg press 45°", sinonimos: ["leg press", "leg 45"] },
  { id: "rosca", nome: "Rosca direta com barra", sinonimos: ["rosca direta"] },
  { id: "elev", nome: "Elevação lateral com halteres", sinonimos: ["elevação lateral"] },
];

describe("ler uma linha de treino", () => {
  it("séries × repetições, carga e descanso", () => {
    expect(lerLinha("Supino reto 4x10 30kg descanso 60s")).toMatchObject({ nome: "Supino reto", series: 4, reps: "10", cargaKg: 30, descansoSeg: 60 });
    expect(lerLinha("3 x 8-12 Puxada frente")).toMatchObject({ nome: "Puxada frente", series: 3, reps: "8-12" });
    expect(lerLinha("Leg press 4x12/10/8")).toMatchObject({ series: 4, reps: "8-12" });
    expect(lerLinha("1) Rosca direta 3x12 12,5 kg 1 min")).toMatchObject({ nome: "Rosca direta", series: 3, reps: "12", cargaKg: 12.5, descansoSeg: 60 });
  });
  it("jeito de falar (voz): por extenso e “séries de”", () => {
    expect(lerLinha("supino três séries de doze")).toMatchObject({ nome: "Supino", series: 3, reps: "12" });
    expect(lerLinha("aquele de puxar quatro séries de dez a doze")).toMatchObject({ series: 4, reps: "10-12" });
    expect(lerLinha("elevação lateral 3 de 15")).toMatchObject({ nome: "Elevação lateral", series: 3, reps: "15" });
  });
  it("sem números: fica com o padrão e a pessoa ajusta", () => {
    expect(lerLinha("Cadeira extensora")).toMatchObject({ nome: "Cadeira extensora", series: 3, reps: "10-12" });
    expect(lerLinha("4x10")).toBeNull();
  });
});

describe("achar na biblioteca", () => {
  it("nome ou sinônimo igual = certeza; parecido; nada = nome da pessoa", () => {
    expect(casarExercicio("supino reto", BIB)).toEqual({ id: "supino", confianca: "certeza" });
    expect(casarExercicio("Leg Press", BIB)).toEqual({ id: "leg", confianca: "certeza" });
    expect(casarExercicio("elevacao lateral halteres", BIB).id).toBe("elev");
    expect(casarExercicio("aquele de puxar", BIB)).toEqual({ id: null, confianca: "nenhuma" });
  });
});

describe("ler o treino inteiro", () => {
  it("vários treinos com cabeçalho (como vem do WhatsApp ou do papel)", () => {
    const t = lerTreinoEscrito("Treino A - Peito e tríceps\n1. Supino reto 4x10 30kg\n2. Tríceps corda 3x12\n\nTreino B: Costas\n- Puxada frente 4x10\n- Remada baixa 3x12", BIB);
    expect(t.map((x) => x.nome)).toEqual(["Peito e tríceps", "Costas"]);
    expect(t[0].exercicios.map((e) => [e.nome, e.bibliotecaId])).toEqual([["Supino reto", "supino"], ["Tríceps corda", null]]);
    expect(t[1].exercicios[0]).toMatchObject({ bibliotecaId: "puxada", series: 4, reps: "10" });
  });
  it("sem cabeçalho e ditado numa linha só, separado por vírgula", () => {
    const t = lerTreinoEscrito("supino 4x10, leg press 3x12, aquele de puxar 3 séries de 12", BIB);
    expect(t).toHaveLength(1);
    expect(t[0].nome).toBe("Meu treino");
    expect(t[0].exercicios.map((e) => e.nome)).toEqual(["Supino", "Leg press", "Aquele de puxar"]);
    expect(t[0].exercicios[2]).toMatchObject({ bibliotecaId: null, series: 3, reps: "12" });
  });
  it("“Pernas:” e “Dia 1” também abrem treino", () => {
    expect(lerTreinoEscrito("Pernas:\nLeg press 4x10\nDia 2\nRosca direta 3x10", BIB).map((t) => t.nome)).toEqual(["Pernas", "Treino 2"]);
  });
});
