import { describe, expect, it } from "vitest";
import { compararMusculos, compararProtocolos, textoExercicio, versaoDePartida, type ProtocoloComparavel } from "./comparar";

const ex = (nome: string, series = 3, reps = "10-12", tecnica = "Tradicional", descansoSeg: number | null = 90) => ({ nome, series, reps, tecnica, descansoSeg });
const adaptacao: ProtocoloComparavel = {
  fase: "adaptacao",
  treinos: [
    { letra: "A", nome: "Inferiores", ativo: true, vezesPorSemana: 1, exercicios: [ex("Agachamento livre"), ex("Cadeira extensora"), ex("Stiff")] },
    { letra: "B", nome: "Superiores", ativo: true, vezesPorSemana: 1, exercicios: [ex("Supino reto"), ex("Puxada frontal")] },
  ],
};
const intensificacao: ProtocoloComparavel = {
  fase: "intensificacao",
  treinos: [
    { letra: "A", nome: "Inferiores", ativo: true, vezesPorSemana: 1, exercicios: [ex("Agachamento livre", 4, "8-10"), ex("Cadeira extensora", 3, "10-12", "Drop-set"), ex("Leg press 45°")] },
    { letra: "B", nome: "Superiores", ativo: true, vezesPorSemana: 1, exercicios: [ex("Supino reto"), ex("Puxada frontal"), ex("Stiff")] },
    { letra: "C", nome: "Glúteo", ativo: true, vezesPorSemana: 1, exercicios: [ex("Elevação pélvica", 4)] },
  ],
};

describe("comparativo antes × agora", () => {
  const c = compararProtocolos(adaptacao, intensificacao);
  it("resume dias, séries por semana, técnicas e o que entrou/saiu/mudou", () => {
    expect([c.diasAntes, c.diasAgora, c.treinosSemanaAntes, c.treinosSemanaAgora]).toEqual([2, 3, 2, 3]);
    expect([c.seriesSemanaAntes, c.seriesSemanaAgora]).toEqual([15, 23]);
    expect([c.entraram, c.sairam, c.mudaram, c.iguais]).toEqual([3, 1, 2, 2]);
    expect([c.tecnicasAntes, c.tecnicasAgora]).toEqual([0, 1]);
    expect(c.identico).toBe(false);
  });
  it("por treino: o que mudou com o detalhe e quem trocou de treino", () => {
    const a = c.porTreino.find((t) => t.letra === "A")!;
    expect(a.status).toBe("mudou");
    expect(a.itens.find((i) => i.nome === "Agachamento livre")).toEqual({ tipo: "mudou", nome: "Agachamento livre", antes: "3 × 10–12", agora: "4 × 8–10", detalhes: ["séries 3 → 4", "reps 10–12 → 8–10"] });
    expect(a.itens.find((i) => i.nome === "Cadeira extensora")).toMatchObject({ tipo: "mudou", detalhes: ["+ Drop-set"] });
    expect(a.itens.find((i) => i.nome === "Stiff")).toEqual({ tipo: "saiu", nome: "Stiff", antes: "3 × 10–12", foiPara: "B" });
    expect(c.porTreino.find((t) => t.letra === "B")!.itens.find((i) => i.nome === "Stiff")).toMatchObject({ tipo: "entrou", veioDe: "A" });
    expect(c.porTreino.find((t) => t.letra === "C")!.status).toBe("novo");
  });
  it("igual a si mesmo = idêntico", () => {
    expect(compararProtocolos(adaptacao, adaptacao).identico).toBe(true);
  });
  it("texto do exercício", () => {
    expect(textoExercicio(ex("x", 4, "12-10-8", "Rest-pause"))).toBe("4 × 12–10–8 · Rest-pause");
  });
  it("músculos: só os que aparecem, maiores mudanças primeiro", () => {
    const m = compararMusculos([{ grupo: "quadriceps", label: "Quadríceps", total: 6 }, { grupo: "peito", label: "Peitoral", total: 3 }], [{ grupo: "quadriceps", label: "Quadríceps", total: 10 }, { grupo: "peito", label: "Peitoral", total: 3 }, { grupo: "gluteos", label: "Glúteos", total: 0 }]);
    expect(m.map((x) => [x.label, x.antes, x.agora, x.dif])).toEqual([["Quadríceps", 6, 10, 4], ["Peitoral", 3, 3, 0]]);
  });
  it("protocolo de partida: a última versão de outra fase; senão a última salva", () => {
    const v = [{ id: "1", fase: "adaptacao", created_at: "2026-10-01" }, { id: "2", fase: "adaptacao", created_at: "2026-10-10" }, { id: "3", fase: "intensificacao", created_at: "2026-11-10" }];
    expect(versaoDePartida(v, "intensificacao")?.id).toBe("2");
    expect(versaoDePartida(v, "consolidacao")?.id).toBe("3");
    expect(versaoDePartida(v.slice(0, 2), "adaptacao")?.id).toBe("2");
    expect(versaoDePartida([], "adaptacao")).toBeNull();
  });
});
