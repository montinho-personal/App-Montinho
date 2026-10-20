import { describe, expect, it } from "vitest";
import { agregarEventos } from "./metricas";

const ev = (tipo: string, o: { aluno?: string | null; modelo?: string; formato?: string; origem?: string } = {}) => ({ aluno_id: o.aluno === undefined ? "a" : o.aluno, tipo, modelo: o.modelo ?? null, formato: o.formato ?? null, origem: o.origem ?? null });

describe("métricas do compartilhamento", () => {
  it("agrega por tipo, modelo e formato sem confundir intenção com publicação", () => {
    const m = agregarEventos([
      ev("conclusao_vista"), ev("conclusao_vista"), ev("conclusao_vista"), ev("conclusao_vista"),
      ev("editor_aberto", { origem: "conclusao" }), ev("editor_aberto", { origem: "historico" }), ev("card_gerado", { modelo: "A", formato: "stories" }), ev("card_gerado", { aluno: "b", modelo: "A", formato: "feed" }),
      ev("card_gerado", { modelo: "B", formato: "stories" }), ev("compartilhar_nativo"), ev("compartilhar_cancelado"), ev("download"), ev("visita_link", { aluno: null }),
    ]);
    expect(m).toMatchObject({ conclusoes: 4, editores: 2, cardsGerados: 3, downloads: 1, compartilhamentos: 1, cancelados: 1, visitas: 1, alunosQueGeraram: 2, taxaAbertura: 25 });
    expect(m.porModelo[0]).toEqual({ modelo: "A", cards: 2 });
    expect(m.porFormato[0]).toEqual({ formato: "stories", cards: 2 });
  });
  it("sem conclusões, taxa é nula (sem divisão por zero)", () => {
    expect(agregarEventos([]).taxaAbertura).toBeNull();
  });
});
