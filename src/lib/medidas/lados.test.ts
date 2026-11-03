import { describe, expect, it } from "vitest";
import { itensCircunferencia, lerExtrasCirc } from "./lados";

describe("circunferências com os dois lados", () => {
  it("ordem: pescoço, tronco e cada membro direito + esquerdo", () => {
    const nomes = itensCircunferencia().map((i) => (i.tipo === "campo" ? i.rotulo : i.extra.nome));
    expect(nomes).toEqual(["Pescoço", "Cintura", "Abdômen", "Quadril", "Peito", "Braço direito", "Braço esquerdo", "Coxa direita", "Coxa esquerda", "Panturrilha direita", "Panturrilha esquerda"]);
  });
  it("lê os extras com vírgula e ignora vazios", () => {
    expect(lerExtrasCirc({ Pescoço: "36,5", "Braço esquerdo": "", "Coxa esquerda": "55" })).toEqual({ extras: [{ nome: "Pescoço", valor: 36.5, unidade: "cm" }, { nome: "Coxa esquerda", valor: 55, unidade: "cm" }], erro: null });
  });
  it("valor fora do limite avisa", () => {
    expect(lerExtrasCirc({ "Panturrilha esquerda": "200" }).erro).toContain("Panturrilha esquerda");
  });
});

import { relatorioAvaliacao } from "./relatorio-avaliacao";
describe("relatório com os dois lados", () => {
  it("mostra direito, esquerdo e pescoço", () => {
    const m = { id: "a", aluno_id: "x", data: "2026-11-04", created_at: "2026-11-04T10:00:00Z", braco_cm: 32, extras: [{ nome: "Soma das 7 dobras", valor: 100, unidade: "mm" }, { nome: "Braço esquerdo", valor: 31.5, unidade: "cm" }, { nome: "Pescoço", valor: 36, unidade: "cm" }] };
    const r = relatorioAvaliacao([m as never], "a")!;
    expect(r.circunferencias.map((l) => `${l.rotulo} ${l.atual}`)).toEqual(["Pescoço 36", "Braço direito 32", "Braço esquerdo 31.5"]);
  });
});
