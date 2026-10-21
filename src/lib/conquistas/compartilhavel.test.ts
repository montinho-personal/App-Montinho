import { describe, expect, it } from "vitest";
import { CATALOGO, type CodigoConquista } from "./regras";
import { cardDaMedalha, destaqueDaConquista, TEXTO_COMPARTILHAVEL } from "./compartilhavel";

const codigos = Object.keys(CATALOGO) as CodigoConquista[];
const PROIBIDO = [/dopamina/i, /reprogram/i, /21 dias/i, /garant/i, /neuroplastic/i, /circuito/i, /permanente/i, /cérebro|cerebro/i];

describe("card compartilhável da medalha", () => {
  it("toda medalha tem frase curta (cabe no Story) e o porquê em uma linha", () => {
    for (const c of codigos) {
      const t = TEXTO_COMPARTILHAVEL[c];
      expect(t, c).toBeDefined();
      expect(t.frase.length, `${c}.frase`).toBeLessThanOrEqual(40);
      expect(t.porque.length, `${c}.porque`).toBeLessThanOrEqual(95);
      for (const re of PROIBIDO) {
        expect(re.test(t.frase), `${c}.frase ${re}`).toBe(false);
        expect(re.test(t.porque), `${c}.porque ${re}`).toBe(false);
      }
    }
  });

  it("recorde mostra o número concreto", () => {
    expect(destaqueDaConquista({ codigo: "recorde", dados: { recordes: [{ exercicio: "Supino reto", tipo: "carga", antes: 60, agora: 65 }] } })).toBe("Supino reto: 65 kg (antes 60 kg)");
    expect(destaqueDaConquista({ codigo: "recorde", dados: { recordes: [{ exercicio: "Barra fixa", tipo: "reps", antes: 6, agora: 8 }] } })).toBe("Barra fixa: 8 repetições");
  });

  it("monta o card com primeiro nome, data no padrão brasileiro e legenda", () => {
    const c = cardDaMedalha({ codigo: "treinos_10", conquistado_em: "2026-10-21T10:00:00Z" }, "Denis Silva");
    expect(c).toMatchObject({ selo: "10", nome: "Denis", data: "21/10/2026", destaque: "10 treinos concluídos", frase: "10 vezes eu escolhi aparecer." });
    expect(c.legenda).toContain("@montinho_personal");
  });
});
