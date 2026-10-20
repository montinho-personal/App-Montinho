import { describe, expect, it } from "vitest";
import { calcularAderencia } from "@/lib/aderencia/calcular";
import { detectarConquistas, mensagemConclusao, recordesDaSessao, type SessaoConquista } from "./regras";

let n = 0;
type Opc = Partial<SessaoConquista> & { carga?: number; reps?: number[] };
function s(dia: string, o: Opc = {}): SessaoConquista {
  const { carga, reps, ...resto } = o;
  return {
    id: `s${++n}`,
    iniciado_em: `${dia}T13:00:00Z`,
    status: "concluida",
    series_planejadas: 10,
    series_concluidas: 10,
    exercicios: carga ? [{ exercicio_id: "supino", nome: "Supino reto", series: (reps ?? [10, 10]).map((r) => ({ tipo: "valida", carga_kg: carga, reps: r })) }] : [],
    ...resto,
  };
}
const metas = [{ desde: "2026-01-01", meta: 2, origem: "personal" as const }];
function detectar(sessoes: SessaoConquista[], hoje = "2026-10-21", extra: { relatorioVistoEm?: string } = {}) {
  const aderencia = calcularAderencia({ inicio: "2026-08-03", hoje, metas, sessoes });
  return detectarConquistas({ sessoes, aderencia, ...extra });
}
const codigos = (xs: ReturnType<typeof detectar>) => xs.map((x) => x.codigo);

describe("conquistas — marcos de treinos", () => {
  it("primeiro treino concluído; parcial não conta como 'concluído'", () => {
    expect(codigos(detectar([s("2026-10-20", { series_concluidas: 2 })]))).not.toContain("primeiro_treino");
    const r = detectar([s("2026-10-20")]);
    expect(r.find((x) => x.codigo === "primeiro_treino")?.referencia).toBe("1");
  });

  it("10/25 treinos; extras não entram na contagem", () => {
    const dias = Array.from({ length: 12 }, (_, i) => `2026-09-${String(i + 1).padStart(2, "0")}`);
    const comExtras = dias.map((d, i) => s(d, i < 3 ? { modo: "extra" } : {}));
    expect(codigos(detectar(comExtras))).not.toContain("treinos_10");
    expect(codigos(detectar(dias.map((d) => s(d))))).toContain("treinos_10");
    expect(codigos(detectar(dias.map((d) => s(d))))).not.toContain("treinos_25");
  });

  it("idempotência: recalcular gera exatamente os mesmos pares código+referência", () => {
    const xs = [s("2026-09-01"), s("2026-09-02"), s("2026-10-01")];
    const a = detectar(xs).map((x) => `${x.codigo}:${x.referencia}`);
    const b = detectar(xs).map((x) => `${x.codigo}:${x.referencia}`);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
  });
});

describe("conquistas — semanas", () => {
  it("primeira meta semanal e 4 semanas seguidas (pausa não quebra)", () => {
    const xs = ["2026-09-07", "2026-09-08", "2026-09-14", "2026-09-15", "2026-09-21", "2026-09-22", "2026-09-28", "2026-09-29"].map((d) => s(d));
    const r = detectar(xs);
    expect(codigos(r)).toContain("primeira_meta_semanal");
    expect(codigos(r)).toContain("semanas_consistentes_4");
    expect(codigos(r)).not.toContain("semanas_consistentes_8");
  });

  it("semana sem treino quebra a sequência", () => {
    const xs = ["2026-09-07", "2026-09-08", "2026-09-14", "2026-09-15", "2026-09-28", "2026-09-29", "2026-10-05", "2026-10-06"].map((d) => s(d));
    expect(codigos(detectar(xs))).not.toContain("semanas_consistentes_4");
  });
});

describe("conquistas — retomada e relatório", () => {
  it("'Eu voltei' após 14+ dias; referência é a data da volta", () => {
    const r = detectar([s("2026-09-01"), s("2026-09-20")]);
    const v = r.find((x) => x.codigo === "eu_voltei")!;
    expect(v.referencia).toBe("2026-09-20");
    expect(v.dados?.diasAfastado).toBe(19);
    expect(codigos(detectar([s("2026-09-01"), s("2026-09-10")]))).not.toContain("eu_voltei");
  });

  it("relatório consultado só quando registrado", () => {
    expect(codigos(detectar([s("2026-10-01")]))).not.toContain("relatorio_mensal");
    expect(codigos(detectar([s("2026-10-01")], "2026-10-21", { relatorioVistoEm: "2026-10-02T10:00:00Z" }))).toContain("relatorio_mensal");
  });
});

