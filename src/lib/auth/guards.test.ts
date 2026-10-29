import { describe, expect, it } from "vitest";
import { caminhoStoragePermitido, podeAcessarAluno, redirecionamentoPorPapel, sessaoDoCookieDemo, type SessaoApp } from "./guards";

const alunoA: SessaoApp = { mode: "live", userId: "u-a", nome: "A", role: "aluno", alunoId: "aluno-a" };
const treinador: SessaoApp = { mode: "live", userId: "u-t", nome: "Montinho", role: "treinador", alunoId: null };

describe("autorização — aluno A nunca acessa aluno B", () => {
  it("podeAcessarAluno", () => {
    expect(podeAcessarAluno(alunoA, "aluno-a")).toBe(true);
    expect(podeAcessarAluno(alunoA, "aluno-b")).toBe(false);
    expect(podeAcessarAluno(treinador, "aluno-b")).toBe(true);
    expect(podeAcessarAluno(null, "aluno-a")).toBe(false);
    expect(podeAcessarAluno(alunoA, undefined)).toBe(false);
  });

  it("storage privado por pasta do aluno", () => {
    expect(caminhoStoragePermitido(alunoA, "aluno-a/frente.jpg")).toBe(true);
    expect(caminhoStoragePermitido(alunoA, "aluno-b/frente.jpg")).toBe(false);
    expect(caminhoStoragePermitido(alunoA, "../aluno-b/frente.jpg")).toBe(false);
    expect(caminhoStoragePermitido(treinador, "aluno-b/frente.jpg")).toBe(true);
  });

  it("rotas por papel", () => {
    expect(redirecionamentoPorPapel(null, "/aluno")).toBe("/login?next=%2Faluno");
    expect(redirecionamentoPorPapel("aluno", "/treinador/alunos")).toBe("/aluno");
    expect(redirecionamentoPorPapel("treinador", "/aluno/treinar")).toBe("/treinador");
    expect(redirecionamentoPorPapel("treinador", "/treinador")).toBeNull();
    expect(redirecionamentoPorPapel("aluno", "/aluno/evolucao")).toBeNull();
    // Link do aluno aberto pelo personal: tela equivalente do painel.
    expect(redirecionamentoPorPapel("treinador", "/aluno/mobilidade/superiores")).toBe("/treinador/mobilidade");
    expect(redirecionamentoPorPapel("treinador", "/aluno/conquistas/tribo")).toBe("/treinador/tribo");
    expect(redirecionamentoPorPapel("treinador", "/aluno/cardiologia")).toBe("/treinador");
  });

  it("cookie de demo só aceita personas conhecidas", () => {
    const personas = [
      { chave: "treinador", userId: "t", nome: "Montinho", role: "treinador" as const, alunoId: null },
      { chave: "aluno:aline", userId: "p-aline", nome: "Aline", role: "aluno" as const, alunoId: "aline" },
    ];
    expect(sessaoDoCookieDemo("aluno:aline", personas)?.alunoId).toBe("aline");
    expect(sessaoDoCookieDemo("aluno:qualquer", personas)).toBeNull();
    expect(sessaoDoCookieDemo(undefined, personas)).toBeNull();
    expect(sessaoDoCookieDemo("treinador", personas)?.role).toBe("treinador");
  });
});
