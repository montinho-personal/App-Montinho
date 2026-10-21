import { describe, expect, it } from "vitest";
import { adicionarOrientacao, blocosDaNota, LIMITE_NOTA, ORIENTACOES, orientacoesNaNota, removerOrientacao } from "./orientacoes";
import { exercicioInputSchema } from "@/lib/validacao/schemas";

describe("orientações prontas", () => {
  it("5 orientações com os textos do personal", () => {
    expect(ORIENTACOES.map((o) => o.id)).toEqual(["aquecimento", "iso-2-primeiras-5", "iso-todas-5", "iso-todas-10", "falha-todas"]);
    expect(ORIENTACOES[3].texto).toMatch(/^Em todas as séries, faça as 10 primeiras repetições segurando o peso por 3 segundos/);
  });

  it("acrescenta à nota existente sem duplicar e reconhece as que já estão", () => {
    let n = adicionarOrientacao("Pé alto na plataforma.", "aquecimento");
    n = adicionarOrientacao(n, "iso-todas-5");
    n = adicionarOrientacao(n, "aquecimento");
    expect(n.split("\n\n")).toHaveLength(3);
    expect(orientacoesNaNota(n)).toEqual(["aquecimento", "iso-todas-5"]);
    expect(removerOrientacao(n, "aquecimento").split("\n\n")).toHaveLength(2);
  });

  it("para o aluno: orientação vira bloco com título; texto livre fica sem título", () => {
    const b = blocosDaNota(adicionarOrientacao("Pé alto na plataforma.", "falha-todas"));
    expect(b).toEqual([{ titulo: null, texto: "Pé alto na plataforma." }, { titulo: "Todas as séries até a falha", texto: ORIENTACOES[4].texto }]);
  });

  it("cabe na validação do plano mesmo com todas as orientações + nota livre", () => {
    let n = "Nota livre do personal.";
    for (const o of ORIENTACOES) n = adicionarOrientacao(n, o.id);
    expect(n.length).toBeLessThan(LIMITE_NOTA);
    const r = exercicioInputSchema.shape.observacoes.safeParse(n);
    expect(r.success).toBe(true);
  });
});
