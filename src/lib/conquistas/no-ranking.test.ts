import { describe, expect, it } from "vitest";
import { marcarRankingDosNovos, rankingAoGanhar, rankingDaLista, rankingParaMostrar, textoRanking } from "./no-ranking";

describe("troféu no ranking", () => {
  it("1º recorde conta, os seguintes não", () => {
    expect(rankingAoGanhar({ codigo: "recorde", referencia: "s1" }, [])).toBe("conta");
    expect(rankingAoGanhar({ codigo: "recorde", referencia: "s2" }, [{ codigo: "recorde", referencia: "s1" }])).toBe("ja_contou");
  });
  it("feriado conta a cada feriado", () => {
    expect(rankingAoGanhar({ codigo: "feriado_musculacao", referencia: "finados:2026" }, [{ codigo: "feriado_musculacao", referencia: "consciencia:2026" }])).toBe("conta");
  });
  it("multimodalidade fica fora", () => {
    expect(rankingAoGanhar({ codigo: "primeiro_wod", referencia: "1" }, [])).toBe("fora");
  });
  it("dois recordes novos no mesmo lote: só o mais antigo conta", () => {
    const a = { codigo: "recorde", referencia: "s1", conquistado_em: "2026-11-01T10:00:00Z" };
    const b = { codigo: "recorde", referencia: "s2", conquistado_em: "2026-11-03T10:00:00Z" };
    const m = marcarRankingDosNovos([b, a], []);
    expect(m.get(a)).toBe("conta");
    expect(m.get(b)).toBe("ja_contou");
  });
  it("troféu antigo sem marca: recorde avisa que conta 1 vez", () => {
    expect(rankingParaMostrar({ codigo: "recorde", dados: {} })).toBe("uma_vez");
    expect(rankingParaMostrar({ codigo: "treinos_10", dados: null })).toBe("conta");
    expect(textoRanking({ codigo: "recorde", dados: { ranking: "ja_contou" } }).titulo).toBe("Este recorde não soma de novo no ranking");
    expect(textoRanking({ codigo: "treinos_10", dados: { ranking: "conta" } }).conta).toBe(true);
  });
  it("Eu voltei e Voltei a Respirar também avisam onde continua valendo", () => {
    const r = textoRanking({ codigo: "eu_voltei", titulo: "Eu voltei", dados: { ranking: "ja_contou" } });
    expect(r.conta).toBe(false);
    expect(r.detalhe).toContain("treinos e de semanas");
    expect(textoRanking({ codigo: "cardio_voltei", titulo: "Voltei a Respirar", dados: { ranking: "conta" } }).detalhe).toContain("1 vez só");
  });
  it("linha do tempo sem marca: o mais antigo de cada código conta", () => {
    const m = rankingDaLista([
      { id: "b", codigo: "eu_voltei", referencia: "2026-11-10", conquistado_em: "2026-11-10T10:00:00Z", dados: {} },
      { id: "a", codigo: "eu_voltei", referencia: "2026-10-01", conquistado_em: "2026-10-01T10:00:00Z", dados: {} },
      { id: "f", codigo: "feriado_cardio", referencia: "finados:2026", conquistado_em: "2026-11-02T10:00:00Z", dados: {} },
    ]);
    expect(m.get("a")).toBe("conta");
    expect(m.get("b")).toBe("ja_contou");
    expect(m.get("f")).toBe("conta");
  });
});
