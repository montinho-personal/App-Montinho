import { describe, expect, it } from "vitest";
import { indicacaoDaAnamnese, lembrarHoje, mobilidadeDoAluno, segundaDe, situacaoMobilidade } from "./indicacao";
import type { SessaoMobilidade } from "./regras";

const ses = (protocolo: "superiores" | "inferiores", inicio: string): SessaoMobilidade => ({ id: inicio, protocolo, status: "concluida", iniciado_em: inicio, concluido_em: new Date(Date.parse(inicio) + 20 * 60_000).toISOString(), nota_antes: 5, nota_depois: 3 });

describe("indicacaoDaAnamnese", () => {
  it("ombro → superiores; joelho → inferiores; os dois", () => {
    expect(indicacaoDaAnamnese({ lesoes: "Condromalácia no joelho. Desconforto no ombro direito." })).toEqual({ protocolos: ["superiores", "inferiores"], regioes: ["Ombro", "Joelho"] });
    expect(indicacaoDaAnamnese({ dores_atuais: "Dor lombar ao acordar" }).protocolos).toEqual(["inferiores"]);
    expect(indicacaoDaAnamnese({ dores_atuais: "torcicolo frequente" }).protocolos).toEqual(["superiores"]);
  });
  it("falta de mobilidade sem região → os dois", () => {
    expect(indicacaoDaAnamnese({ dores_atuais: "Sou muito encurtado, pouca flexibilidade" }).protocolos).toEqual(["superiores", "inferiores"]);
  });
  it("nada ou “não” → nada", () => {
    expect(indicacaoDaAnamnese(null).protocolos).toEqual([]);
    expect(indicacaoDaAnamnese({ lesoes: "Não", dores_atuais: "nenhuma" }).protocolos).toEqual([]);
  });
});

describe("mobilidadeDoAluno", () => {
  const anam = { lesoes: "dor no ombro" };
  it("sem prescrição vale a anamnese, todos os dias", () => {
    expect(mobilidadeDoAluno(null, anam)).toMatchObject({ protocolos: ["superiores"], diasSemana: 7, origem: "anamnese" });
  });
  it("o personal manda: troca protocolos/dias ou desliga", () => {
    expect(mobilidadeDoAluno({ protocolos: ["inferiores"], dias_semana: 3, motivo: null, ativo: true, criado_em: "" }, anam)).toMatchObject({ protocolos: ["inferiores"], diasSemana: 3, origem: "personal" });
    expect(mobilidadeDoAluno({ protocolos: [], dias_semana: 7, motivo: null, ativo: false, criado_em: "" }, anam)).toBeNull();
  });
});

describe("situacaoMobilidade", () => {
  const m = { protocolos: ["superiores", "inferiores"] as ("superiores" | "inferiores")[], diasSemana: 3, origem: "personal" as const, motivo: "", regioes: [] };
  it("conta dias diferentes da semana e sugere a feita há mais tempo", () => {
    expect(segundaDe("2026-10-29")).toBe("2026-10-26");
    const s = situacaoMobilidade(m, [ses("superiores", "2026-10-27T12:00:00Z"), ses("superiores", "2026-10-28T12:00:00Z")], "2026-10-29");
    expect(s).toMatchObject({ feitaHoje: false, diasNaSemana: 2, metaBatida: false, hoje: "inferiores" });
    expect(lembrarHoje(s)).toBe(true);
  });
  it("feita hoje ou meta batida: sem lembrete", () => {
    const s = situacaoMobilidade(m, [ses("inferiores", "2026-10-29T12:00:00Z")], "2026-10-29");
    expect(s.feitaHoje).toBe(true);
    expect(lembrarHoje(s)).toBe(false);
  });
});
