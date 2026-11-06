import { expect, it } from "vitest";
import { nomeDoArquivo } from "./nome-arquivo";

it("nome do arquivo do PDF com aluno, tipo, Montinho e data sem barras", () => {
  expect(nomeDoArquivo("Relatório de Evolução", "Aline de Souza", "2026-11-06")).toBe("Relatório de Evolução - Aline de Souza - Montinho Personal Trainer - 06-11-2026");
  expect(nomeDoArquivo("Avaliação Física", "Carol / Zorzi", "2026-10-09T10:00:00Z")).toBe("Avaliação Física - Carol Zorzi - Montinho Personal Trainer - 09-10-2026");
});
