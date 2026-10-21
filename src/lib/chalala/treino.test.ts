import { describe, expect, it } from "vitest";
import { FRASES, avaliarProgressao, chalalaDaDescoberta, escolherIntervencao, fraseDaTecnica, podeIntervir, serieDaTecnica, textoProgressao, type Registro } from "./treino";
import type { ExecucaoAnterior } from "@/lib/evolucao/motor";

const id = { exercicioId: "ex1", bibliotecaId: "bib-supino", nome: "Supino reto", tecnica: null };
const sess = (data: string, series: Array<[number, number]>, extra: Partial<ExecucaoAnterior> = {}): ExecucaoAnterior => ({ ...id, sessaoId: data, data, series: series.map(([carga, reps], i) => ({ serie: i + 1, tipo: "valida", carga, reps })), ...extra });

describe("orquestrador do Chalalá no treino", () => {
  it("no máximo 2 recados por treino, 1 por exercício para o mesmo tipo", () => {
    const f: Registro[] = [];
    expect(podeIntervir(f, "recorde", "supino")).toBe(true);
    f.push({ tipo: "recorde", exercicio: "supino" });
    expect(podeIntervir(f, "recorde", "supino")).toBe(false);
    expect(podeIntervir(f, "tecnica", "supino")).toBe(true);
    f.push({ tipo: "tecnica", exercicio: "supino" });
    expect(podeIntervir(f, "recorde", "remada")).toBe(false); // limite total
  });
  it("progressão no máximo 1 por treino", () => {
    expect(podeIntervir([{ tipo: "progressao", exercicio: "a" }], "progressao", "b")).toBe(false);
  });
  it("vários ao mesmo tempo: só o de maior prioridade", () => {
    expect(escolherIntervencao([], [{ tipo: "tecnica", exercicio: "a" }, { tipo: "recorde", exercicio: "a" }])?.tipo).toBe("recorde");
    expect(escolherIntervencao([{ tipo: "recorde", exercicio: "a" }], [{ tipo: "recorde", exercicio: "a" }, { tipo: "tecnica", exercicio: "a" }])?.tipo).toBe("tecnica");
  });
  it("frases oficiais por descoberta", () => {
    expect(chalalaDaDescoberta("recorde_carga")?.frase).toBe("Chalalá desbloqueado! Carga nova na conta!");
    expect(chalalaDaDescoberta("mais_reps")?.frase).toBe("O peso é o mesmo, mas o chalalá evoluiu!");
    expect(chalalaDaDescoberta("acima_media")).toBeNull();
    expect(chalalaDaDescoberta("mais_carga")).toBeNull();
    expect(FRASES.inicio).toBe("Bora treinar? O chalalá não vai acontecer sozinho!");
  });
});

describe("técnica avançada prescrita", () => {
  it("drop-set e rest-pause na última série; myo-reps (todas as séries) não tem “chegada”", () => {
    expect(fraseDaTecnica("dropset")).toBe("Última série com um chalalá especial: drop-set!");
    expect(fraseDaTecnica("rest_pause")).toBe("Hoje o chalalá vem em forma de rest-pause.");
    expect(fraseDaTecnica("biset")).toBeNull();
    expect(serieDaTecnica({ tecnica: "dropset" }, 3)).toBe(3);
    expect(serieDaTecnica({ tecnica: "dropset", tecnicaSeries: 2 }, 4)).toBe(3);
    expect(serieDaTecnica({ tecnica: "myo_reps" }, 3)).toBeNull();
    expect(serieDaTecnica({ tecnica: "dropset" }, 1)).toBeNull();
    expect(serieDaTecnica({ tecnica: "dropset", tecnicaSeries: 3 }, 3)).toBeNull(); // em todas
  });
});

describe("incentivo de progressão (Cenário A)", () => {
  const base = { atual: id, repsPrescritas: "8-12", hoje: "2026-10-21" };
  it("duas sessões a 14+ dias, mesma carga, sem ganho de reps e meta cumprida → incentiva", () => {
    const r = avaliarProgressao({ ...base, historico: [sess("2026-10-18", [[40, 10], [40, 10], [40, 9]]), sess("2026-10-01", [[40, 10], [40, 10], [40, 9]])] });
    expect(r).toEqual({ ok: true, carga: 40, reps: 10, semanas: 2 });
    if (r.ok) expect(textoProgressao(r)).toContain("40 kg × 10");
  });
  it("histórico insuficiente ou sem 14 dias → não mostra", () => {
    expect(avaliarProgressao({ ...base, historico: [sess("2026-10-18", [[40, 10]])] })).toMatchObject({ ok: false, motivo: "historico_insuficiente" });
    expect(avaliarProgressao({ ...base, historico: [sess("2026-10-18", [[40, 10]]), sess("2026-10-10", [[40, 10]])] })).toMatchObject({ ok: false, motivo: "sem_14_dias" });
  });
  it("progrediu em carga ou repetições → não é estagnação", () => {
    expect(avaliarProgressao({ ...base, historico: [sess("2026-10-18", [[42, 10]]), sess("2026-10-01", [[40, 10]])] }).ok).toBe(false);
    expect(avaliarProgressao({ ...base, historico: [sess("2026-10-18", [[40, 12]]), sess("2026-10-01", [[40, 10]])] })).toMatchObject({ ok: false, motivo: "progrediu_reps" });
  });
  it("meta não cumprida, dor, restrição ou já mostrado → não incentiva carga", () => {
    const h = [sess("2026-10-18", [[40, 10], [40, 7]]), sess("2026-10-01", [[40, 10], [40, 7]])];
    expect(avaliarProgressao({ ...base, historico: h })).toMatchObject({ ok: false, motivo: "meta_nao_cumprida" });
    const ok = [sess("2026-10-18", [[40, 10]]), sess("2026-10-01", [[40, 10]])];
    expect(avaliarProgressao({ ...base, historico: ok, dorHoje: true }).ok).toBe(false);
    expect(avaliarProgressao({ ...base, historico: ok, bloqueado: true }).ok).toBe(false);
    expect(avaliarProgressao({ ...base, historico: ok, mostradoRecente: true }).ok).toBe(false);
    expect(avaliarProgressao({ ...base, historico: [sess("2026-10-18", [[40, 10]], { dor: true }), sess("2026-10-01", [[40, 10]])] }).ok).toBe(false);
  });
  it("outro exercício/variação não conta; última vez muito antiga não conta", () => {
    const outro = { ...sess("2026-10-18", [[40, 10]]), bibliotecaId: "bib-halter" };
    expect(avaliarProgressao({ ...base, historico: [outro, sess("2026-10-01", [[40, 10]])] }).ok).toBe(false);
    expect(avaliarProgressao({ ...base, historico: [sess("2026-09-20", [[40, 10]]), sess("2026-09-01", [[40, 10]])] })).toMatchObject({ ok: false, motivo: "ultima_antiga" });
    expect(avaliarProgressao({ ...base, repsPrescritas: "até a falha", historico: [sess("2026-10-18", [[40, 10]]), sess("2026-10-01", [[40, 10]])] })).toMatchObject({ ok: false, motivo: "faixa_desconhecida" });
  });
});
