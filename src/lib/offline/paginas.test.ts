import { describe, expect, it } from "vitest";
import { arquivosDaPagina, INTERVALO_SALVAR_MS, precisaSalvar } from "./paginas";

describe("treino sem internet", () => {
  it("acha os arquivos fixos da tela, sem repetir", () => {
    const html = `<script src="/_next/static/chunks/a.js?dpl=x" async></script><link href="/_next/static/chunks/b.css?dpl=x"/>\\"/_next/static/chunks/a.js?dpl=x\\"`;
    expect(arquivosDaPagina(html)).toEqual(["/_next/static/chunks/a.js?dpl=x", "/_next/static/chunks/b.css?dpl=x"]);
  });
  it("salva de novo quando muda a lista de treinos ou passa o intervalo", () => {
    expect(precisaSalvar(null, "a", 0)).toBe(true);
    expect(precisaSalvar({ em: 0, chave: "a" }, "b", 1)).toBe(true);
    expect(precisaSalvar({ em: 0, chave: "a" }, "a", 1000)).toBe(false);
    expect(precisaSalvar({ em: 0, chave: "a" }, "a", INTERVALO_SALVAR_MS)).toBe(true);
  });
});
