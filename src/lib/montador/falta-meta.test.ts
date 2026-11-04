import { describe, expect, it } from "vitest";
import { calcularVolumeSemanal } from "@/lib/volume/calcular";
import { acimaDaMeta, exerciciosParaGrupo, faltandoNaMeta, seriesSugeridas, serveAoGrupo, treinosParaEncaixar } from "./falta-meta";

const ex = (nome: string, grupo: string, series: number) => ({ nome, grupo, series, aquecimento: 0 }) as never;

describe("faltandoNaMeta", () => {
  const r = calcularVolumeSemanal(
    [{ letra: "A", exercicios: [ex("Supino", "peito", 6), ex("Remada", "costas", 2)] }, { letra: "B", exercicios: [ex("Agachamento", "quadriceps", 14)] }],
    { frequencia: { A: 1, B: 1 }, metas: { peito: { min: 10, max: 12 }, costas: { min: 8, max: 12 }, quadriceps: { min: 8, max: 12 } } },
  );
  it("lista quem está abaixo com quanto falta, o mais longe primeiro", () => {
    const f = faltandoNaMeta(r);
    expect(f.map((x) => [x.grupo, x.falta])).toEqual([["costas", 6], ["peito", 4]]);
  });
  it("prioritário vem antes", () => {
    expect(faltandoNaMeta(r, ["peito"])[0].grupo).toBe("peito");
  });
  it("acima da faixa vira aviso", () => {
    expect(acimaDaMeta(r)).toEqual([{ grupo: "quadriceps", label: expect.any(String), passou: 2 }]);
  });
});

describe("encaixe", () => {
  it("ombros aceita as partes; supra/infra pelo nome", () => {
    expect(serveAoGrupo("ombro_lateral", "Elevação lateral", "ombros")).toBe(true);
    expect(serveAoGrupo("abdomen", "Elevação de pernas", "abdomen_infra")).toBe(true);
    expect(serveAoGrupo("abdomen", "Prancha", "abdomen_infra")).toBe(false);
  });
  it("sugere o treino que já tem o músculo, depois o foco, depois o mais leve", () => {
    const t = (key: string, nome: string, series: number, grupos: string[], foco?: string) => ({ key, letra: key, nome, ativo: true, series, grupos: grupos as never[], nomes: grupos.map(() => "x"), foco });
    const lista = treinosParaEncaixar([t("A", "Superiores", 20, ["peito"]), t("B", "Inferiores", 10, ["quadriceps"]), t("C", "Superiores 2", 18, ["costas"])], "costas", "Costas");
    expect(lista.map((x) => x.key)).toEqual(["C", "B", "A"]);
    expect(lista[0].motivo).toBe("já tem costas");
  });
  it("exercícios: favoritos e mais usados primeiro, os que já estão no treino por último", () => {
    const itens = [{ id: "1", nome: "Remada baixa", grupo: "costas" }, { id: "2", nome: "Puxada", grupo: "costas" }, { id: "3", nome: "Supino", grupo: "peito" }, { id: "4", nome: "Remada curvada", grupo: "costas" }] as never[];
    const r = exerciciosParaGrupo(itens, "costas", { favoritos: new Set(["4"]), uso: new Map([["2", 5]]), jaNoTreino: new Set(["4"]) }) as Array<{ id: string }>;
    expect(r.map((x) => x.id)).toEqual(["2", "1", "4"]);
  });
  it("séries sugeridas de 2 a 4", () => {
    expect([seriesSugeridas(0.5), seriesSugeridas(3), seriesSugeridas(9)]).toEqual([2, 3, 4]);
  });
});

describe("remador meio a meio", () => {
  it("serve para supra e infra; prancha para nenhum", () => {
    expect(serveAoGrupo("abdomen", "Abdominal remador no banco", "abdomen_supra")).toBe(true);
    expect(serveAoGrupo("abdomen", "Abdominal remador", "abdomen_infra")).toBe(true);
    expect(serveAoGrupo("core", "Prancha frontal", "abdomen_infra")).toBe(false);
  });
});
