import { describe, expect, it } from "vitest";
import { lerPedido, resumoDoPedido } from "./pedido-treino";
import { normalizarParametros } from "./gerar-treino";

describe("entender o pedido de treino", () => {
  it("frase completa", () => {
    const r = lerPedido("Quero um treino de iniciante para 3 dias na semana, 45 minutos, foco em glúteo");
    expect(r.bloqueio).toBeNull();
    expect(r.parametros).toMatchObject({ nivel: "iniciante", dias: 3, minutos: 45, foco: "gluteo" });
  });
  it("jeito de falar (voz)", () => {
    expect(lerPedido("quero empinar o bumbum, tenho pouco tempo, umas três vezes").parametros).toMatchObject({ foco: "gluteo", minutos: 30, dias: 3 });
    expect(lerPedido("treino em casa quatro dias uma hora").parametros).toMatchObject({ local: "casa", dias: 4, minutos: 60 });
    expect(lerPedido("braço e peito 5x").parametros).toMatchObject({ foco: "bracos", dias: 5 });
  });
  it("completa com o perfil quando a pessoa não diz", () => {
    expect(lerPedido("quero focar em costas", { nivel: "intermediario", dias: 4 }).parametros).toMatchObject({ nivel: "intermediario", dias: 4, foco: "costas" });
  });
  it("dor, lesão ou gestação: não monta, encaminha ao Montinho", () => {
    expect(lerPedido("tenho dor no joelho, quero treinar perna").bloqueio).toBe("saude");
    expect(lerPedido("estou grávida de 5 meses").bloqueio).toBe("saude");
    expect(lerPedido("fiz cirurgia no ombro").bloqueio).toBe("saude");
  });
  it("resumo para conferir", () => {
    expect(resumoDoPedido(normalizarParametros({ nivel: "iniciante", dias: 3, minutos: 45, foco: "gluteo" }))).toBe("Iniciante · 3 dias por semana · até 45 min · foco em glúteo · na academia");
  });
});
