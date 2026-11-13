import { describe, expect, it } from "vitest";
import { acessoVencido, mensagemRenovacao, rotaTravada } from "./renovacao";

describe("acesso vencido do aluno", () => {
  it("o dia do vencimento ainda vale; sem data nunca vence", () => {
    expect(acessoVencido("2026-11-13", "2026-11-13")).toBe(false);
    expect(acessoVencido("2026-11-12", "2026-11-13")).toBe(true);
    expect(acessoVencido(null, "2026-11-13")).toBe(false);
  });
  it("trava treino e relatórios, não o resto", () => {
    for (const r of ["/aluno/treinar", "/aluno/treino/abc", "/aluno/livre/1", "/aluno/evolucao", "/relatorio/x", "/avaliacao/y", "/aluno/cardio"]) expect(rotaTravada(r)).toBe(true);
    for (const r of ["/aluno", "/aluno/jornada", "/aluno/conquistas", "/aluno/ranking", "/aluno/perfil", "/aluno/planos", "/aluno/treinamento"]) expect(rotaTravada(r)).toBe(false);
  });
  it("mensagem com o primeiro nome, os números e o WhatsApp", () => {
    const m = mensagemRenovacao({ nome: "Carol Zorzi", acessoAte: "2026-11-08", resumo: { treinos: 24, trofeus: 31, semanas: 3 }, whatsapp: "5511981063409" });
    expect(m.titulo).toBe("Carol, sua evolução não pode parar agora 🔥");
    expect(m.etiqueta).toBe("Seu acompanhamento terminou em 08/11");
    expect(m.texto).toContain("24 treinos, 31 troféus e 3 semanas com a meta batida");
    expect(m.href).toMatch(/^https:\/\/wa\.me\/5511981063409\?text=/);
    const vazio = mensagemRenovacao({ nome: null, acessoAte: "2026-11-08", resumo: { treinos: 1, trofeus: 0, semanas: 0 }, whatsapp: "55" });
    expect(vazio.titulo.startsWith("Sua evolução")).toBe(true);
    expect(vazio.texto).toContain("1 treino —");
  });
});
