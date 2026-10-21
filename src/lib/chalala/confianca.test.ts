import { describe, expect, it } from "vitest";
import { FRASES_CONFIANCA, confiancaAntesDoTreino, confiancaNoFim, ehFichaNova, podeMostrarConfianca } from "./confianca";

const base = { concluidas: 5, diasDesdeUltimo: 2, fichaNova: false, checkin: "normal", tempoCurto: false };

describe("É impossível dar errado — quando aparece", () => {
  it("textos do Montinho", () => {
    expect(FRASES_CONFIANCA.primeiro_treino).toBe("Primeiro treino com o Montinho? Relaxa. Se fizer o que é necessário ser feito, é impossível dar errado!");
    expect(FRASES_CONFIANCA.ficha_nova).toBe("Ficha nova na área! Faça o que tem que ser feito, porque é impossível dar errado!");
    expect(FRASES_CONFIANCA.tempo_curto).toContain("O mais importante é a consistência");
  });
  it("cada momento e a ordem de prioridade", () => {
    expect(confiancaAntesDoTreino({ ...base, concluidas: 0, checkin: "cansado" })).toBe("primeiro_treino");
    expect(confiancaAntesDoTreino({ ...base, diasDesdeUltimo: 20, fichaNova: true })).toBe("voltou");
    expect(confiancaAntesDoTreino({ ...base, fichaNova: true, checkin: "cansado" })).toBe("ficha_nova");
    expect(confiancaAntesDoTreino({ ...base, checkin: "cansado", tempoCurto: true })).toBe("cansado");
    expect(confiancaAntesDoTreino({ ...base, tempoCurto: true })).toBe("tempo_curto");
    expect(confiancaAntesDoTreino(base)).toBeNull();
  });
  it("nunca com dor/desconforto", () => {
    expect(confiancaAntesDoTreino({ ...base, concluidas: 0, checkin: "desconforto" })).toBeNull();
    expect(confiancaNoFim({ parcial: true, dor: true })).toBeNull();
    expect(confiancaNoFim({ parcial: true, dor: false })).toBe("parcial");
    expect(confiancaNoFim({ parcial: false, dor: false })).toBeNull();
  });
  it("no máx. 1 por dia e 3 por semana", () => {
    const agora = new Date(2026, 9, 21, 10);
    expect(podeMostrarConfianca([], agora)).toBe(true);
    expect(podeMostrarConfianca([new Date(2026, 9, 21, 7).toISOString()], agora)).toBe(false);
    const tres = [16, 18, 20].map((d) => new Date(2026, 9, d, 9).toISOString());
    expect(podeMostrarConfianca(tres, agora)).toBe(false);
    expect(podeMostrarConfianca(tres.slice(1), agora)).toBe(true);
    expect(podeMostrarConfianca([new Date(2026, 9, 10).toISOString(), ...tres.slice(1)], agora)).toBe(true);
  });
  it("ficha nova: publicada há pouco, com treinos antes e nenhum depois", () => {
    const agora = new Date("2026-10-21T12:00:00Z");
    expect(ehFichaNova({ publicadaEm: "2026-10-20T10:00:00Z", ultimaConcluida: "2026-10-18T10:00:00Z", agora })).toBe(true);
    expect(ehFichaNova({ publicadaEm: "2026-10-20T10:00:00Z", ultimaConcluida: "2026-10-20T18:00:00Z", agora })).toBe(false);
    expect(ehFichaNova({ publicadaEm: "2026-08-01T10:00:00Z", ultimaConcluida: "2026-07-18T10:00:00Z", agora })).toBe(false);
    expect(ehFichaNova({ publicadaEm: "2026-10-20T10:00:00Z", ultimaConcluida: null, agora })).toBe(false);
  });
});