describe("recordes comparáveis", () => {
  it("mais repetições com a mesma carga, com 2+ registros anteriores", () => {
    const ant = [s("2026-09-01", { carga: 20, reps: [10, 9] }), s("2026-09-05", { carga: 20, reps: [10, 10] })];
    const r = recordesDaSessao(s("2026-09-10", { carga: 20, reps: [12, 10] }), ant);
    expect(r).toEqual([{ exercicio: "Supino reto", tipo: "reps", antes: 10, agora: 12, carga: 20 }]);
  });

  it("dados insuficientes (só 1 registro anterior) → sem recorde", () => {
    expect(recordesDaSessao(s("2026-09-10", { carga: 30 }), [s("2026-09-01", { carga: 20 })])).toEqual([]);
  });

  it("sessão com dor relatada não vira recorde", () => {
    const ant = [s("2026-09-01", { carga: 20 }), s("2026-09-05", { carga: 20 })];
    expect(recordesDaSessao(s("2026-09-10", { carga: 25, feedback_percepcao: "dor" }), ant)).toEqual([]);
    expect(recordesDaSessao(s("2026-09-10", { carga: 25 }), ant)[0]).toMatchObject({ tipo: "carga", antes: 20, agora: 25 });
  });
});

describe("mensagem da conclusão (automática, baseada em fatos)", () => {
  const base = s("2026-10-20");
  it("meta cumprida por ESTA sessão → modelo B", () => {
    const r = mensagemConclusao({ sessao: base, conquistas: [], meta: 3, pontosSemana: 3 });
    expect(r.metaCumpridaAgora).toBe(true);
    expect(r.modeloSugerido).toBe("B");
    expect(mensagemConclusao({ sessao: base, conquistas: [], meta: 3, pontosSemana: 2 }).metaCumpridaAgora).toBe(false);
  });
  it("meta já cumprida antes não é anunciada de novo", () => {
    expect(mensagemConclusao({ sessao: base, conquistas: [], meta: 2, pontosSemana: 3.5 }).metaCumpridaAgora).toBe(false);
  });
  it("treino extra, parcial e primeiro treino têm mensagens próprias", () => {
    expect(mensagemConclusao({ sessao: s("2026-10-20", { modo: "extra" }), conquistas: [], meta: 3, pontosSemana: 3 }).mensagem).toBe("Hoje teve um chalalá extra!");
    expect(mensagemConclusao({ sessao: s("2026-10-20", { series_concluidas: 3 }), conquistas: [], meta: 3, pontosSemana: 0.5 }).mensagem).toMatch(/adaptou/);
    const primeiro = detectar([base]).filter((x) => x.sessaoId === base.id);
    expect(mensagemConclusao({ sessao: base, conquistas: primeiro, meta: 3, pontosSemana: 1 }).mensagem).toBe("Todo resultado começa com um primeiro passo.");
  });
  it("dor relatada: mensagem de cuidado, sem celebração de recorde", () => {
    const r = mensagemConclusao({ sessao: s("2026-10-20", { feedback_percepcao: "dor" }), conquistas: [], meta: 3, pontosSemana: 1 });
    expect(r.mensagem).toMatch(/desconforto/);
    expect(r.modeloSugerido).toBe("A");
  });
});

describe("histórico importado (não conta para aderência/conquistas)", () => {
  it("não gera conquistas, mas serve de base para recordes", () => {
    const imp = (d: string, carga: number) => s(d, { carga, reps: [10], conta_aderencia: false });
    const xs = [imp("2026-09-01", 30), imp("2026-09-08", 30), imp("2026-09-15", 30), s("2026-10-10", { carga: 32, reps: [10] })];
    const r = detectar(xs);
    expect(r.find((x) => x.codigo === "primeiro_treino")?.sessaoId).toBe(xs[3].id); // 1º treino é o do app
    expect(r.filter((x) => x.codigo === "recorde").map((x) => x.sessaoId)).toEqual([xs[3].id]); // recorde contra o histórico
    expect(codigos(r)).not.toContain("eu_voltei");
  });
});

