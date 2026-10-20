import { describe, expect, it } from "vitest";
import { calcularAderencia } from "@/lib/aderencia/calcular";
import { resumoMensal } from "./mensal";
import type { SessaoConquista } from "./regras";

let n = 0;
const s = (dia: string, o: Partial<SessaoConquista> = {}): SessaoConquista => ({ id: `m${++n}`, iniciado_em: `${dia}T13:00:00Z`, status: "concluida", series_planejadas: 10, series_concluidas: 10, duracao_seg: 3000, ...o });
const metas = [{ desde: "2026-01-01", meta: 2, origem: "personal" as const }];

describe("card mensal", () => {
  it("período completo: 30 dias, aderência de 28 dias, tempo e metas", () => {
    const xs = [s("2026-09-28"), s("2026-09-29"), s("2026-10-06"), s("2026-10-13", { modo: "extra" }), s("2026-08-01")];
    const ader = calcularAderencia({ inicio: "2026-07-01", hoje: "2026-10-21", metas, sessoes: xs });
    const r = resumoMensal({ sessoes: xs, aderencia: ader, conquistas: [{ codigo: "recorde", titulo: "Novo recorde pessoal", descricao: "Supino: 12 repetições com 20 kg (antes 10) · Remada: 40 kg", conquistado_em: "2026-10-06T13:00:00Z" }], inicioAcompanhamento: "2026-07-01", hoje: "2026-10-21" });
    expect(r.periodoCompleto).toBe(true);
    expect(r.rotuloPeriodo).toBe("30 dias");
    expect(r.treinos).toBe(3); // extra não conta como treino concluído do programa
    expect(r.tempoTotalMin).toBe(200); // tempo registrado inclui o extra
    expect(r.aderenciaPct).toBe(ader.indices.d28.pct);
    expect(r.metasCumpridas).toBe(1);
    expect(r.evolucao).toBe("Supino: 12 repetições com 20 kg (antes 10)");
  });

  it("período incompleto é rotulado e não mostra aderência como se fosse um mês", () => {
    const xs = [s("2026-10-15"), s("2026-10-16")];
    const ader = calcularAderencia({ inicio: "2026-10-12", hoje: "2026-10-21", metas, sessoes: xs });
    const r = resumoMensal({ sessoes: xs, aderencia: ader, conquistas: [], inicioAcompanhamento: "2026-10-12", hoje: "2026-10-21" });
    expect(r.periodoCompleto).toBe(false);
    expect(r.rotuloPeriodo).toBe("Desde 12/10");
    expect(r.aderenciaPct).toBeNull();
    expect(r.evolucao).toBeNull();
  });
});
