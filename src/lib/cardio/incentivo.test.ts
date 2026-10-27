import { describe, expect, it } from "vitest";
import { CONVITES_POS_TREINO, FRASES_CRONOMETRO, FRASE_FIM, conviteDoTreino, fraseDoCronometro, minutosDoCronometro, mostrarConvite } from "./incentivo";

describe("incentivo do cardio curto", () => {
  it("textos curtos, sem culpa nem calorias", () => {
    const todos = [...CONVITES_POS_TREINO, ...FRASES_CRONOMETRO.flatMap((f) => f.frases), FRASE_FIM];
    for (const t of todos) {
      expect(t.length).toBeLessThanOrEqual(90);
      expect(t).not.toMatch(/caloria|queimar|culpa|obrigat|gordura|mais e mais/i);
    }
  });
  it("o convite do treino não muda ao recarregar", () => {
    expect(conviteDoTreino("sessao-1")).toBe(conviteDoTreino("sessao-1"));
  });
  it("frase acompanha o progresso e comemora no fim", () => {
    expect(FRASES_CRONOMETRO[0].frases).toContain(fraseDoCronometro(30, 900));
    expect(FRASES_CRONOMETRO[3].frases).toContain(fraseDoCronometro(850, 900));
    expect(fraseDoCronometro(900, 900)).toBe(FRASE_FIM);
  });
  it("nunca convida com dor, sem treino concluído ou se já fez cardio hoje", () => {
    expect(mostrarConvite({ concluida: true, dor: false, jaFezCardioHoje: false })).toBe(true);
    expect(mostrarConvite({ concluida: true, dor: true, jaFezCardioHoje: false })).toBe(false);
    expect(mostrarConvite({ concluida: false, dor: false, jaFezCardioHoje: false })).toBe(false);
    expect(mostrarConvite({ concluida: true, dor: false, jaFezCardioHoje: true })).toBe(false);
  });
  it("minutos do cronômetro: arredonda, mínimo 1", () => {
    expect(minutosDoCronometro(20)).toBe(1);
    expect(minutosDoCronometro(15 * 60 + 20)).toBe(15);
  });
});
