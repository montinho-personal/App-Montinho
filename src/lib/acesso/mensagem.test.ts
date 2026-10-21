import { describe, expect, it } from "vitest";
import { linkWhatsApp, mensagemAcesso } from "./mensagem";

describe("mensagem de acesso do aluno", () => {
  it("leva endereço, e-mail e o passo a passo, sem senha", () => {
    const m = mensagemAcesso({ nome: "Aline de Souza", email: "aline@exemplo.com", urlApp: "https://app-montinho.vercel.app/" });
    expect(m).toContain("Oi, Aline!");
    expect(m).toContain("https://app-montinho.vercel.app/login");
    expect(m).toContain("aline@exemplo.com");
    expect(m).toContain("receber link no e-mail");
    expect(m).toContain("esqueci a senha");
    expect(m.toLowerCase()).not.toContain("senha:");
    expect(m).toContain("Android (Chrome)");
    expect(m).toContain("Instalar app");
    expect(m.indexOf("Android")).toBeLessThan(m.indexOf("iPhone"));
    expect(m).toContain("iPhone (Safari)");
    expect(m).toContain("Adicionar à Tela de Início");
  });
  it("WhatsApp com DDI do Brasil; sem número abre para escolher o contato", () => {
    expect(linkWhatsApp("(11) 98765-4321", "oi")).toBe("https://wa.me/5511987654321?text=oi");
    expect(linkWhatsApp("+55 11 98765-4321", "oi")).toBe("https://wa.me/5511987654321?text=oi");
    expect(linkWhatsApp(null, "a b")).toBe("https://wa.me/?text=a%20b");
    expect(linkWhatsApp("123", "x")).toBe("https://wa.me/?text=x");
  });
});
