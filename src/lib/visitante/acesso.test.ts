import { describe, expect, it } from "vitest";
import { codigoValido, descreverPrazo, estadoDoAcesso, fimDoAcesso, gerarCodigo, normalizarCodigo, podeRegistrar, situacaoConvite, type ConviteRegra } from "./acesso";

const base: ConviteRegra = { codigo: "DESAFIO-21", tipo_acesso: "dias", dias: 21, acesso_ate: null, max_usos: 50, usos: 0, valido_ate: null, ativo: true };
const agora = new Date("2026-10-22T15:00:00Z");

describe("convites do Modo Visitante", () => {
  it("normaliza o código digitado", () => {
    expect(normalizarCodigo("  desafio  21 ")).toBe("DESAFIO-21");
    expect(normalizarCodigo("Verão-çá!")).toBe("VERAO-CA");
    expect(codigoValido("DESAFIO-21")).toBe(true);
    expect(codigoValido("AB")).toBe(false);
  });

  it("gera código legível e válido", () => {
    const c = gerarCodigo("desafio", () => 0);
    expect(c).toBe("DESAFIO-AAAA");
    expect(codigoValido(gerarCodigo())).toBe(true);
  });

  it("recusa convite inativo, expirado ou esgotado", () => {
    expect(situacaoConvite(base, agora)).toEqual({ ok: true });
    expect(situacaoConvite(null, agora)).toEqual({ ok: false, motivo: "inexistente" });
    expect(situacaoConvite({ ...base, ativo: false }, agora)).toEqual({ ok: false, motivo: "inativo" });
    expect(situacaoConvite({ ...base, valido_ate: "2026-10-22T14:59:00Z" }, agora)).toEqual({ ok: false, motivo: "expirado" });
    expect(situacaoConvite({ ...base, usos: 50 }, agora)).toEqual({ ok: false, motivo: "esgotado" });
    expect(situacaoConvite({ ...base, max_usos: null, usos: 999 }, agora)).toEqual({ ok: true });
  });

  it("calcula o fim do acesso", () => {
    expect(fimDoAcesso(base, agora)?.toISOString()).toBe("2026-11-12T15:00:00.000Z");
    expect(fimDoAcesso({ ...base, dias: null }, agora)?.toISOString()).toBe("2026-11-21T15:00:00.000Z");
    expect(fimDoAcesso({ ...base, tipo_acesso: "permanente" }, agora)).toBeNull();
    // fim do dia 30/11 em Brasília
    expect(fimDoAcesso({ ...base, tipo_acesso: "ate_data", acesso_ate: "2026-11-30" }, agora)?.toISOString()).toBe("2026-12-01T02:59:59.000Z");
  });

  it("estado do acesso e permissão de registrar", () => {
    expect(estadoDoAcesso(null, agora)).toEqual({ estado: "permanente" });
    expect(estadoDoAcesso("2026-11-12T15:00:00Z", agora)).toMatchObject({ estado: "ativo", diasRestantes: 21 });
    expect(estadoDoAcesso("2026-10-25T15:00:00Z", agora)).toMatchObject({ estado: "vencendo", diasRestantes: 3 });
    expect(estadoDoAcesso("2026-10-22T14:00:00Z", agora).estado).toBe("vencido");
    expect(podeRegistrar("visitante", "2026-10-22T14:00:00Z", agora)).toBe(false);
    expect(podeRegistrar("consultoria", "2026-10-22T14:00:00Z", agora)).toBe(true);
    expect(podeRegistrar("visitante", null, agora)).toBe(true);
  });

  it("descreve o prazo em português", () => {
    expect(descreverPrazo(base)).toBe("21 dias de acesso");
    expect(descreverPrazo({ ...base, tipo_acesso: "ate_data", acesso_ate: "2026-11-30" })).toBe("Acesso até 30/11/2026");
    expect(descreverPrazo({ ...base, tipo_acesso: "permanente" })).toBe("Acesso sem prazo");
  });
});
