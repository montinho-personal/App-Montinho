import { describe, expect, it } from "vitest";
import { estadoAoVivo, haQuanto, limparRecado, RECADOS_PRONTOS } from "./regras";

const agora = Date.parse("2026-10-26T15:00:00Z");
const antes = (min: number) => new Date(agora - min * 60_000).toISOString();

describe("treinando agora", () => {
  it("treinando, parado ou esquecido pela última série", () => {
    expect(estadoAoVivo(antes(2), agora)).toBe("treinando");
    expect(estadoAoVivo(antes(8), agora)).toBe("parado");
    expect(estadoAoVivo(antes(90), agora)).toBe("esquecido");
  });
  it("há quanto tempo, no jeito do Brasil", () => {
    expect(haQuanto(antes(0), agora)).toBe("agora");
    expect(haQuanto(antes(12), agora)).toBe("há 12 min");
    expect(haQuanto(antes(65), agora)).toBe("há 1 h 05");
  });
  it("recado limpo e com limite; prontos curtos", () => {
    expect(limparRecado("  bora   lá \n ")).toBe("bora lá");
    expect(limparRecado("x".repeat(300))).toHaveLength(200);
    for (const r of RECADOS_PRONTOS) expect(r.length).toBeLessThanOrEqual(60);
  });
});
