import { describe, expect, it } from "vitest";
import { bateBusca, ordenarAlunos, type AlunoLista } from "./lista";

const a = (nome: string, o: Partial<AlunoLista> = {}): AlunoLista => ({ id: nome, nome, email: null, telefone: null, status: "ativo", inicio: null, ultimoTreino: null, acessoAte: null, ...o });

describe("Lista de alunos", () => {
  it("busca sem acento, por pedaço, nome e sobrenome em qualquer ordem, e telefone pelos números", () => {
    const n = a("Nathália Souza", { email: "nath@x.com", telefone: "(11) 93252-6180" });
    expect(bateBusca(n, "natha")).toBe(true);
    expect(bateBusca(n, "souza nat")).toBe(true);
    expect(bateBusca(n, "NATH@")).toBe(true);
    expect(bateBusca(n, "932526")).toBe(true);
    expect(bateBusca(n, "maria")).toBe(false);
    expect(bateBusca(n, "")).toBe(true);
  });
  it("ordena A–Z, mais novos, mais antigos, último treino, parados e vencimento", () => {
    const xs = [a("Carla", { inicio: "2026-03-01", ultimoTreino: "2026-10-28T10:00:00Z", acessoAte: "2026-12-01" }), a("Ana", { inicio: "2026-09-01", ultimoTreino: null, acessoAte: "2026-11-05" }), a("Bruno", { inicio: "2026-01-10", ultimoTreino: "2026-10-01T10:00:00Z" })];
    const ids = (o: Parameters<typeof ordenarAlunos>[1]) => ordenarAlunos(xs, o).map((x) => x.nome);
    expect(ids("az")).toEqual(["Ana", "Bruno", "Carla"]);
    expect(ids("novos")).toEqual(["Ana", "Carla", "Bruno"]);
    expect(ids("antigos")).toEqual(["Bruno", "Carla", "Ana"]);
    expect(ids("treinou")).toEqual(["Carla", "Bruno", "Ana"]);
    expect(ids("parados")).toEqual(["Ana", "Bruno", "Carla"]);
    expect(ids("vence")).toEqual(["Ana", "Carla", "Bruno"]);
  });
});
