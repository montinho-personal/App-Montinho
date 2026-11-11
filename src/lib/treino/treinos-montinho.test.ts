import { describe, expect, it } from "vitest";
import { baseDoTreinoMontinho, focoDoTreino, itensDaSessao, narrativaAutomatica, tecnicasDoTreino } from "./treinos-montinho";

const v = (n: number, tipo = "valida") => Array.from({ length: n }, () => ({ tipo }));
const exs = [
  { biblioteca_id: "a", nome: "Abdominal supra", grupo_muscular: "abdomen", status: "concluido", prescricao: { series: 4, reps: "10-12", tecnica: "piramide" }, series: [...v(1, "aquecimento"), ...v(4)] },
  { biblioteca_id: "b", nome: "Panturrilha no leg", grupo_muscular: "panturrilha", status: "concluido", prescricao: { series: 4, reps: "15-20", tecnica: "dropset", tecnica_config: { aplicar: "principais", series: 2 } }, series: v(4) },
  { biblioteca_id: "c", nome: "Pulado", grupo_muscular: "abdomen", status: "pulado", prescricao: { series: 0 }, series: [] },
  { biblioteca_id: "d", nome: "Livre sem meta", grupo_muscular: "abdomen", status: "concluido", prescricao: { series: 0 }, series: v(3) },
];

describe("Treinos do Montinho", () => {
  it("monta os itens do treino feito (sem pulados, sem carga, meta ou séries feitas)", () => {
    const it = itensDaSessao(exs);
    expect(it.map((i) => [i.nome, i.series, i.reps, i.tecnica])).toEqual([["Abdominal supra", 4, "10-12", "piramide"], ["Panturrilha no leg", 4, "15-20", "dropset"], ["Livre sem meta", 3, "10-12", "normal"]]);
  });
  it("foco, técnicas e narrativa", () => {
    const it = itensDaSessao(exs);
    expect(focoDoTreino(it)).toBe("Abdômen e panturrilhas");
    expect(tecnicasDoTreino(it)).toEqual(["Pirâmide", "Drop-set"]);
    expect(narrativaAutomatica(it)).toMatch(/3 exercícios e 11 séries, com foco em abdômen e panturrilhas/);
  });
  it("vira a base do treino livre com técnica e bi-set", () => {
    const b = baseDoTreinoMontinho({ id: "x", titulo: "T", itens: [{ biblioteca_id: "a", nome: "A", grupo: null, series: 3, reps: "10-12", tecnica: "biset", tecnica_config: null, bloco: "A" }, { biblioteca_id: "b", nome: "B", grupo: null, series: 3, reps: "10-12", tecnica: "biset", tecnica_config: null, bloco: "A" }, { biblioteca_id: "c", nome: "C", grupo: null, series: 4, reps: "8-10", tecnica: "dropset", tecnica_config: { series: 1 }, bloco: null }] });
    expect(b.itens.map((i) => i.juntoComProximo)).toEqual([true, false, false]);
    expect(b.itens[2]).toMatchObject({ tecnica: "dropset", tecnicaConfig: { series: 1 } });
  });
});
