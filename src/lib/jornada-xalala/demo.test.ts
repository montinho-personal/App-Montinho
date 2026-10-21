import { describe, expect, it } from "vitest";
import { dadosXalala } from "./demo";
import { CAPITULOS_XALALA, PERSONAGENS_XALALA } from "./universo";

const PROIBIDO = [/dopamina/i, /reprogram/i, /21 dias/i, /garant/i, /neuroplastic/i, /permanente/i, /culpa/i];

describe("protótipo A Jornada do Xalalá", () => {
  it("os dados fictícios passam pelo motor real e cobrem os dois cenários", () => {
    const a = dadosXalala("completo");
    const b = dadosXalala("retorno");
    expect(a.jornada.nos.filter((n) => n.tipo === "medalha")).toHaveLength(32);
    expect(a.retornos).toBe(0);
    expect(b.retornos).toBe(1);
    expect(b.jornada.caminho?.semanas.some((w) => w.retorno)).toBe(true);
    expect(b.jornada.caminho?.semanas.some((w) => w.status === "pausada")).toBe(true);
    expect(a.eventos.some((e) => e.autor === "personal")).toBe(true);
  });
  it("textos do universo seguem as regras editoriais", () => {
    const tudo = [...CAPITULOS_XALALA.flatMap((c) => [c.titulo, c.narrativa, c.tema]), ...PERSONAGENS_XALALA.flatMap((p) => [p.fala, p.personalidade, p.arte])];
    for (const t of tudo) for (const re of PROIBIDO) expect(re.test(t), `“${t}” contém ${re}`).toBe(false);
  });
});
