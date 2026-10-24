import { describe, expect, it } from "vitest";
import { conviteDoFim } from "./trava";
import type { Oferta } from "./campanhas";

const fim = "2026-10-20T12:00:00.000Z";
const oferta: Oferta = { id: "oferta_desconto", ref: "APP-OFERTA20", titulo: "20%", texto: "t", botao: "Quero", mensagem: "Olá", expiraEm: "2026-10-23T12:00:00.000Z" };

describe("convite do fim dos 30 dias", () => {
  it("só depois do fim do acesso", () => {
    expect(conviteDoFim({ fim, oferta, whatsapp: "5511981063409", agora: new Date("2026-10-19T12:00:00Z") })).toBeNull();
    expect(conviteDoFim({ fim: null, oferta: null, whatsapp: "5511981063409" })).toBeNull();
  });
  it("com oferta, a oferta vai na frente; sem oferta, o convite para continuar", () => {
    const c = conviteDoFim({ fim, oferta, whatsapp: "5511981063409", agora: new Date("2026-10-21T12:00:00Z") })!;
    expect(c.ctaId).toBe("oferta_desconto");
    expect(c.href).toContain("wa.me/5511981063409");
    expect(c.href).toContain(encodeURIComponent("[APP-OFERTA20]"));
    expect(c.abertoAte).toBe("27/10/2026");
    const g = conviteDoFim({ fim, oferta: null, whatsapp: "5511981063409", agora: new Date("2026-10-21T12:00:00Z") })!;
    expect(g.ctaId).toBe("acesso_vencido");
    expect(g.href).toContain(encodeURIComponent("[APP-FIM]"));
  });
});
