import { describe, expect, it } from "vitest";
import { treinoPossivel } from "./possivel";
import type { PrioridadeExercicio } from "@/lib/supabase/types-sessoes";

let n = 0;
function ex(nome: string, o: { series?: number; prioridade?: PrioridadeExercicio; grupo?: string; bloco?: string; tecnica?: string } = {}) {
  return { id: `e${++n}`, nome, series: o.series ?? 4, reps: "10", descanso_seg: 90, series_aquecimento: 0, tecnica: (o.tecnica ?? "normal") as "normal", bloco: o.bloco ?? null, unilateral: false, grupo_muscular: (o.grupo ?? "peito") as "peito", prioridade: o.prioridade ?? "normal" };
}
const treino = () => [ex("Supino", { prioridade: "essencial" }), ex("Crucifixo", { prioridade: "adiavel" }), ex("Tríceps corda"), ex("Elevação lateral", { prioridade: "adiavel", grupo: "deltoide_lateral" }), ex("Abdominal", { prioridade: "adiavel", grupo: "abdomen" })];

describe("treino possível hoje", () => {
  it("cabe inteiro → completo, nada muda", () => {
    const r = treinoPossivel({ exercicios: treino(), tempoDisponivelMin: 120, permiteReduzida: true });
    expect(r.status).toBe("completo");
    expect(r.adiados).toEqual([]);
  });

  it("sem autorização do personal → não adapta e explica", () => {
    const r = treinoPossivel({ exercicios: treino(), tempoDisponivelMin: 20, permiteReduzida: false });
    expect(r.status).toBe("nao_autorizado");
    expect(r.explicacao.join(" ")).toMatch(/não liberou/);
  });

  it("remove primeiro 'pode adiar', do fim para o começo, e nunca o essencial", () => {
    const xs = treino();
    const full = treinoPossivel({ exercicios: xs, tempoDisponivelMin: 999, permiteReduzida: true }).originalSeg;
    const r = treinoPossivel({ exercicios: xs, tempoDisponivelMin: Math.floor((full - 60) / 60), permiteReduzida: true });
    expect(r.status).toBe("reduzido");
    expect(r.adiados[0].nome).toBe("Abdominal");
    expect(r.incluidos).toContain(xs[0].id);
    expect(r.estimadoSeg).toBeLessThanOrEqual(r.tempoDisponivelMin * 60);
  });

  it("prioridade muscular do aluno é preservada entre os adiáveis", () => {
    const xs = treino();
    const full = treinoPossivel({ exercicios: xs, tempoDisponivelMin: 999, permiteReduzida: true }).originalSeg;
    const r = treinoPossivel({ exercicios: xs, tempoDisponivelMin: Math.floor((full - 60) / 60), permiteReduzida: true, prioridadesMusculares: ["abdomen"] });
    expect(r.adiados[0].nome).toBe("Elevação lateral");
  });

  it("não encurta descansos: o tempo de cada exercício mantido é o mesmo do completo", () => {
    const xs = treino();
    const r = treinoPossivel({ exercicios: xs, tempoDisponivelMin: 30, permiteReduzida: true });
    const so = treinoPossivel({ exercicios: xs.filter((e) => r.incluidos.includes(e.id)), tempoDisponivelMin: 999, permiteReduzida: true });
    expect(so.originalSeg).toBe(r.estimadoSeg);
  });

  it("essenciais não cabem → inviável, com explicação", () => {
    const xs = [ex("Agachamento", { prioridade: "essencial", series: 6 }), ex("Leg press", { prioridade: "essencial", series: 6 }), ex("Cadeira", { prioridade: "adiavel" })];
    const r = treinoPossivel({ exercicios: xs, tempoDisponivelMin: 15, permiteReduzida: true });
    expect(r.status).toBe("inviavel");
    expect(r.explicacao.join(" ")).toMatch(/essenciais já levam/);
    expect(r.explicacao.join(" ")).toMatch(/não são encurtados/);
  });

  it("volume mínimo: sobrar menos de 40% das séries → inviável", () => {
    const xs = [ex("A", { series: 2, prioridade: "essencial" }), ex("B", { series: 6 }), ex("C", { series: 6 })];
    const r = treinoPossivel({ exercicios: xs, tempoDisponivelMin: 8, permiteReduzida: true });
    expect(r.status).toBe("inviavel");
  });

  it("superset sai inteiro (o bloco é uma unidade)", () => {
    const xs = [ex("Supino", { prioridade: "essencial", series: 3 }), ex("Rosca", { bloco: "S1", tecnica: "superset", prioridade: "adiavel", series: 3 }), ex("Tríceps", { bloco: "S1", tecnica: "superset", series: 3 }), ex("Remada", { series: 3 })];
    const full = treinoPossivel({ exercicios: xs, tempoDisponivelMin: 999, permiteReduzida: true }).originalSeg;
    const r = treinoPossivel({ exercicios: xs, tempoDisponivelMin: Math.floor((full - 30) / 60), permiteReduzida: true });
    const nomes = r.adiados.map((a) => a.nome);
    expect(nomes.includes("Rosca")).toBe(nomes.includes("Tríceps"));
  });
});
