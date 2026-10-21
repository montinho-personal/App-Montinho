import { describe, expect, it } from "vitest";
import { conviteVaiQueTaFacil, type EntradaFacil } from "./facil";

const base: EntradaFacil = {
  feitas: [{ reps: 12, rir: null, desconforto: null, prescrito: "10-12" }, { reps: 12, rir: 3, desconforto: null, prescrito: "10-12" }],
  proximaEhUltima: true,
  porTempo: false,
  temCarga: true,
  checkin: "normal",
  tempoCurto: false,
  ultimaComTecnica: false,
  desligado: false,
};

describe("Vai que tá fácil", () => {
  it("convida na última série quando as anteriores saíram no topo", () => {
    expect(conviteVaiQueTaFacil(base)).toMatch(/1 a 2 kg/);
    expect(conviteVaiQueTaFacil({ ...base, temCarga: false })).toMatch(/1 a 2 repetições a mais/);
  });
  it("por tempo: sugere segundos a mais", () => {
    expect(conviteVaiQueTaFacil({ ...base, porTempo: true, feitas: [{ reps: 45, rir: null, desconforto: null, prescrito: "45s" }] })).toMatch(/5 a 10 segundos/);
    expect(conviteVaiQueTaFacil({ ...base, porTempo: true, feitas: [{ reps: 30, rir: null, desconforto: null, prescrito: "45s" }] })).toBeNull();
  });
  it("não convida quando não saiu fácil", () => {
    expect(conviteVaiQueTaFacil({ ...base, feitas: [{ reps: 10, rir: null, desconforto: null, prescrito: "10-12" }] })).toBeNull();
    expect(conviteVaiQueTaFacil({ ...base, feitas: [{ reps: 12, rir: 1, desconforto: null, prescrito: "10-12" }] })).toBeNull();
    expect(conviteVaiQueTaFacil({ ...base, feitas: [{ reps: 12, rir: null, desconforto: 3, prescrito: "10-12" }] })).toBeNull();
    expect(conviteVaiQueTaFacil({ ...base, feitas: [] })).toBeNull();
  });
  it("respeita o momento: só antes da última, sem cansaço/dor, treino curto, técnica ou desligado", () => {
    expect(conviteVaiQueTaFacil({ ...base, proximaEhUltima: false })).toBeNull();
    expect(conviteVaiQueTaFacil({ ...base, checkin: "cansado" })).toBeNull();
    expect(conviteVaiQueTaFacil({ ...base, checkin: "desconforto" })).toBeNull();
    expect(conviteVaiQueTaFacil({ ...base, tempoCurto: true })).toBeNull();
    expect(conviteVaiQueTaFacil({ ...base, ultimaComTecnica: true })).toBeNull();
    expect(conviteVaiQueTaFacil({ ...base, desligado: true })).toBeNull();
  });
});
