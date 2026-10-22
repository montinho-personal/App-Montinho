import { describe, expect, it } from "vitest";
import { alunosParecidos, buscarAlunos, type AlunoIndice } from "./alunos";

const t = (letra: string, nome: string, exs: Array<[string, string | null]>) => ({ letra, nome, exercicios: exs.map(([n, tec]) => ({ nome: n, tecnica: tec })) });
const a = (id: string, nome: string, treinos: AlunoIndice["treinos"], programa: AlunoIndice["programa"] = null): AlunoIndice => ({ id, nome, status: "ativo", modalidade: "consultoria", programa, treinos });

const natalia = a("1", "Natalia Cristina Nascimento", [t("A", "Lower — Quadríceps e abdômen", [["Agachamento no Smith", "piramide"], ["Leg press 45°", "piramide"], ["Cadeira extensora", "piramide"]]), t("B", "Upper — Costas, ombros e bíceps", [["Remada cavalinho", null], ["Desenvolvimento Arnold", "biset"]])], { nome: "Projeto Ex-Merendeira", split: "Upper/Lower", objetivo: "Hipertrofia" });
const adriana = a("2", "Adriana Nascimento", [t("A", "Lower — Quadríceps e glúteos", [["Agachamento no Smith", "piramide"], ["Leg press horizontal", "piramide"], ["Cadeira extensora", "piramide"]])], { nome: "Miss Terraços Tamboré", split: "Upper/Lower/Upper/Lower", objetivo: null });
const denis = a("3", "Denis Cruz", [t("A", "Push — Peito, ombro e tríceps", [["Supino reto com barra", "piramide"], ["Elevação lateral com halteres", null]])], { nome: "Missão Mr. Bellagio", split: "Push/Pull/Legs", objetivo: "Hipertrofia" });
const renata = a("4", "Renata Silva", []);
const todos = [natalia, adriana, denis, renata];
const nomes = (q: string) => buscarAlunos(todos, q).map((r) => r.aluno.nome);

describe("busca do personal (lupa)", () => {
  it("acha pelo nome ou sobrenome, sem acento e por pedaço", () => {
    expect(nomes("natália")).toEqual(["Natalia Cristina Nascimento"]);
    expect(nomes("nascimento")).toEqual(["Adriana Nascimento", "Natalia Cristina Nascimento"]);
    expect(nomes("cruz")).toEqual(["Denis Cruz"]);
    expect(nomes("nat nasc")).toEqual(["Natalia Cristina Nascimento"]);
    expect(nomes("ren")).toEqual(["Renata Silva"]);
  });

  it("acha pela estrutura do treino e diz o motivo", () => {
    const r = buscarAlunos(todos, "remada cavalinho");
    expect(r.map((x) => x.aluno.nome)).toEqual(["Natalia Cristina Nascimento"]);
    expect(r[0]).toMatchObject({ tipo: "estrutura", motivos: ["Treino B: Remada cavalinho"] });
    expect(nomes("agachamento smith")).toEqual(["Adriana Nascimento", "Natalia Cristina Nascimento"]);
    expect(nomes("upper lower")).toEqual(["Adriana Nascimento", "Natalia Cristina Nascimento"]);
    expect(nomes("bi-set")).toEqual(["Natalia Cristina Nascimento"]);
    expect(nomes("piramide")).toHaveLength(3);
    expect(nomes("bellagio")).toEqual(["Denis Cruz"]);
  });

  it("nome vem antes de estrutura", () => {
    const r = buscarAlunos([a("9", "Leg Silva", []), natalia], "leg");
    expect(r.map((x) => [x.aluno.nome, x.tipo])).toEqual([["Leg Silva", "nome"], ["Natalia Cristina Nascimento", "estrutura"]]);
  });

  it("alunos com treino parecido (exercícios em comum)", () => {
    const p = alunosParecidos(natalia, todos);
    expect(p.map((x) => x.aluno.nome)).toEqual(["Adriana Nascimento"]);
    expect(p[0].comuns).toEqual(["Agachamento no Smith", "Cadeira extensora"]);
    expect(p[0].semelhanca).toBeCloseTo(2 / 6);
  });
});
