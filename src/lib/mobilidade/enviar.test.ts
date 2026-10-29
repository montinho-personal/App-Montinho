import { describe, expect, it } from "vitest";
import { mensagemMobilidade } from "./enviar";

describe("mensagemMobilidade", () => {
  it("chama pelo primeiro nome, leva o link do app e o vídeo", () => {
    const t = mensagemMobilidade("Natália Nascimento", "superiores", "https://app-montinho.vercel.app/");
    expect(t.startsWith("Oi, Natália!")).toBe(true);
    expect(t).toContain("https://app-montinho.vercel.app/aluno/mobilidade/superiores");
    expect(t).toContain("https://www.youtube.com/shorts/Gp9VutEudWQ");
  });
  it("sem nome, só “Oi!”", () => {
    expect(mensagemMobilidade("  ", "inferiores", "https://x.com").startsWith("Oi! Separei")).toBe(true);
  });
});
