import { describe, expect, it } from "vitest";
import { CTAS, escolherCta, IDS_CTA, linkCta, type ContextoCta } from "./ctas";

const agora = new Date("2026-10-22T15:00:00Z");
const base: ContextoCta = { tela: "inicio", acesso: "ativo", desafioConcluido: false, treinosConcluidos: 0, temTreinoProprio: false, eventos: [], agora };
const ha = (dias: number) => new Date(agora.getTime() - dias * 86_400_000).toISOString();

describe("convites do visitante para o WhatsApp", () => {
  it("todo convite tem código APP-… único e leva ao WhatsApp oficial com o código", () => {
    const refs = IDS_CTA.map((i) => CTAS[i].ref);
    expect(new Set(refs).size).toBe(refs.length);
    for (const r of refs) expect(r).toMatch(/^APP-[A-Z]+$/);
    expect(linkCta(CTAS.instagram, { whatsapp: "5511981063409", instagram: "montinho_personal" })).toBe("https://instagram.com/montinho_personal");
    expect(linkCta(CTAS.constancia, { whatsapp: "5511981063409" })).toBe(`https://wa.me/5511981063409?text=${encodeURIComponent("Oi, Montinho! Estou treinando com o app e queria um plano feito para mim. [APP-CONSTANCIA]")}`);
  });

  it("no máximo um por tela, o de maior prioridade", () => {
    expect(escolherCta(base)).toBeNull();
    expect(escolherCta({ ...base, treinosConcluidos: 1 })?.id).toBe("instagram");
    expect(escolherCta({ ...base, treinosConcluidos: 6 })?.id).toBe("constancia");
    expect(escolherCta({ ...base, treinosConcluidos: 6, desafioConcluido: true })?.id).toBe("desafio_concluido");
    expect(escolherCta({ ...base, tela: "evolucao", treinosConcluidos: 4 })?.id).toBe("evolucao");
    expect(escolherCta({ ...base, tela: "meus_treinos", temTreinoProprio: true })?.id).toBe("montar_treino");
  });

  it("aviso de acesso: vencido sempre aparece; vencendo pode ser dispensado por 2 dias", () => {
    const vencido = { ...base, tela: "aviso" as const, acesso: "vencido" as const };
    expect(escolherCta({ ...vencido, eventos: [{ cta: "acesso_vencido", tipo: "dispensado", created_at: ha(0) }] })?.id).toBe("acesso_vencido");
    const vencendo = { ...base, tela: "aviso" as const, acesso: "vencendo" as const };
    expect(escolherCta({ ...vencendo, eventos: [{ cta: "acesso_vencendo", tipo: "dispensado", created_at: ha(1) }] })).toBeNull();
    expect(escolherCta({ ...vencendo, eventos: [{ cta: "acesso_vencendo", tipo: "dispensado", created_at: ha(3) }] })?.id).toBe("acesso_vencendo");
  });

  it("com acesso vencido, nenhum convite comercial além do aviso", () => {
    expect(escolherCta({ ...base, acesso: "vencido", treinosConcluidos: 20, desafioConcluido: true })).toBeNull();
  });

  it("dispensou ou tocou: volta em 2 dias; Instagram tocado não volta", () => {
    const c = { ...base, treinosConcluidos: 6 };
    expect(escolherCta({ ...c, eventos: [{ cta: "constancia", tipo: "clicado", created_at: ha(1.5) }] })?.id).toBe("instagram");
    expect(escolherCta({ ...c, eventos: [{ cta: "constancia", tipo: "clicado", created_at: ha(2.1) }] })?.id).toBe("constancia");
    expect(escolherCta({ ...c, eventos: [{ cta: "constancia", tipo: "dispensado", created_at: ha(2.1) }] })?.id).toBe("constancia");
    expect(escolherCta({ ...base, treinosConcluidos: 1, eventos: [{ cta: "instagram", tipo: "clicado", created_at: ha(20) }] })).toBeNull();
  });

  it("um dia sim, um dia não", () => {
    const c = { ...base, treinosConcluidos: 6 };
    const exibido = (dias: number) => ({ cta: "constancia", tipo: "exibido" as const, created_at: ha(dias) });
    // ontem teve convite, hoje ainda não: folga
    expect(escolherCta({ ...c, eventos: [exibido(1)] })).toBeNull();
    // já apareceu hoje: continua hoje (outras telas também)
    expect(escolherCta({ ...c, tela: "evolucao", eventos: [exibido(1), exibido(0)] })?.id).toBe("evolucao");
    // anteontem teve, ontem não: hoje volta
    expect(escolherCta({ ...c, eventos: [exibido(2)] })?.id).toBe("constancia");
    // o aviso de acesso fica fora do rodízio
    expect(escolherCta({ ...base, tela: "aviso", acesso: "vencendo", eventos: [exibido(1)] })?.id).toBe("acesso_vencendo");
  });
});
