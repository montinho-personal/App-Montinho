import { describe, expect, it } from "vitest";
import { mensagemDoConvite, ofertaDoConvite } from "./mensagem-convite";

describe("mensagem do convite", () => {
  it("a oferta acompanha o prazo do convite", () => {
    expect(ofertaDoConvite({ tipo_acesso: "dias", dias: 30, acesso_ate: null })).toBe("30 dias grátis");
    expect(ofertaDoConvite({ tipo_acesso: "dias", dias: 7, acesso_ate: null })).toBe("7 dias grátis");
    expect(ofertaDoConvite({ tipo_acesso: "dias", dias: null, acesso_ate: null })).toBe("30 dias grátis");
    expect(ofertaDoConvite({ tipo_acesso: "ate_data", dias: null, acesso_ate: "2026-11-30" })).toBe("acesso grátis até 30/11/2026");
    expect(ofertaDoConvite({ tipo_acesso: "permanente", dias: null, acesso_ate: null })).toBe("acesso grátis");
  });

  it("traz a oferta, o treino próprio, a evolução, o ranking e o link", () => {
    const m = mensagemDoConvite("30 dias grátis", "https://app/convite/X", "Montinho");
    expect(m).toContain("Estou te convidando para conhecer o app do Montinho");
    expect(m).toContain("*30 dias grátis*");
    expect(m).toContain("Jornada do Chalalá");
    expect(m).toContain("Adicionar à Tela de Início");
    expect(m).toContain("Instalar app");
    expect(m).toContain("https://app/convite/X");
  });
});
