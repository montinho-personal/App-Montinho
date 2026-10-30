import { describe, expect, it } from "vitest";
import { escolherOferta, ofertasPara, textoDaOferta } from "./regras";

const todas = [
  { id: "pacote_alunos" as const, ativo: true, promo: null },
  { id: "consultoria_visitantes" as const, ativo: true, promo: null },
  { id: "pacote_visitantes" as const, ativo: true, promo: " 1 aula a mais " },
];
const H = 3_600_000;

describe("ofertas dos planos", () => {
  it("cada público vê o seu; longe de Alphaville não vê o Pacote; desligada some", () => {
    expect(ofertasPara({ publico: "visitante", podePresencial: true, config: todas }).map((o) => o.id)).toEqual(["consultoria", "pacote"]);
    expect(ofertasPara({ publico: "visitante", podePresencial: false, config: todas }).map((o) => o.id)).toEqual(["consultoria"]);
    expect(ofertasPara({ publico: "aluno", podePresencial: true, config: todas }).map((o) => o.id)).toEqual(["pacote"]);
    expect(ofertasPara({ publico: "aluno", podePresencial: false, config: todas })).toEqual([]);
    expect(ofertasPara({ publico: "aluno", podePresencial: true, config: [{ id: "pacote_alunos", ativo: false, promo: null }] })).toEqual([]);
    expect(ofertasPara({ publico: "visitante", podePresencial: true, config: todas })[1].promo).toBe("1 aula a mais");
  });

  it("limite por público, pausas e alternância", () => {
    const ofertas = ofertasPara({ publico: "visitante", podePresencial: true, config: todas });
    const agora = Date.parse("2026-10-30T15:00:00Z");
    const base = { ofertas, publico: "visitante" as const, agora, dor: false, diaDoAno: 0 };
    expect(escolherOferta({ ...base, historico: {} })?.id).toBe("consultoria");
    expect(escolherOferta({ ...base, historico: {}, diaDoAno: 1 })?.id).toBe("pacote");
    expect(escolherOferta({ ...base, historico: { ultimaVista: agora - 5 * H } })).toBeNull();
    expect(escolherOferta({ ...base, historico: { ultimaVista: agora - 21 * H } })?.id).toBe("consultoria");
    expect(escolherOferta({ ...base, historico: { dispensada: { consultoria: agora - 24 * H } } })?.id).toBe("pacote");
    expect(escolherOferta({ ...base, historico: { clicada: { consultoria: agora - H, pacote: agora - H } } })).toBeNull();
    expect(escolherOferta({ ...base, historico: {}, dor: true })).toBeNull();
    const aluno = ofertasPara({ publico: "aluno", podePresencial: true, config: todas });
    expect(escolherOferta({ ...base, ofertas: aluno, publico: "aluno", historico: { ultimaVista: agora - 3 * 24 * H } })).toBeNull();
  });

  it("texto com o nome e os treinos da pessoa", () => {
    const t = textoDaOferta({ id: "consultoria", config: "consultoria_visitantes", promo: null }, { publico: "visitante", nome: "Ana Souza", treinos: 12 });
    expect(t.titulo).toBe("Ana, 12 treinos por conta própria. Bora com acompanhamento?");
    expect(textoDaOferta({ id: "pacote", config: "pacote_alunos", promo: null }, { publico: "aluno", nome: "Bia", treinos: 0 }).texto).toContain("10 aulas");
  });
});
