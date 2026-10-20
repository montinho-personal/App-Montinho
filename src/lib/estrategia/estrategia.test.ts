import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { estrategiaValida, grupoDoRotulo, lerEstrategia } from "./ler";
import { diasDaEstrategia, modeloDaDivisao } from "./divisao";
import { planoDaEstrategia, prioridadesEmGrupos } from "./plano";
import { salvarPlanoSchema } from "@/lib/validacao/schemas";

// Relatório real do Montinho Strategy, com nomes trocados (dados fictícios).
const TEXTO = fs.readFileSync(path.join(__dirname, "fixtures/relatorio-exemplo.txt"), "utf8");
const e = lerEstrategia(TEXTO);

describe("leitura do relatório do Montinho Strategy", () => {
  it("diagnóstico", () => {
    expect(e).toMatchObject({ aluno: "Fulano Teste", titulo: "Operação Teste", data: "2026-10-07", objetivo: "Recomposição corporal", experiencia: "Intermediário", diasPorSemana: 4, minutosPorTreino: 60 });
    expect(e.prioridades).toEqual(["Costas", "Peito", "Ombros", "Quadríceps", "Posterior de coxa"]);
    expect(e.objetivosSecundarios).toBe("reduzir gordura e mobilidade e flexibilidade");
    expect(estrategiaValida(e)).toBe(true);
  });
  it("estratégia: divisão, intensidade, volume (98 séries) e fases", () => {
    expect(e.divisao).toBe("Push/Pull/Legs/Superiores");
    expect(e.intensidade).toBe("Pirâmide crescente");
    expect(e.adaptacoes).toMatch(/^Iremos trabalha os treinos de pernas apenas com máquinas/);
    expect(e.volume.map((v) => [v.grupo, v.series])).toEqual([["peito", 16], ["costas", 16], ["biceps", 12], ["triceps", 8], ["abdomen", 8], ["posteriores", 8], ["ombro_anterior", 7], ["ombro_lateral", 7], ["ombro_posterior", 4], ["quadriceps", 4], ["adutores", 4], ["panturrilha", 4]]);
    expect(e.volume.reduce((a, v) => a + v.series, 0)).toBe(e.volumeTotal);
    expect(e.fases).toEqual([{ numero: 1, nome: "Adaptação", semanas: 4 }, { numero: 2, nome: "Intensificação", semanas: 4 }, { numero: 3, nome: "Consolidação", semanas: 4 }]);
  });
  it("evolução, acompanhamento e textos", () => {
    expect(e.preparacao).toEqual(["Aquecimento", "Core", "Mobilidade", "Alongamentos"]);
    expect(e.progressao).toHaveLength(5);
    expect(e.checkinSemanal).toEqual(["Sono", "Dor", "Execução", "Cargas", "Recuperação"]);
    expect(e.pontosFortes).toHaveLength(3);
    expect(e.pontosAtencao).toHaveLength(1);
    expect(e.frase).toBe("Constância inteligente: treinar forte, respeitando o seu corpo");
    expect(e.aerobico).toBe("4x ou mais/semana, após a musculação e em dias separados");
    expect(e.encerramento).toMatch(/^Sei que a perna/);
  });
  it("texto que não é relatório → nada inventado", () => {
    const x = lerEstrategia("Um PDF qualquer\nsem nada a ver");
    expect(estrategiaValida(x)).toBe(false);
    expect(x.volume).toEqual([]);
    expect(planoDaEstrategia(x)).toBeNull();
  });
});

describe("dias da semana por músculo", () => {
  it("Push/Pull/Legs/Superiores: séries repartidas sem perder nenhuma", () => {
    const dias = diasDaEstrategia(e);
    expect(dias.map((d) => d.letra)).toEqual(["A", "B", "C", "D"]);
    const total = dias.flatMap((d) => d.grupos).reduce((a, g) => a + g.series, 0);
    expect(total).toBe(98);
    const g = (l: string) => Object.fromEntries(dias.find((d) => d.letra === l)!.grupos.map((x) => [x.grupo, x.series]));
    expect(g("A")).toMatchObject({ peito: 8, triceps: 4, ombro_anterior: 4, ombro_lateral: 4, abdomen: 2 });
    expect(g("B")).toMatchObject({ costas: 8, biceps: 6, ombro_posterior: 2 });
    expect(g("C")).toMatchObject({ posteriores: 8, quadriceps: 4, adutores: 4, panturrilha: 4 });
    expect(g("D")).toMatchObject({ peito: 8, costas: 8, biceps: 6, triceps: 4, ombro_anterior: 3, ombro_lateral: 3, ombro_posterior: 2 });
    expect(g("C").peito).toBeUndefined();
  });
  it("divisões conhecidas e desconhecidas", () => {
    expect(modeloDaDivisao("Upper/Lower", 4)).toHaveLength(4);
    expect(modeloDaDivisao("Push / Pull / Legs", 3)).toHaveLength(3);
    expect(modeloDaDivisao("Full body", 3)).toHaveLength(3);
    expect(modeloDaDivisao("ABCDE do Montinho", 5)).toBeNull();
    expect(grupoDoRotulo("Posterior de coxa")).toBe("posteriores");
  });
});

describe("plano inicial", () => {
  it("passa na mesma validação do montador; dias sem exercícios, com foco e metas", () => {
    const p = planoDaEstrategia(e)!;
    expect(salvarPlanoSchema.safeParse(p).success).toBe(true);
    expect(p.programa).toMatchObject({ nome: "Operação Teste", objetivo: "Recomposição corporal", split: "Push/Pull/Legs/Superiores", duracao_min: 60, modo_semana: "rotativo" });
    expect(p.programa.metas_volume.peito).toEqual({ min: 16, max: 16 });
    expect(p.treinos.every((t) => t.exercicios.length === 0)).toBe(true);
    expect(p.treinos[0].observacoes).toBeNull(); // foco aparece só no montador
    expect(prioridadesEmGrupos(e)).toEqual(["costas", "peito", "ombros", "quadriceps", "posteriores"]);
  });
});

describe("fase atual", () => {
  it("semana dentro da fase, troca de fase e ciclo encerrado", async () => {
    const { faseAtual } = await import("./fases");
    expect(faseAtual(e.fases, "2026-10-07", "2026-10-07")).toMatchObject({ fase: { numero: 1 }, semana: 1, fimFase: "2026-11-03" });
    expect(faseAtual(e.fases, "2026-10-07", "2026-10-20")).toMatchObject({ fase: { numero: 1 }, semana: 2, proxima: { nome: "Intensificação" } });
    expect(faseAtual(e.fases, "2026-10-07", "2026-11-04")).toMatchObject({ fase: { numero: 2 }, semana: 1 });
    expect(faseAtual(e.fases, "2026-10-07", "2027-01-30")).toMatchObject({ encerrada: true, fase: { numero: 3 } });
    expect(faseAtual(e.fases, "2026-10-07", "2026-10-01")).toBeNull();
  });
});
