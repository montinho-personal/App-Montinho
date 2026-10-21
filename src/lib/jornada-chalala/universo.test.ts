import { describe, expect, it } from "vitest";
import { CAPITULOS_CHALALA, PERSONAGENS_CHALALA, personagemPorId } from "./universo";

const PROIBIDO = [/dopamina/i, /reprogram/i, /21 dias/i, /garant/i, /neuroplastic/i, /permanente/i, /culpa/i];

describe("universo de A Jornada do Chalalá", () => {
  it("textos seguem as regras editoriais", () => {
    const tudo = [...CAPITULOS_CHALALA.flatMap((c) => [c.titulo, c.narrativa, c.tema]), ...PERSONAGENS_CHALALA.flatMap((p) => [p.fala, p.personalidade, p.resumo, p.arte])];
    for (const t of tudo) for (const re of PROIBIDO) expect(re.test(t), `“${t}” contém ${re}`).toBe(false);
  });
  it("tem os quatro personagens aprovados, com nome e papel", () => {
    expect(PERSONAGENS_CHALALA.map((p) => `${p.nome} — ${p.papel}`)).toEqual(["Montinho — O Guia", "Colombo — O Explorador", "Mestre Oogway — O Guardião do Ritmo", "Fênix — O Símbolo do Recomeço"]);
    expect(personagemPorId("fenix").resumo).toMatch(/voltar depois de uma pausa/);
  });
});
