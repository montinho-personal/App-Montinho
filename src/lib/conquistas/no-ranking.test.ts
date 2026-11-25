import { describe, expect, it } from "vitest";
import { marcarRankingDosNovos, rankingAoGanhar, rankingParaMostrar, textoRanking } from "./no-ranking";

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
    expect(textoRanking({ codigo: "recorde", dados: { ranking: "ja_contou" } }).titulo).toBe("Este recorde não soma no ranking");
    expect(textoRanking({ codigo: "treinos_10", dados: { ranking: "conta" } }).conta).toBe(true);
  });
});
