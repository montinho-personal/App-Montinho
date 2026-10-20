import { describe, expect, it } from "vitest";
import { salvarPlanoSchema } from "@/lib/validacao/schemas";
import { auditarPrescricao } from "./auditar";
import { PRESCRICAO } from "./miss-terracos-tambore";

const aud = auditarPrescricao(PRESCRICAO);
const T = (l: string) => aud.find((t) => t.letra === l)!;
const E = (l: string, nome: string, n = 0) => T(l).itens.filter((i) => i.nome === nome)[n];
const reps = (l: string, nome: string, n = 0) => E(l, nome, n).series.map((s) => s.reps);

describe("prescrição Miss Terraços Tamboré — conforme a ficha do personal", () => {
  it("passa na mesma validação do montador (zod)", () => {
    expect(salvarPlanoSchema.safeParse(PRESCRICAO).success).toBe(true);
  });

  it("totais: A 6/21/6 · B 6/24/5 · C 7/25/6 · D 6/24/5 · total 25/94/22, ordem A-B-C-D", () => {
    expect(aud.map((t) => [t.letra, t.exercicios, t.series, t.posicoes])).toEqual([["A", 6, 21, 6], ["B", 6, 24, 5], ["C", 7, 25, 6], ["D", 6, 24, 5]]);
    expect(aud.reduce((n, t) => n + t.exercicios, 0)).toBe(25);
    expect(aud.reduce((n, t) => n + t.series, 0)).toBe(94);
    expect(aud.reduce((n, t) => n + t.posicoes, 0)).toBe(22);
  });

  it("ordem dos exercícios preservada", () => {
    expect(T("A").itens.map((i) => i.nome)).toEqual(["Abdominal prancha", "Elevação pélvica com barra", "Agachamento no Smith", "Leg press horizontal (180°)", "Cadeira extensora", "Cadeira abdutora"]);
    expect(T("B").itens.map((i) => i.nome)).toEqual(["Remada baixa pegada aberta", "Remada unilateral halteres", "Puxada frontal pegada aberta pronada", "Crucifixo inverso máquina pronada", "Rosca martelo", "Cadeira abdutora"]);
    expect(T("C").itens.map((i) => i.nome)).toEqual(["Abdominal prancha", "Cadeira abdutora", "Agachamento búlgaro halteres", "Levantamento terra sumô", "Cadeira flexora", "Stiff com halteres", "Panturrilha no leg press horizontal (180°)"]);
    expect(T("D").itens.map((i) => i.nome)).toEqual(["Crucifixo máquina", "Supino inclinado 45° halteres", "Desenvolvimento Arnold", "Elevação lateral com halteres", "Tríceps pulley barra W", "Panturrilha no leg press horizontal (180°)"]);
  });

  it("pirâmides série a série (inclui Leg press 180: 3ª série = 12)", () => {
    expect(reps("A", "Leg press horizontal (180°)")).toEqual(["20", "15", "12", "10"]);
    expect(reps("A", "Leg press horizontal (180°)")[2]).toBe("12");
    expect(reps("A", "Agachamento no Smith")).toEqual(["15", "12", "10", "10"]);
    expect(reps("C", "Agachamento búlgaro halteres")).toEqual(["12", "12", "10", "10"]);
    expect(reps("C", "Levantamento terra sumô")).toEqual(["15", "12", "10", "10"]);
    expect(reps("D", "Desenvolvimento Arnold")).toEqual(["12", "12", "10", "10"]);
    expect(reps("D", "Elevação lateral com halteres")).toEqual(["12", "12", "10", "10"]);
    for (const [l, n] of [["A", "Elevação pélvica com barra"], ["A", "Cadeira extensora"], ["A", "Cadeira abdutora"], ["B", "Remada baixa pegada aberta"], ["B", "Remada unilateral halteres"], ["B", "Puxada frontal pegada aberta pronada"], ["C", "Cadeira abdutora"], ["C", "Cadeira flexora"], ["D", "Crucifixo máquina"], ["D", "Supino inclinado 45° halteres"], ["D", "Tríceps pulley barra W"]])
      expect([n, reps(l, n), E(l, n).tecnica]).toEqual([n, ["20", "15", "12", "10"], "piramide"]);
  });

  it("descansos: informados preservados; não informados ficam sem definição", () => {
    const desc = (l: string, n: string) => E(l, n).series.map((s) => s.descanso);
    expect(desc("A", "Leg press horizontal (180°)")).toEqual([75, 75, 75, 75]);
    expect(desc("A", "Cadeira abdutora")).toEqual([60, 60, 60, 60]);
    expect(desc("A", "Elevação pélvica com barra")).toEqual([90, 90, 90, 90]);
    expect(desc("B", "Remada baixa pegada aberta")).toEqual([null, null, null, null]);
    expect(desc("D", "Crucifixo máquina")).toEqual([null, null, null, null]);
    expect(desc("B", "Cadeira abdutora")).toEqual([60, 60, 60, 60]);
    expect(desc("D", "Panturrilha no leg press horizontal (180°)")).toEqual([60, 60, 60, 60]);
  });

  it("RIR: 0 onde é 0 (não é ‘sem RIR’), 3 onde é 3, vazio onde não foi informado", () => {
    expect(E("A", "Elevação pélvica com barra").rir).toBe(0);
    expect(E("C", "Levantamento terra sumô").rir).toBe(0);
    expect(E("A", "Agachamento no Smith").rir).toBe(3);
    expect(E("B", "Remada baixa pegada aberta").rir).toBeNull();
    expect(E("A", "Abdominal prancha").rir).toBeNull();
    expect(E("B", "Rosca martelo").rir).toBeNull();
  });

  it("três bi-sets: 4 rodadas, sem descanso entre os dois, 60 s após a rodada; sem séries extras", () => {
    const b = aud.flatMap((t) => t.bisets.map((x) => ({ ...x, letra: t.letra })));
    expect(b.map((x) => [x.letra, x.exercicios])).toEqual([["B", ["Crucifixo inverso máquina pronada", "Rosca martelo"]], ["C", ["Stiff com halteres", "Panturrilha no leg press horizontal (180°)"]], ["D", ["Desenvolvimento Arnold", "Elevação lateral com halteres"]]]);
    for (const x of b) expect([x.rodadas, x.descansoEntre, x.descansoRodada]).toEqual([4, 0, 60]);
    expect(reps("C", "Panturrilha no leg press horizontal (180°)")).toEqual(["15", "15", "15", "15"]);
  });

  it("exercício por tempo: prancha 1 × 60 s, descanso 60 s", () => {
    for (const l of ["A", "C"]) expect(E(l, "Abdominal prancha").series).toEqual([{ reps: "60s", descanso: 60 }]);
  });

  it("nenhuma carga, aquecimento ou técnica extra inventada", () => {
    for (const t of PRESCRICAO.treinos) for (const e of t.exercicios) {
      expect(e.carga_alvo).toBeNull();
      expect(e.series_aquecimento).toBe(0);
      expect(["normal", "piramide", "biset", "isometria"]).toContain(e.tecnica);
    }
  });

  it("estimativa de duração pela lógica real do app (referência: 42/48/50/48 min)", () => {
    for (const t of aud) {
      expect(t.estimadoMin).toBeGreaterThan(25);
      expect(t.estimadoMin).toBeLessThan(75);
    }
  });

  it("correspondências confirmadas pelo personal: todos os 25 exercícios ligados à biblioteca", () => {
    const todos = PRESCRICAO.treinos.flatMap((tr) => tr.exercicios);
    expect(todos.every((e) => e.biblioteca_id && e.grupo_origem === "biblioteca")).toBe(true);
    const por = (n: string) => todos.find((e) => e.nome === n)!;
    expect(por("Elevação pélvica com barra").biblioteca_id).toBe("92cc0e3b-48ea-454a-b872-8bac4bc30d28");
    expect(por("Tríceps pulley barra W").biblioteca_id).toBe("b7a3f0c2-5e1d-4c8a-9f2b-0d6e4a1c7b3e");
    expect(por("Leg press horizontal (180°)").biblioteca_id).toBe("e608ec0b-b0e3-45e7-8306-d60f4c91b85f");
    expect(por("Abdominal prancha").tecnica).toBe("isometria");
  });
});
