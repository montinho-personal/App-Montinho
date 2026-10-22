import { describe, expect, it } from "vitest";
import { mensagemBoasVindas } from "./boas-vindas-whatsapp";

describe("mensagem de boas-vindas do visitante", () => {
  const m = mensagemBoasVindas({ nome: "Reinaldo Fonseca", objetivo: "forca", frequenciaSemanal: 4, acessoAte: "21/11/2026", appUrl: "https://app-montinho.vercel.app" });
  it("começa com Olá e o primeiro nome", () => {
    expect(m.startsWith("Olá, Reinaldo!")).toBe(true);
    expect(m).not.toMatch(/\bOi\b/);
  });
  it("traz acesso, vídeo, instalação no Android e iPhone, tutorial e meta", () => {
    expect(m).toContain("até 21/11/2026");
    expect(m).toContain("vídeo");
    expect(m).toContain("Android");
    expect(m).toContain("iPhone");
    expect(m).toContain("https://app-montinho.vercel.app");
    expect(m).toContain("Meus treinos");
    expect(m).toContain("comece/treino");
    expect(m).toContain("4 treinos por semana para ganhar força");
  });
  it("com link do vídeo, usa o link", () => {
    expect(mensagemBoasVindas({ nome: null, appUrl: "x", videoUrl: "https://youtu.be/abc" })).toContain("https://youtu.be/abc");
  });
});
