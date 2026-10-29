import { describe, expect, it } from "vitest";
import { agendarLembreteAvaliacao, avaliacaoEncerrada, devePedirAvaliacao, type ContextoAvaliacao } from "./avaliacao";
import type { EventoCta } from "./ctas";

const agora = new Date("2026-10-29T15:00:00Z");
const diasAtras = (d: number) => new Date(agora.getTime() - d * 86_400_000).toISOString();
const base = (o: Partial<ContextoAvaliacao> = {}): ContextoAvaliacao => ({ ligado: true, treinosConcluidos: 6, inicio: diasAtras(10), acessoVencido: false, temOferta: false, dor: false, eventos: [], agora, ...o });
const ev = (cta: string, tipo: EventoCta["tipo"], d: number): EventoCta => ({ cta, tipo, created_at: diasAtras(d) });

describe("pedido de avaliação no Google", () => {
  it("pede no fim do treino de quem já conhece o app", () => {
    expect(devePedirAvaliacao(base())).toBe(true);
  });
  it("não pede cedo demais, com dor, com a oferta na tela, vencido ou sem link", () => {
    expect(devePedirAvaliacao(base({ treinosConcluidos: 2 }))).toBe(false);
    expect(devePedirAvaliacao(base({ treinosConcluidos: 3, inicio: diasAtras(2) }))).toBe(true);
    expect(devePedirAvaliacao(base({ dor: true }))).toBe(false);
    expect(devePedirAvaliacao(base({ temOferta: true }))).toBe(false);
    expect(devePedirAvaliacao(base({ acessoVencido: true }))).toBe(false);
    expect(devePedirAvaliacao(base({ ligado: false }))).toBe(false);
  });
  it("abriu o Google ou já avaliou → nunca mais", () => {
    expect(devePedirAvaliacao(base({ eventos: [ev("avaliacao_google", "clicado", 20)] }))).toBe(false);
    expect(devePedirAvaliacao(base({ eventos: [ev("avaliacao_feita", "clicado", 20)] }))).toBe(false);
    expect(avaliacaoEncerrada([ev("avaliacao_sugestao", "clicado", 1)])).toBe(false);
  });
  it("no máximo 3 pedidos, com 5 dias entre eles", () => {
    expect(devePedirAvaliacao(base({ eventos: [ev("avaliacao_google", "exibido", 3), ev("avaliacao_google", "dispensado", 3)] }))).toBe(false);
    expect(devePedirAvaliacao(base({ eventos: [ev("avaliacao_google", "exibido", 5), ev("avaliacao_google", "dispensado", 5)] }))).toBe(true);
    expect(devePedirAvaliacao(base({ eventos: [ev("avaliacao_google", "exibido", 20), ev("avaliacao_google", "exibido", 9)] }))).toBe(true);
    expect(devePedirAvaliacao(base({ eventos: [ev("avaliacao_google", "exibido", 20), ev("avaliacao_google", "exibido", 14), ev("avaliacao_google", "exibido", 8)] }))).toBe(false);
  });
  it("o mesmo pedido de hoje continua na tela; “Agora não” hoje some", () => {
    expect(devePedirAvaliacao(base({ eventos: [ev("avaliacao_google", "exibido", 0)] }))).toBe(true);
    expect(devePedirAvaliacao(base({ eventos: [ev("avaliacao_google", "exibido", 0), ev("avaliacao_google", "dispensado", 0)] }))).toBe(false);
  });
  it("lembrete no celular só no 1º pedido", () => {
    expect(agendarLembreteAvaliacao([], agora)).toBe(true);
    expect(agendarLembreteAvaliacao([ev("avaliacao_google", "exibido", 0)], agora)).toBe(true);
    expect(agendarLembreteAvaliacao([ev("avaliacao_google", "exibido", 9)], agora)).toBe(false);
    expect(agendarLembreteAvaliacao([ev("avaliacao_google", "clicado", 9)], agora)).toBe(false);
  });
});
