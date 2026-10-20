import { describe, expect, it } from "vitest";
import { calcularAderencia, type SessaoAderencia } from "./calcular";
import { linhaCentral, ordenarCentral } from "./central";

let n = 0;
const s = (dia: string): SessaoAderencia => ({ id: `c${++n}`, iniciado_em: `${dia}T13:00:00Z`, status: "concluida", series_planejadas: 10, series_concluidas: 10 });
const hoje = "2026-10-21";
const metas = [{ desde: "2026-08-01", meta: 2, origem: "personal" as const }];

function linha(datas: string[], extra: { pausas?: Array<{ inicio: string; fim: string | null }> } = {}) {
  const r = calcularAderencia({ inicio: "2026-08-03", hoje, metas, sessoes: datas.map(s), ...extra });
  return linhaCentral({ id: "a", nome: "Aluno" }, r, datas.length ? `${[...datas].sort().at(-1)}T13:00:00Z` : null, hoje, datas);
}

describe("central de aderência — sinais observáveis", () => {
  it("sem treino há 10+ dias vira sinal de acompanhamento (com o número de dias, sem rótulo)", () => {
    const l = linha(["2026-09-28", "2026-10-01"]);
    const sinal = l.sinais.find((x) => x.tipo === "sem_treino_recente")!;
    expect(sinal.texto).toBe("20 dias sem registrar treino");
    expect(sinal.natureza).toBe("acompanhar");
    expect(JSON.stringify(l.sinais)).not.toMatch(/pregui|desmotiv|disciplin/i);
  });

  it("em pausa combinada não gera alerta de ausência", () => {
    const l = linha(["2026-09-28"], { pausas: [{ inicio: "2026-10-05", fim: null }] });
    expect(l.sinais.map((x) => x.tipo)).toContain("em_pausa");
    expect(l.sinais.map((x) => x.tipo)).not.toContain("sem_treino_recente");
  });

  it("retorno depois de 14+ dias sem treinar sugere reconhecimento", () => {
    const l = linha(["2026-09-20", "2026-10-20"]);
    expect(l.sinais.find((x) => x.tipo === "retomou")?.natureza).toBe("reconhecer");
  });

  it("4 semanas seguidas com a meta sugerem reconhecimento; queda forte sugere acompanhamento", () => {
    const boas = ["2026-09-21", "2026-09-22", "2026-09-28", "2026-09-29", "2026-10-05", "2026-10-06", "2026-10-12", "2026-10-13"];
    expect(linha(boas).sinais.map((x) => x.tipo)).toContain("meta_sequencia");
    const queda = ["2026-08-24", "2026-08-25", "2026-08-31", "2026-09-01", "2026-09-07", "2026-09-08", "2026-09-14", "2026-09-15", "2026-10-13"];
    expect(linha(queda).sinais.map((x) => x.tipo)).toContain("queda_frequencia");
  });

  it("ordenações: maior queda, mais tempo sem treino, melhor evolução", () => {
    const a = { ...linha(["2026-10-13"]), alunoId: "a", nome: "Ana", tendencia: -30, diasDesdeUltima: 8 };
    const b = { ...linha(["2026-10-13"]), alunoId: "b", nome: "Bia", tendencia: 10, diasDesdeUltima: 20 };
    expect(ordenarCentral([b, a], "queda")[0].alunoId).toBe("a");
    expect(ordenarCentral([a, b], "tempo_sem_treino")[0].alunoId).toBe("b");
    expect(ordenarCentral([a, b], "melhora")[0].alunoId).toBe("b");
  });
});
