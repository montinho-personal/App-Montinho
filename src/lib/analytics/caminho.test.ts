import { describe, expect, it } from "vitest";
import { caminhoAnonimo } from "./caminho";

describe("caminho enviado ao Google Analytics", () => {
  it("tira ids, códigos de convite e tudo depois do ?", () => {
    expect(caminhoAnonimo("/treinador/alunos/d341ab27-3db3-4d0b-93d6-4f7d4dfe79cb/treinos")).toBe("/treinador/alunos/:id/treinos");
    expect(caminhoAnonimo("/convite/DESAFIO-3XFW")).toBe("/convite/:codigo");
    expect(caminhoAnonimo("/auth/confirmar?token_hash=abc&type=recovery")).toBe("/auth/confirmar");
    expect(caminhoAnonimo("/aluno/treino/123456?sessao=x")).toBe("/aluno/treino/:id");
    expect(caminhoAnonimo("/aluno/evolucao")).toBe("/aluno/evolucao");
    expect(caminhoAnonimo("/")).toBe("/");
  });

  it("tira ids que não parecem uuid depois das pastas de aluno e treino", () => {
    expect(caminhoAnonimo("/aluno/treino/t-aline-c")).toBe("/aluno/treino/:id");
    expect(caminhoAnonimo("/treinador/alunos/al-1/aula/t-2")).toBe("/treinador/alunos/:id/aula/:id");
    expect(caminhoAnonimo("/aluno/meus-treinos/novo")).toBe("/aluno/meus-treinos/novo");
    expect(caminhoAnonimo("/aluno/meus-treinos/abc")).toBe("/aluno/meus-treinos/:id");
    expect(caminhoAnonimo("/treinador/alunos")).toBe("/treinador/alunos");
  });
});
