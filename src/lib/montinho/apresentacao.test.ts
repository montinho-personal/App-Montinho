import { describe, expect, it } from "vitest";
import { CONSULTORIA, HISTORIA, linkContato, PACOTE_FLEXIVEL, PRESENCIAL } from "./apresentacao";

describe("Conheça o Montinho", () => {
  it("link do WhatsApp com a origem no fim", () => {
    const l = decodeURIComponent(linkContato("consultoria", "5511981063409"));
    expect(l).toContain("https://wa.me/5511981063409?text=");
    expect(l).toContain("valores");
    expect(l.endsWith("[APP-CONSULTORIA]")).toBe(true);
    expect(decodeURIComponent(linkContato("historia", "55")).endsWith("[APP-HISTORIA]")).toBe(true);
    expect(decodeURIComponent(linkContato("pacote", "55")).endsWith("[APP-PACOTE]")).toBe(true);
    expect(decodeURIComponent(linkContato("presencial", "55")).endsWith("[APP-PRESENCIAL]")).toBe(true);
  });
  it("sem preço e sem promessa", () => {
    const tudo = JSON.stringify({ HISTORIA, CONSULTORIA, PRESENCIAL, PACOTE_FLEXIVEL });
    expect(tudo).not.toMatch(/R\$|garant/i);
  });
});
