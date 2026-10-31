import { describe, expect, it } from "vitest";
import { normalizarInteresse, querAvisoDoWod, textoInteresse } from "./interesse";

describe("modalidades de interesse", () => {
  it("normaliza: só valores conhecidos, sem repetir, na ordem do app", () => {
    expect(normalizarInteresse(["hyrox", "crossfit", "musculacao", "hyrox"])).toEqual(["musculacao", "hyrox"]);
  });
  it("aviso do WOD: quem não respondeu ou quer algo além da musculação", () => {
    expect(querAvisoDoWod([])).toBe(true);
    expect(querAvisoDoWod(null)).toBe(true);
    expect(querAvisoDoWod(["musculacao"])).toBe(false);
    expect(querAvisoDoWod(["musculacao", "cross"])).toBe(true);
  });
  it("texto para o personal", () => {
    expect(textoInteresse(["cross", "hyrox"])).toBe("🔥 Cross Training · 🏃 HYROX");
  });
});
