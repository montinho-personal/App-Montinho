import { describe, expect, it } from "vitest";
import { comQuemFalar } from "./leads-prioridade";
import type { Lead } from "./leads";

const agora = new Date("2026-10-29T15:00:00Z");
const dias = (d: number) => new Date(agora.getTime() + d * 86_400_000).toISOString();
const lead = (o: Partial<Lead>): Lead => ({ id: o.nome ?? "x", nome: "Ana Lima", email: null, telefone: "11999999999", cadastroEm: dias(-10), convite: null, origem: null, desafio: null, acessoFim: dias(20), onboarding: true, objetivo: null, treinosFeitos: 1, ultimoTreino: null, whatsapp: null, status: "novo", anotacao: null, convertido: false, ...o });

describe("Com quem falar agora", () => {
  it("prioriza quem pediu, depois quem está terminando, engajados e parados", () => {
    const r = comQuemFalar([lead({ nome: "Dani", treinosFeitos: 0 }), lead({ nome: "Caio", treinosFeitos: 5 }), lead({ nome: "Bia", acessoFim: dias(2) }), lead({ nome: "Ana", whatsapp: { ref: "APP-X", em: dias(-1) } })], agora);
    expect(r.map((c) => [c.lead.nome, c.motivo])).toEqual([["Ana", "pediu"], ["Bia", "terminando"], ["Caio", "engajado"], ["Dani", "parado"]]);
    expect(r[0].mensagem).toMatch(/^Oi, Ana!/);
  });
  it("não entra quem virou aluno, sem interesse, já em conversa sem urgência ou tudo bem", () => {
    expect(comQuemFalar([lead({ convertido: true, whatsapp: { ref: "A", em: dias(0) } }), lead({ status: "sem_interesse", acessoFim: dias(1) }), lead({ status: "em_conversa", treinosFeitos: 5 }), lead({})], agora)).toEqual([]);
  });
  it("acesso: de 5 dias antes até 7 depois do fim", () => {
    expect(comQuemFalar([lead({ acessoFim: dias(6) })], agora)).toEqual([]);
    expect(comQuemFalar([lead({ acessoFim: dias(-3) })], agora)[0].texto).toMatch(/terminou há 3 dias/);
    expect(comQuemFalar([lead({ acessoFim: dias(-8) })], agora)).toEqual([]);
  });
});
