import { describe, expect, it } from "vitest";
import { converterMedida, ehPorTempo, formatarSegundos, segundosPrevistos } from "./medida";

describe("exercício por tempo ou repetições", () => {
  it("reconhece prescrição por tempo", () => {
    expect(ehPorTempo({ reps: "30s" })).toBe(true);
    expect(ehPorTempo({ reps: "45s/60s/60s" })).toBe(true);
    expect(ehPorTempo({ reps: "1min" })).toBe(true);
    expect(ehPorTempo({ reps: "10-12" })).toBe(false);
    expect(ehPorTempo({ reps: "12", tecnica: "isometria" })).toBe(true);
    expect(ehPorTempo({ reps: "" })).toBe(false);
  });
  it("converte nos dois sentidos", () => {
    expect(converterMedida("30", true)).toBe("30s");
    expect(converterMedida("30/45", true)).toBe("30s/45s");
    expect(converterMedida("10-12", true)).toBe("12s");
    expect(converterMedida("45s/60s", false)).toBe("45/60");
    expect(converterMedida("1min", false)).toBe("60");
  });
  it("segundos previstos e formato", () => {
    expect(segundosPrevistos("45s/60s")).toBe(45);
    expect(segundosPrevistos("30")).toBe(30);
    expect(formatarSegundos(45)).toBe("45 s");
    expect(formatarSegundos(90)).toBe("1 min 30 s");
    expect(formatarSegundos(120)).toBe("2 min");
  });
});
