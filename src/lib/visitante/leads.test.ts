import { describe, expect, it } from "vitest";
import { csvLeads, funil, resumoCtas, urlWebhookValida, type Lead } from "./leads";

const l = (o: Partial<Lead>): Lead => ({ id: "1", nome: "Ana", email: "ana@x.com", cadastroEm: "2026-10-20T12:00:00Z", convite: "DESAFIO-AB12", origem: "instagram", desafio: null, acessoFim: null, onboarding: false, objetivo: null, treinosFeitos: 0, ultimoTreino: null, whatsapp: null, status: "novo", anotacao: null, convertido: false, ...o });

describe("painel de leads", () => {
  it("funil do convite até virar aluno", () => {
    const f = funil([l({ onboarding: true, treinosFeitos: 4, whatsapp: { ref: "APP-CONSTANCIA", em: "2026-10-22T12:00:00Z" }, status: "virou_aluno" }), l({ onboarding: true, treinosFeitos: 1 }), l({}), l({})]);
    expect(f.map((e) => [e.total, e.pct])).toEqual([[4, 100], [2, 50], [2, 50], [1, 25], [1, 25], [1, 25]]);
    expect(funil([])[0].pct).toBeNull();
  });

  it("desempenho de cada convite para o WhatsApp", () => {
    const r = resumoCtas([{ cta: "constancia", tipo: "exibido" }, { cta: "constancia", tipo: "exibido" }, { cta: "constancia", tipo: "clicado" }, { cta: "evolucao", tipo: "exibido" }, { cta: "evolucao", tipo: "dispensado" }]);
    expect(r).toEqual([
      { cta: "constancia", exibidos: 2, clicados: 1, dispensados: 0, taxa: 50 },
      { cta: "evolucao", exibidos: 1, clicados: 0, dispensados: 1, taxa: 0 },
    ]);
  });

  it("planilha abre no Excel em português e não executa fórmula", () => {
    const csv = csvLeads([l({ nome: "=HYPERLINK(\"x\")", anotacao: "falou; volta segunda", status: "em_conversa" })]);
    expect(csv.startsWith("﻿Nome;E-mail;Status")).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain("Em conversa");
    expect(csv).toContain(`"falou; volta segunda"`);
    expect(csv).toContain("20/10/2026");
  });

  it("endereço do CRM: só https público", () => {
    expect(urlWebhookValida("https://hooks.zapier.com/hooks/catch/123/abc/")).toBe(true);
    expect(urlWebhookValida("https://hook.us1.make.com/xyz")).toBe(true);
    expect(urlWebhookValida("http://hooks.zapier.com/x")).toBe(false);
    expect(urlWebhookValida("https://localhost/x")).toBe(false);
    expect(urlWebhookValida("https://10.0.0.1/x")).toBe(false);
    expect(urlWebhookValida("https://user:senha@site.com/x")).toBe(false);
    expect(urlWebhookValida("não é url")).toBe(false);
  });
});
