import { describe, expect, it } from "vitest";
import { microVitoria } from "./micro-vitoria";

describe("microvitórias no treino", () => {
  it("1º exercício e metade, uma vez cada", () => {
    expect(microVitoria(1, 6, new Set())).toBe("primeiro");
    expect(microVitoria(1, 6, new Set(["primeiro"]))).toBeNull();
    expect(microVitoria(3, 6, new Set(["primeiro"]))).toBe("metade");
    expect(microVitoria(3, 6, new Set(["primeiro", "metade"]))).toBeNull();
    expect(microVitoria(3, 5, new Set(["primeiro"]))).toBe("metade");
  });
  it("não aparece no último exercício (o fim já comemora), com desconforto ou treino curto", () => {
    expect(microVitoria(6, 6, new Set())).toBeNull();
    expect(microVitoria(1, 6, new Set(), true)).toBeNull();
    expect(microVitoria(1, 1, new Set())).toBeNull();
    expect(microVitoria(2, 3, new Set(["primeiro"]))).toBeNull();
  });
});
