import { describe, expect, it } from "vitest";
import { conviteLiberado, faixaDedicacao, linkOferta, mensagemConviteAmigo, ofertaFimAcesso, prazoRestante } from "./campanhas";

const agora = new Date("2026-11-18T12:00:00Z");
const inicio = "2026-10-20T12:00:00Z";
const fim = "2026-11-19T12:00:00Z"; // falta 1 dia

describe("convite de amigo", () => {
  it("libera a partir do 4º treino e até ganhar os +30 dias", () => {
    expect(conviteLiberado(3, { amigos: 0, diasGanhos: 0 })).toBe(false);
    expect(conviteLiberado(4, { amigos: 0, diasGanhos: 0 })).toBe(true);
    expect(conviteLiberado(9, { amigos: 2, diasGanhos: 20 })).toBe(true);
    expect(conviteLiberado(9, { amigos: 3, diasGanhos: 30 })).toBe(false);
  });
  it("mensagem com Olá e o link", () => {
    const m = mensagemConviteAmigo("https://app/convite/AMIGO-ABCDE");
    expect(m.startsWith("Olá!")).toBe(true);
    expect(m).toContain("https://app/convite/AMIGO-ABCDE");
    expect(m).toContain("30 dias");
  });
});

describe("oferta do fim do acesso", () => {
  const base = { fim, inicio, frequenciaSemanal: 3, eventos: [], agora };
  it("faixas pela meta semanal", () => {
    // ~4,1 semanas × 3 = ~12,4 treinos esperados
    expect(faixaDedicacao({ treinosConcluidos: 9, frequenciaSemanal: 3, inicio, fim, agora }).faixa).toBe("alta");
    expect(faixaDedicacao({ treinosConcluidos: 6, frequenciaSemanal: 3, inicio, fim, agora }).faixa).toBe("media");
    expect(faixaDedicacao({ treinosConcluidos: 2, frequenciaSemanal: 3, inicio, fim, agora }).faixa).toBe("baixa");
    expect(faixaDedicacao({ treinosConcluidos: 12, frequenciaSemanal: 6, inicio, fim, agora }).faixa).toBe("alta"); // 12+ treinos
  });
  it("20% para a faixa alta, com 72 h a partir da 1ª exibição", () => {
    const o = ofertaFimAcesso({ ...base, treinosConcluidos: 10 });
    expect(o?.id).toBe("oferta_desconto");
    expect(o?.expiraEm).toBe("2026-11-21T12:00:00.000Z");
    const vista = [{ cta: "oferta_desconto", tipo: "exibido" as const, created_at: "2026-11-15T11:00:00Z" }];
    expect(ofertaFimAcesso({ ...base, treinosConcluidos: 10, eventos: vista })).toBeNull(); // passou de 72 h
  });
  it("conversa para a média e pergunta para a baixa", () => {
    expect(ofertaFimAcesso({ ...base, treinosConcluidos: 6 })?.id).toBe("oferta_conversa");
    expect(ofertaFimAcesso({ ...base, treinosConcluidos: 1 })?.id).toBe("oferta_feedback");
  });
  it("só dos 5 dias antes até 7 dias depois do fim; sem prazo, nada", () => {
    expect(ofertaFimAcesso({ ...base, treinosConcluidos: 10, agora: new Date("2026-11-10T12:00:00Z") })).toBeNull();
    expect(ofertaFimAcesso({ ...base, treinosConcluidos: 6, agora: new Date("2026-11-25T12:00:00Z") })?.id).toBe("oferta_conversa");
    expect(ofertaFimAcesso({ ...base, treinosConcluidos: 6, agora: new Date("2026-11-27T12:00:00Z") })).toBeNull();
    expect(ofertaFimAcesso({ ...base, fim: null, treinosConcluidos: 10 })).toBeNull();
  });
  it("link do WhatsApp com o código de origem e prazo legível", () => {
    const o = ofertaFimAcesso({ ...base, treinosConcluidos: 10 })!;
    expect(decodeURIComponent(linkOferta(o, "5511981063409"))).toContain("[APP-OFERTA20]");
    expect(prazoRestante("2026-11-21T17:00:00Z", agora)).toBe("faltam 3 dias e 5 h");
    expect(prazoRestante("2026-11-18T15:30:00Z", agora)).toBe("faltam 3 h");
  });
});
