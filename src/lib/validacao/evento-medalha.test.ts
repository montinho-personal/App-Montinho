import { describe, expect, it } from "vitest";
import { eventoChalalaSchema } from "./schemas";

describe("compartilhar medalha: evento aceito pelo servidor", () => {
  it("o código da medalha vai no ref (o modelo não aceita “_”)", () => {
    expect(eventoChalalaSchema.safeParse({ tipo: "compartilhar_nativo", modelo: "primeiro_treino", formato: "stories", origem: "medalha" }).success).toBe(false);
    expect(eventoChalalaSchema.safeParse({ tipo: "compartilhar_nativo", ref: "medalha:semanas_consistentes_12", formato: "stories", origem: "medalha" }).success).toBe(true);
    expect(eventoChalalaSchema.safeParse({ tipo: "download", ref: "tribo:tribo_cardio_1000", formato: "stories", origem: "tribo" }).success).toBe(true);
  });
});
