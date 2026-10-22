import { describe, expect, it } from "vitest";
import { classificarExtra, CONFIG_EXTRA_PADRAO, type ConfigExtra, type ExtraLiberado, type SessaoRecente } from "./extra";

// Terça-feira, 20/10/2026, 18h em Brasília.
const agora = new Date("2026-10-20T21:00:00Z");
const cfg: ConfigExtra = { ...CONFIG_EXTRA_PADRAO, habilitado: true, requer_aprovacao: false, max_por_semana: 2, limite_series_semana: 12 };
const cardio: ExtraLiberado = { id: "x1", modalidade: "cardio_leve", titulo: "Caminhada", duracao_min: 30, grupos: [], series_estimadas: 0, ativo: true };
const bracos: ExtraLiberado = { id: "x2", modalidade: "resistido", titulo: "Braços", duracao_min: 30, grupos: ["biceps", "triceps"], series_estimadas: 8, ativo: true };
const s = (iso: string, o: Partial<SessaoRecente> = {}): SessaoRecente => ({ iniciado_em: iso, status: "concluida", series_concluidas: 10, grupos: ["peito"], ...o });
const base = { agora, sessoes: [s("2026-10-19T12:00:00Z")], recuperacao: "bem" as const, tempoDisponivelMin: 40 };

describe("treino extra", () => {
  it("aluno autorizado: cardio leve liberado, com aviso de que não conta na meta", () => {
    const r = classificarExtra({ ...base, config: cfg, extra: cardio });
    expect(r.classe).toBe("liberado");
    expect(r.motivos.join(" ")).toMatch(/não conta na meta/);
  });

  it("aluno sem autorização (sem configuração ou desabilitado): não recomendado", () => {
    expect(classificarExtra({ ...base, config: null, extra: cardio }).classe).toBe("nao_recomendado");
    expect(classificarExtra({ ...base, config: { ...cfg, habilitado: false }, extra: cardio }).motivos[0]).toMatch(/ainda não liberou/);
  });

  it("volume incompatível com o limite configurado", () => {
    const sessoes = [s("2026-10-19T12:00:00Z", { modo: "extra", grupos: ["costas"], series_extra: 8 })];
    const r = classificarExtra({ ...base, sessoes, config: cfg, extra: bracos });
    expect(r.classe).toBe("nao_recomendado");
    expect(r.motivos[0]).toMatch(/acima do limite/);
  });

  it("limite de extras por semana", () => {
    const sessoes = [s("2026-10-19T12:00:00Z", { modo: "extra" }), s("2026-10-20T10:00:00Z", { modo: "extra" })];
    expect(classificarExtra({ ...base, sessoes, config: cfg, extra: cardio }).motivos[0]).toMatch(/limite combinado é 2/);
  });

  it("mesmo grupo treinado há menos de 48 h bloqueia extra intenso", () => {
    const sessoes = [s("2026-10-19T22:00:00Z", { grupos: ["biceps", "costas"] })];
    const r = classificarExtra({ ...base, sessoes, config: cfg, extra: bracos });
    expect(r.classe).toBe("nao_recomendado");
    expect(r.motivos[0]).toMatch(/biceps foi treinado/);
  });

  it("sem resposta de recuperação, extra intenso pede aprovação (falta de dado ≠ seguro)", () => {
    const r = classificarExtra({ ...base, recuperacao: null, config: cfg, extra: bracos });
    expect(r.classe).toBe("aprovacao");
    expect(classificarExtra({ ...base, recuperacao: null, config: cfg, extra: bracos, aprovadoHoje: true }).classe).toBe("liberado");
  });

  it("dor relatada agora ou recentemente: não recomendado", () => {
    expect(classificarExtra({ ...base, recuperacao: "dor", config: cfg, extra: cardio }).classe).toBe("nao_recomendado");
    const sessoes = [s("2026-10-19T12:00:00Z", { feedback_percepcao: "dor" })];
    expect(classificarExtra({ ...base, sessoes, config: cfg, extra: cardio }).classe).toBe("nao_recomendado");
  });

  it("dia não permitido e tempo insuficiente", () => {
    expect(classificarExtra({ ...base, config: { ...cfg, dias_permitidos: [6, 0] }, extra: cardio }).motivos[0]).toMatch(/dias liberados/);
    expect(classificarExtra({ ...base, tempoDisponivelMin: 20, config: cfg, extra: cardio }).motivos[0]).toMatch(/30 min/);
  });

  it("personal exige aprovação manual em todo extra", () => {
    expect(classificarExtra({ ...base, config: { ...cfg, requer_aprovacao: true, aprovacao_so_intensos: false }, extra: cardio }).classe).toBe("aprovacao");
  });

  it("aprovação só nos intensos: caminhada e mobilidade liberadas, musculação vira pedido", () => {
    const so = { ...cfg, requer_aprovacao: true, aprovacao_so_intensos: true };
    const mobilidade: ExtraLiberado = { ...cardio, id: "x3", modalidade: "mobilidade", titulo: "Mobilidade" };
    const pernas: ExtraLiberado = { ...bracos, id: "x4", grupos: ["quadriceps"] };
    expect(classificarExtra({ ...base, config: so, extra: cardio }).classe).toBe("liberado");
    expect(classificarExtra({ ...base, config: so, extra: mobilidade }).classe).toBe("liberado");
    const r = classificarExtra({ ...base, config: so, extra: pernas });
    expect(r.classe).toBe("aprovacao");
    expect(r.motivos.join(" ")).toMatch(/de musculação/);
  });

  it("aprovação só nos intensos não fura os bloqueios: dor relatada e dia não permitido continuam valendo", () => {
    const so = { ...cfg, requer_aprovacao: true, aprovacao_so_intensos: true };
    expect(classificarExtra({ ...base, recuperacao: "dor", config: so, extra: cardio }).classe).toBe("nao_recomendado");
    expect(classificarExtra({ ...base, config: { ...so, dias_permitidos: [6, 0] }, extra: cardio }).classe).toBe("nao_recomendado");
  });

  it("padrão novo: aprovação só nos intensos", () => {
    expect(CONFIG_EXTRA_PADRAO.requer_aprovacao).toBe(true);
    expect(CONFIG_EXTRA_PADRAO.aprovacao_so_intensos).toBe(true);
  });

  it("semana com meta já cumprida não muda a regra (extra é avaliado pela recuperação, não pela meta)", () => {
    const sessoes = [s("2026-10-19T12:00:00Z"), s("2026-10-20T11:00:00Z", { grupos: ["pernas"] })];
    expect(classificarExtra({ ...base, sessoes, config: cfg, extra: cardio }).classe).toBe("liberado");
  });

  it("aprovação consciente do personal passa por cima dos bloqueios de recuperação, mas não de dor relatada agora", () => {
    const sessoes = [s("2026-10-19T22:00:00Z", { grupos: ["biceps"] })];
    const r = classificarExtra({ ...base, sessoes, config: cfg, extra: bracos, aprovadoHoje: true });
    expect(r.classe).toBe("liberado");
    expect(r.motivos[0]).toMatch(/ciente de que/);
    expect(classificarExtra({ ...base, recuperacao: "dor", config: cfg, extra: bracos, aprovadoHoje: true }).classe).toBe("nao_recomendado");
    expect(classificarExtra({ ...base, config: { ...cfg, habilitado: false }, extra: bracos, aprovadoHoje: true }).classe).toBe("nao_recomendado");
  });
});
