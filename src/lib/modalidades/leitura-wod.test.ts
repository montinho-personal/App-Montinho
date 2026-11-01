import { describe, expect, it } from "vitest";
import { LEITURA_EXEMPLO, wodDaLeitura } from "./leitura-wod";

describe("WOD lido de foto/PDF", () => {
  const itens = [{ id: "wb", nome: "Wall Ball", sinonimos: ["wallball"] }];
  it("vira blocos do app: formato, tempo, movimentos casados com a biblioteca; força vira texto", () => {
    const w = wodDaLeitura(LEITURA_EXEMPLO, itens)!;
    expect(w.modalidade).toBe("cross");
    expect(w.blocos.map((b) => b.tipo)).toEqual(["aquecimento", "tecnica", "metcon"]);
    expect(w.blocos[1].texto).toContain("Back Squat 5x5 70%");
    const wod = w.blocos[2];
    expect(wod).toMatchObject({ formato: "amrap", minutos: 12 });
    expect(wod.movimentos[0]).toMatchObject({ biblioteca_id: "wb", nome: "Wall Ball", reps: "15", carga: "9/6 kg" });
    expect(wod.movimentos[2].scaled).toBe("com elástico");
  });
  it("valores estranhos não passam: tipo/formato desconhecidos, números fora do limite", () => {
    const w = wodDaLeitura({ modalidade: "crossfit", blocos: [{ tipo: "xyz", formato: "abc", minutos: 9999, movimentos: [{ nome: "Thruster", reps: 21 }, { nome: "" }] }] })!;
    expect(w.modalidade).toBe("cross");
    expect(w.blocos[0]).toMatchObject({ tipo: "metcon", formato: "livre" });
    expect(w.blocos[0].movimentos).toHaveLength(1);
    expect(w.blocos[0].movimentos[0].reps).toBe("21");
  });
  it("For Time com tempo limite em minutos; nada aproveitável = null", () => {
    const w = wodDaLeitura({ blocos: [{ tipo: "metcon", formato: "for_time", time_cap_min: 10, esquema: "21-15-9", movimentos: [{ nome: "Thruster" }] }] })!;
    expect(w.blocos[0]).toMatchObject({ formato: "for_time", time_cap_seg: 600, esquema: "21-15-9" });
    expect(wodDaLeitura({ blocos: [] })).toBeNull();
    expect(wodDaLeitura(null)).toBeNull();
  });
});
