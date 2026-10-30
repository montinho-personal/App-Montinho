import { describe, expect, it } from "vitest";
import { recadoDoPersonagem, type EntradaPersonagens } from "./personagens";

const base: EntradaPersonagens = { hoje: "2026-10-30", inicioSemana: "2026-10-27", diasTreinos: ["2026-10-20", "2026-10-28"], dorRecente: false, semanaPassadaCumprida: false, semanasSeguidas: 0, alcance: null };
const dias = (n: number, ate = "2026-10-29") => Array.from({ length: n }, (_, i) => new Date(Date.parse(`${ate}T12:00:00Z`) - (n - 1 - i) * 86_400_000).toISOString().slice(0, 10));

describe("recados dos personagens no sino", () => {
  it("nada a dizer = sem recado; com dor nunca aparece", () => {
    expect(recadoDoPersonagem(base)).toBeNull();
    expect(recadoDoPersonagem({ ...base, semanaPassadaCumprida: true, dorRecente: true })).toBeNull();
  });

  it("Montinho no portão alcançado nos últimos 7 dias", () => {
    const r = recadoDoPersonagem({ ...base, diasTreinos: dias(25) });
    expect(r?.personagem).toBe("montinho");
    expect(r?.id).toBe("personagem:montinho:portao-25");
    expect(recadoDoPersonagem({ ...base, diasTreinos: [...dias(10, "2026-10-01"), "2026-10-29"] })?.personagem).not.toBe("montinho");
  });

  it("Fênix depois de 5+ dias parado, sem culpa", () => {
    const r = recadoDoPersonagem({ ...base, diasTreinos: ["2026-10-20", "2026-10-24"] });
    expect(r?.personagem).toBe("fenix");
    expect(r?.fala).toContain("6 dias");
    expect(recadoDoPersonagem({ ...base, diasTreinos: [] })).toBeNull();
  });

  it("Colombo com troféu perto; Oogway com a semana passada cumprida", () => {
    const c = recadoDoPersonagem({ ...base, alcance: { titulo: "Dez no Pulmão", corpo: "Faltam 2 cardios.", url: "/aluno/cardio" }, semanaPassadaCumprida: true });
    expect(c?.personagem).toBe("colombo");
    expect(c?.botao.href).toBe("/aluno/cardio");
    const o = recadoDoPersonagem({ ...base, semanaPassadaCumprida: true, semanasSeguidas: 3 });
    expect(o?.personagem).toBe("oogway");
    expect(o?.id).toBe("personagem:oogway:2026-10-27");
    expect(o?.titulo).toContain("3 semanas");
    expect(o?.respostas).toHaveLength(2);
  });
});

describe("Montinho com a oferta dos planos", () => {
  it("só quando ninguém mais tem recado; 1 por semana", () => {
    const r = recadoDoPersonagem({ ...base, oferta: { titulo: "Carga travada no Supino?", fala: "Numa aula eu ajusto." } });
    expect(r?.personagem).toBe("montinho");
    expect(r?.id).toBe("personagem:montinho:oferta:2026-10-27");
    expect(r?.botao.href).toBe("/aluno/planos");
    expect(recadoDoPersonagem({ ...base, semanaPassadaCumprida: true, oferta: { titulo: "x", fala: "y" } })?.personagem).toBe("oogway");
    expect(recadoDoPersonagem({ ...base, dorRecente: true, oferta: { titulo: "x", fala: "y" } })).toBeNull();
  });
});
