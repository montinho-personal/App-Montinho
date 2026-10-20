import { describe, expect, it } from "vitest";
import { calcularAderencia } from "@/lib/aderencia/calcular";
import { evolucaoInvisivel } from "./invisivel";
import type { SessaoConquista } from "@/lib/conquistas/regras";

let n = 0;
const s = (dia: string, o: Partial<SessaoConquista> & { carga?: number; reps?: number[] } = {}): SessaoConquista => {
  const { carga, reps, ...resto } = o;
  return { id: `i${++n}`, iniciado_em: `${dia}T13:00:00Z`, status: "concluida", series_planejadas: 10, series_concluidas: 10, exercicios: carga ? [{ exercicio_id: "sup", nome: "Supino", series: (reps ?? [10]).map((r) => ({ tipo: "valida", carga_kg: carga, reps: r })) }] : [], ...resto };
};
const metas = [{ desde: "2026-01-01", meta: 2, origem: "personal" as const }];
const rodar = (sessoes: SessaoConquista[], dias = 30, inicio = "2026-05-01") => evolucaoInvisivel({ sessoes, aderencia: calcularAderencia({ inicio, hoje: "2026-10-21", metas, sessoes }), dias, hoje: "2026-10-21", inicioAcompanhamento: inicio });
const tipos = (xs: ReturnType<typeof rodar>) => xs.map((x) => x.tipo);

describe("evolução invisível — dado separado da interpretação", () => {
  it("todo item tem dado, interpretação e critério", () => {
    const xs = ["2026-09-25", "2026-10-01", "2026-10-05", "2026-10-08", "2026-10-12", "2026-10-15"].map((d) => s(d));
    for (const i of rodar(xs)) {
      expect(i.dado.length).toBeGreaterThan(10);
      expect(i.interpretacao.length).toBeGreaterThan(10);
      expect(i.criterio.length).toBeGreaterThan(10);
    }
  });

  it("mais treinos que no período anterior (só com período anterior completo)", () => {
    const xs = ["2026-09-10", "2026-09-25", "2026-10-01", "2026-10-05", "2026-10-08", "2026-10-12"].map((d) => s(d));
    expect(tipos(rodar(xs))).toContain("frequencia");
    expect(tipos(rodar(xs, 30, "2026-09-01"))).not.toContain("frequencia"); // anterior incompleto
  });

  it("mais reps na mesma carga exige registros comparáveis (não usa registro isolado)", () => {
    const um = [s("2026-09-01", { carga: 20, reps: [10] }), s("2026-10-10", { carga: 20, reps: [12] })];
    expect(tipos(rodar(um))).not.toContain("reps_mesma_carga");
    const dois = [s("2026-09-01", { carga: 20, reps: [10] }), s("2026-09-08", { carga: 20, reps: [10] }), s("2026-10-10", { carga: 20, reps: [12] })];
    const item = rodar(dois).find((x) => x.tipo === "reps_mesma_carga")!;
    expect(item.dado).toMatch(/12 repetições com 20 kg/);
    expect(item.interpretacao).toMatch(/sugere/);
  });

  it("desempenho: tendência de força com ressalva; poucas sessões não bastam", () => {
    const sobe = [30, 30, 32, 34, 36].map((c, i) => s(`2026-10-0${i + 1}`, { carga: c, reps: [8] }));
    const item = rodar(sobe).find((x) => x.tipo === "desempenho")!;
    expect(item.interpretacao).toMatch(/estimativa/);
    expect(tipos(rodar(sobe.slice(0, 3)))).not.toContain("desempenho");
  });

  it("retomada após 14+ dias e nada inventado sem dados", () => {
    expect(tipos(rodar([s("2026-09-01"), s("2026-10-10")]))).toContain("retomada");
    expect(rodar([])).toEqual([]);
  });
});
