import { describe, expect, it } from "vitest";
import { contarSemCarga } from "./acompanhamento-extra";

const ses = (id: string, dia: string) => ({ id, aluno_id: "a", iniciado_em: `${dia}T12:00:00Z` });
describe("treinos seguidos sem carga", () => {
  it("conta do mais novo para trás até o 1º com carga; aquecimento não conta", () => {
    const sessoes = [ses("s1", "2026-10-10"), ses("s2", "2026-10-12"), ses("s3", "2026-10-14"), ses("s4", "2026-10-16")];
    const series = [
      { session_id: "s1", carga_kg: 40, tipo: "valida" },
      { session_id: "s2", carga_kg: null, tipo: "valida" },
      { session_id: "s3", carga_kg: 20, tipo: "aquecimento" },
      { session_id: "s3", carga_kg: null, tipo: "valida" },
      { session_id: "s4", carga_kg: 0, tipo: "valida" },
    ];
    expect(contarSemCarga(sessoes, series)).toBe(3);
    expect(contarSemCarga(sessoes, [...series, { session_id: "s4", carga_kg: 30, tipo: "valida" }])).toBe(0);
  });
});
