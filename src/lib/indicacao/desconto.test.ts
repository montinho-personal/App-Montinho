import { describe, expect, it } from "vitest";
import { mensagemUsarDesconto, resumoDesconto, type LinhaIndicacao } from "./desconto";

const l = (id: string, fechou: string | null, usado: string | null = null): LinhaIndicacao => ({ id, created_at: "2026-10-01T10:00:00Z", fechou_em: fechou, desconto_pct: fechou ? 10 : 0, desconto_usado_em: usado });

describe("indicação com desconto", () => {
  it("só conta quem fechou; cadastro sozinho não dá desconto", () => {
    const r = resumoDesconto([l("a", null), l("b", "2026-10-10T10:00:00Z")]);
    expect(r).toMatchObject({ cadastrados: 2, fecharam: 1, pct: 10, aUsar: ["b"], guardado: 0 });
  });
  it("soma até 30% e guarda o que passar, usando primeiro os mais antigos", () => {
    const r = resumoDesconto([l("d", "2026-10-14T10:00:00Z"), l("a", "2026-10-10T10:00:00Z"), l("c", "2026-10-13T10:00:00Z"), l("b", "2026-10-11T10:00:00Z")]);
    expect(r.pct).toBe(30);
    expect(r.aUsar).toEqual(["a", "b", "c"]);
    expect(r.guardado).toBe(10);
  });
  it("o que já foi usado não volta", () => {
    const r = resumoDesconto([l("a", "2026-10-10T10:00:00Z", "2026-10-20T10:00:00Z"), l("b", "2026-10-11T10:00:00Z")]);
    expect(r).toMatchObject({ pct: 10, usado: 10, aUsar: ["b"] });
  });
  it("mensagem para o WhatsApp", () => {
    expect(mensagemUsarDesconto(20, "Ana Souza")).toBe("Oi, Montinho! Aqui é Ana. Ganhei 20% de desconto por indicação no app e quero usar no meu plano. 🎁");
  });
});
