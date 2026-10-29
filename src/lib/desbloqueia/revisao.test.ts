import { describe, expect, it } from "vitest";
import { filaDeRevisao, proximaRevisao, resumoRevisao, revisaoDevida } from "./revisao";

const errou = (o: Record<string, unknown> = {}) => ({ conteudo_id: "d01", resposta: "verdade", acertou: false, explorado_em: "2026-10-01T12:00:00Z", updated_at: "2026-10-01T12:00:00Z", revisoes: 0, revisao_em: null, revisao_acertou: null, ...o });

describe("Revisão do Mito ou verdade", () => {
  it("errou: volta 3 dias depois", () => {
    expect(proximaRevisao(errou())).toBe("2026-10-04T12:00:00.000Z");
    expect(revisaoDevida(errou(), "2026-10-04T11:59:00Z")).toBe(false);
    expect(revisaoDevida(errou(), "2026-10-04T12:00:00Z")).toBe(true);
  });
  it("errou de novo na revisão: 7 e depois 14 dias", () => {
    expect(proximaRevisao(errou({ revisoes: 1, revisao_em: "2026-10-05T12:00:00Z", revisao_acertou: false }))).toBe("2026-10-12T12:00:00.000Z");
    expect(proximaRevisao(errou({ revisoes: 2, revisao_em: "2026-10-12T12:00:00Z", revisao_acertou: false }))).toBe("2026-10-26T12:00:00.000Z");
    expect(proximaRevisao(errou({ revisoes: 5, revisao_em: "2026-10-12T12:00:00Z", revisao_acertou: false }))).toBe("2026-10-26T12:00:00.000Z");
  });
  it("acertou na 1ª ou na revisão: não volta", () => {
    expect(proximaRevisao(errou({ acertou: true }))).toBeNull();
    expect(proximaRevisao(errou({ revisoes: 1, revisao_em: "2026-10-05T12:00:00Z", revisao_acertou: true }))).toBeNull();
    expect(proximaRevisao(errou({ resposta: null, acertou: null }))).toBeNull();
  });
  it("fila: só publicadas e na hora, das mais antigas; resumo conta aprendidas", () => {
    const ps = [errou({ conteudo_id: "d02", updated_at: "2026-10-02T12:00:00Z" }), errou(), errou({ conteudo_id: "d99" }), errou({ conteudo_id: "d03", revisoes: 1, revisao_em: "2026-10-05T12:00:00Z", revisao_acertou: true })];
    expect(filaDeRevisao(ps, "2026-10-10T00:00:00Z", new Set(["d01", "d02", "d03"])).map((p) => p.conteudo_id)).toEqual(["d01", "d02"]);
    const r = resumoRevisao(ps, "2026-10-10T00:00:00Z", new Set(["d01", "d02", "d03"]));
    expect(r).toMatchObject({ agora: 2, primeira: "d01", aprendidas: 1 });
  });
});
