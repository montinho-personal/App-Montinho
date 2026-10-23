import { describe, expect, it } from "vitest";
import { CAMPOS_MEDIDA, caminhoDoArquivo, lerMedida } from "./campos";

const campo = (c: string) => CAMPOS_MEDIDA.find((x) => x.chave === c)!;

describe("medidas e avaliações", () => {
  it("lê número com vírgula, ignora vazio e recusa fora do limite", () => {
    expect(lerMedida(campo("peso_kg"), "72,5")).toEqual({ valor: 72.5, erro: null });
    expect(lerMedida(campo("peso_kg"), " ")).toEqual({ valor: null, erro: null });
    expect(lerMedida(campo("gordura_pct"), "120").erro).toMatch(/Gordura/);
    expect(lerMedida(campo("altura_cm"), "abc").erro).toMatch(/inválido/);
  });
  it("caminho do arquivo na pasta do aluno, sem o nome original", () => {
    expect(caminhoDoArquivo("aluno-1", "application/pdf", "ab-12/../x", "2026-10-23")).toBe("aluno-1/2026-10-23-ab12x.pdf");
  });
});
