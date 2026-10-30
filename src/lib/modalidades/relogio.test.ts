import { describe, expect, it } from "vitest";
import { deveAvisar, estadoRelogio, relogioTexto, segundosDeTreino } from "./relogio";
import { novoBloco } from "./blocos";

describe("relógio do WOD (pelo horário, nunca por contador)", () => {
  it("desconta as pausas, inclusive a que ainda está aberta", () => {
    const ini = 0;
    expect(segundosDeTreino(ini, [{ de: 60_000, ate: 90_000 }], 120_000)).toBe(90);
    expect(segundosDeTreino(ini, [{ de: 100_000, ate: null }], 120_000)).toBe(100);
  });
  it("AMRAP: regressivo e termina no tempo", () => {
    const b = { ...novoBloco("metcon", [], "amrap"), minutos: 12 };
    expect(estadoRelogio(b, 60).restanteSeg).toBe(660);
    expect(estadoRelogio(b, 720).terminou).toBe(true);
    expect(estadoRelogio(b, 900).decorridoSeg).toBe(720);
  });
  it("EMOM e E2MOM: intervalo atual e quanto falta nele", () => {
    const e = { ...novoBloco("metcon", [], "emom"), minutos: 10 };
    expect(estadoRelogio(e, 125)).toMatchObject({ intervalo: 3, totalIntervalos: 10, restanteFaseSeg: 55 });
    const e2 = { ...e, intervalo_seg: 120 };
    expect(estadoRelogio(e2, 125)).toMatchObject({ intervalo: 2, totalIntervalos: 5, restanteFaseSeg: 115 });
  });
  it("Tabata: 20 s de trabalho, 10 s de descanso, 8 ciclos = 4 min", () => {
    const t = novoBloco("metcon", [], "tabata");
    expect(estadoRelogio(t, 5)).toMatchObject({ fase: "trabalho", intervalo: 1, restanteFaseSeg: 15 });
    expect(estadoRelogio(t, 25)).toMatchObject({ fase: "descanso", intervalo: 1, restanteFaseSeg: 5 });
    expect(estadoRelogio(t, 31)).toMatchObject({ fase: "trabalho", intervalo: 2 });
    expect(estadoRelogio(t, 240).terminou).toBe(true);
  });
  it("For Time: progressivo até o time cap; sem cap não termina sozinho", () => {
    const f = { ...novoBloco("metcon", [], "for_time"), time_cap_seg: 600 };
    expect(estadoRelogio(f, 100)).toMatchObject({ regressivo: false, restanteSeg: 500 });
    expect(estadoRelogio(f, 600).terminou).toBe(true);
    expect(estadoRelogio({ ...f, time_cap_seg: null }, 5000).terminou).toBe(false);
  });
  it("avisa na troca de intervalo, nos 3 últimos segundos e no fim", () => {
    const t = novoBloco("metcon", [], "tabata");
    expect(deveAvisar(estadoRelogio(t, 19), estadoRelogio(t, 20))).toBe("troca");
    expect(deveAvisar(estadoRelogio(t, 16), estadoRelogio(t, 17))).toBe("contagem");
    expect(deveAvisar(estadoRelogio(t, 239), estadoRelogio(t, 240))).toBe("fim");
    expect(relogioTexto(3725)).toBe("1:02:05");
    expect(relogioTexto(65)).toBe("1:05");
  });
});
