import { describe, expect, it } from "vitest";
import { diaBrasilia, resumirAcessos, somarDias } from "./contar";

const a = (alunoId: string, dia: string, visitante = false) => ({ alunoId, dia, visitante });

describe("acessos do dia", () => {
  it("dia de Brasília vira à meia-noite de lá, não em UTC", () => {
    expect(diaBrasilia(new Date("2026-10-23T02:30:00Z"))).toBe("2026-10-22");
    expect(diaBrasilia(new Date("2026-10-23T03:30:00Z"))).toBe("2026-10-23");
    expect(somarDias("2026-11-01", -1)).toBe("2026-10-31");
  });
  it("conta pessoas diferentes, separando alunos e visitantes", () => {
    const r = resumirAcessos(
      [a("ana", "2026-10-23"), a("bia", "2026-10-23", true), a("ana", "2026-10-22"), a("caio", "2026-10-17"), a("caio", "2026-10-16"), a("duda", "2026-09-20")],
      "2026-10-23"
    );
    expect(r.hoje).toEqual({ alunos: 1, visitantes: 1, total: 2 });
    expect(r.ontem.total).toBe(1);
    expect(r.dias7).toEqual({ alunos: 2, visitantes: 1, total: 3 }); // ana, caio (17/10), bia
    expect(r.dias30.total).toBe(3); // duda (20/09) fica fora
    expect(r.porDia).toHaveLength(7);
    expect(r.porDia[0].dia).toBe("2026-10-17");
    expect(r.porDia[6]).toEqual({ dia: "2026-10-23", alunos: 1, visitantes: 1, total: 2 });
  });
});
