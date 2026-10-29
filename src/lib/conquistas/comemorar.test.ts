import { describe, expect, it } from "vitest";
import { juntarSemRepetir, paraComemorar } from "./comemorar";

const c = (id: string, codigo: string, created_at: string, vista_em: string | null = null) => ({ id, codigo, created_at, vista_em });

describe("o que comemorar agora", () => {
  it("só novas (não vistas), gravadas depois do início, sem relatório; várias juntas em ordem", () => {
    const todas = [
      c("1", "cardio_1", "2026-10-29T10:05:00Z"),
      c("2", "cardio_2", "2026-10-29T09:00:00Z"), // antes do início
      c("3", "dois_folegos", "2026-10-29T10:06:00Z", "2026-10-29T10:07:00Z"), // já vista
      c("4", "relatorio_mensal", "2026-10-29T10:06:00Z"),
      c("5", "combo_completo", "2026-10-29T10:05:30Z"),
    ];
    expect(paraComemorar(todas, "2026-10-29T10:00:00Z").map((x) => x.id)).toEqual(["1", "5"]);
    expect(paraComemorar(todas, "2026-10-29T10:00:00Z", (k) => k.startsWith("combo")).map((x) => x.id)).toEqual(["5"]);
  });
  it("junta listas sem comemorar a mesma medalha duas vezes", () => {
    const a = c("1", "x", "2026-10-29T10:00:00Z");
    expect(juntarSemRepetir([a], [a, c("2", "y", "2026-10-29T10:00:00Z")]).map((x) => x.id)).toEqual(["1", "2"]);
  });
});
