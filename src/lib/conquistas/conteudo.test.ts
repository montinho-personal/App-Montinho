import { describe, expect, it } from "vitest";
import { CATALOGO, type CodigoConquista } from "./regras";
import { CONTEUDO, CONTEUDO_VERSAO, FONTES, mensagemDaJornada, nomeDaConquista } from "./conteudo";

const codigos = Object.keys(CATALOGO) as CodigoConquista[];
const PROIBIDO = [/dopamina/i, /reprogram/i, /21 dias.*h[áa]bito|h[áa]bito.*21 dias/i, /garant/i, /neuroplastic/i, /circuito/i, /h[áa]bito (est[áa]|j[áa] est[áa]) formado/i, /permanente/i];

describe("biblioteca editorial das conquistas", () => {
  it("74 conquistas (70 únicas + 4 recorrentes, uma delas por desafio), todas com o conteúdo completo", () => {
    expect(codigos).toHaveLength(74);
    expect(codigos.filter((c) => CATALOGO[c].repete).sort()).toEqual(["cardio_voltei", "desafio_concluido", "eu_voltei", "recorde"]);
    for (const c of codigos) {
      const t = CONTEUDO[c];
      for (const campo of ["nome", "resumo", "criterio", "mensagem", "comoConquistar", "significado", "importancia", "explicacao", "proximoPasso"] as const) expect(t[campo].length, `${c}.${campo}`).toBeGreaterThan(campo === "nome" ? 3 : 10);
      expect(t.fontes.length, c).toBeGreaterThan(0);
      for (const f of t.fontes) expect(FONTES[f], `${c} → ${f}`).toBeDefined();
      expect(t.versao).toBe(CONTEUDO_VERSAO);
      expect(t.criterio).toBe(CATALOGO[c].criterio);
    }
  });
  it("sem afirmações pseudocientíficas ou promessas de prazo", () => {
    const tudo = codigos.flatMap((c) => Object.values(CONTEUDO[c]).filter((v): v is string => typeof v === "string"));
    tudo.push(...[0, 1, 2, 4, 8, 12].map((n) => mensagemDaJornada(n) ?? ""));
    for (const txt of tudo) for (const re of PROIBIDO) expect(re.test(txt), `“${txt}” contém ${re}`).toBe(false);
  });
  it("jornada das semanas e nome atual para conquistas antigas", () => {
    expect(mensagemDaJornada(0)).toBeNull();
    expect(mensagemDaJornada(1)).toMatch(/outra semana/);
    expect(mensagemDaJornada(13)).toMatch(/próximo ciclo/);
    expect(nomeDaConquista("primeiro_treino", "Primeiro treino concluído")).toBe("Primeiro passo");
    expect(nomeDaConquista("codigo_antigo", "Título gravado")).toBe("Título gravado");
  });
});
