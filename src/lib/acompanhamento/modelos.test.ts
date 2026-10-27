import { describe, expect, it } from "vitest";
import { MODELO_IDS, MODELOS_PADRAO, marcadoresInvalidos, mesclarModelos, preencherModelo } from "./modelos";

describe("modelos de mensagem do personal", () => {
  it("padrões: curtos, sem dado de saúde e sem marcador desconhecido", () => {
    for (const id of MODELO_IDS) {
      expect(MODELOS_PADRAO[id].length).toBeLessThanOrEqual(200);
      expect(MODELOS_PADRAO[id]).not.toMatch(/dor|desconfort|les[aã]o|sono|sintoma|diagn/i);
      expect(marcadoresInvalidos(MODELOS_PADRAO[id])).toEqual([]);
    }
  });
  it("preenche nome (só o primeiro), dias e semanas", () => {
    expect(preencherModelo("Oi, {nome}! {dias} dias e {semanas} semanas.", { nome: "Ana Souza", dias: 12, semanas: 4 })).toBe("Oi, Ana! 12 dias e 4 semanas.");
  });
  it("marcador sem valor some sem deixar espaço sobrando", () => {
    expect(preencherModelo("Oi, {nome}!", { nome: null })).toBe("Oi!");
    expect(preencherModelo("Já são {dias} dias", {})).toBe("Já são dias");
  });
  it("mescla: vazio ou grande demais volta ao padrão", () => {
    const m = mesclarModelos({ ausencia: "  ", queda: "x".repeat(501), retorno: "Voltou, {nome}!" });
    expect(m.ausencia).toBe(MODELOS_PADRAO.ausencia);
    expect(m.queda).toBe(MODELOS_PADRAO.queda);
    expect(m.retorno).toBe("Voltou, {nome}!");
  });
  it("aponta marcador desconhecido", () => {
    expect(marcadoresInvalidos("Oi {apelido}, {nome}")).toEqual(["{apelido}"]);
  });
});
