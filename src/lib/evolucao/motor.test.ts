import { describe, expect, it } from "vitest";
import { calcularAderencia, somarDias } from "@/lib/aderencia/calcular";
import { avaliarSerie, descobertasDaSessao, LIMITES_PADRAO, mesmaIdentidade, podeAvisar, principal, resumirExercicio, type ExecucaoAnterior, type SerieReg } from "./motor";
import { pequenaVitoria, VITORIA_NEUTRA } from "./vitoria";

const SUPINO = { exercicioId: "ex-supino", bibliotecaId: "bib-supino-halter", nome: "Supino reto com halteres" };
let n = 0;
const ant = (data: string, series: Array<[number, number] | SerieReg>, o: Partial<ExecucaoAnterior> = {}): ExecucaoAnterior => ({
  ...SUPINO,
  sessaoId: `s${++n}`,
  data: `${data}T13:00:00Z`,
  series: series.map((x, i) => (Array.isArray(x) ? { serie: i + 1, tipo: "valida", carga: x[0], reps: x[1] } : x)),
  ...o,
});
const serie = (carga: number, reps: number, o: Partial<SerieReg> = {}): SerieReg => ({ serie: 1, tipo: "valida", carga, reps, ...o });
const tipos = (xs: ReturnType<typeof avaliarSerie>) => xs.map((d) => d.tipo);

describe("motor — tipos de evolução", () => {
  it("1. mais repetições com a mesma carga (mesma ordem de série = alta)", () => {
    const d = avaliarSerie({ ...SUPINO, serie: serie(20, 12) }, [ant("2026-10-10", [[20, 10]])]);
    expect(d[0]).toMatchObject({ tipo: "mais_reps", confianca: "alta", anterior: { carga: 20, reps: 10 } });
    expect(d[0].mensagem).toBe("Na última vez, você fez 10 repetições com 20 kg. Hoje fez 12 — 2 repetições a mais com a mesma carga.");
  });
  it("2. mais carga com repetições equivalentes", () => {
    const d = avaliarSerie({ ...SUPINO, serie: serie(22, 12) }, [ant("2026-10-10", [[20, 12]])]);
    expect(d[0]).toMatchObject({ tipo: "mais_carga", confianca: "alta" });
    expect(d[0].mensagem).not.toMatch(/força máxima/);
    expect(tipos(avaliarSerie({ ...SUPINO, serie: serie(22, 10) }, [ant("2026-10-10", [[20, 12]])]))).toEqual([]); // menos reps: não é evolução clara
  });
  it("3. acima da média: exige o mínimo de sessões e informa quantas", () => {
    const hist = ["2026-09-20", "2026-09-27", "2026-10-04", "2026-10-11"].map((d) => ant(d, [[20, 10]]));
    // mesma reps da última → sem "mais_reps"; média 10, hoje 11 → acima da média? margem 1 → sim
    const [d] = avaliarSerie({ ...SUPINO, serie: serie(20, 12) }, hist);
    expect(d.tipo).toBe("recorde_reps"); // 12 > melhor marca (10) com 2+ registros: recorde tem prioridade
    const hist2 = [ant("2026-09-20", [[20, 12]]), ...["2026-09-27", "2026-10-04", "2026-10-11"].map((x) => ant(x, [[20, 9]]))];
    const r = avaliarSerie({ ...SUPINO, serie: serie(20, 11) }, hist2);
    expect(r.map((x) => x.tipo)).toContain("mais_reps");
    const so2 = avaliarSerie({ ...SUPINO, serie: serie(20, 12) }, [ant("2026-10-04", [[20, 10]])]);
    expect(so2.some((x) => x.tipo === "acima_media")).toBe(false); // 1 sessão < mínimo
  });
  it("acima da média sem outra evolução", () => {
    const hist = [ant("2026-10-11", [[20, 11]]), ant("2026-10-04", [[20, 9]]), ant("2026-09-27", [[20, 9]]), ant("2026-09-20", [[20, 9]]), ant("2026-09-13", [[22, 9]])];
    const r = avaliarSerie({ ...SUPINO, serie: serie(20, 11) }, hist);
    expect(r.find((x) => x.tipo === "acima_media")?.media).toEqual({ reps: 9.5, carga: 20, sessoes: 4 });
  });
  it("4/5. primeiro registro ou histórico insuficiente: sem destaque; recorde só com 2+ registros", () => {
    expect(avaliarSerie({ ...SUPINO, serie: serie(20, 12) }, [])).toEqual([]);
    expect(tipos(avaliarSerie({ ...SUPINO, serie: serie(30, 8) }, [ant("2026-10-10", [[20, 10]])]))).not.toContain("recorde_carga");
    expect(tipos(avaliarSerie({ ...SUPINO, serie: serie(30, 8) }, [ant("2026-10-03", [[20, 10]]), ant("2026-10-10", [[22, 10]])]))).toContain("recorde_carga");
  });
});

describe("motor — comparabilidade (evita falso progresso)", () => {
  it("6. equipamento diferente (outro item da biblioteca) não compara", () => {
    const barra = ant("2026-10-10", [[20, 10]], { bibliotecaId: "bib-supino-barra", exercicioId: "ex-outro", nome: "Supino reto com barra" });
    expect(avaliarSerie({ ...SUPINO, serie: serie(20, 12) }, [barra])).toEqual([]);
    expect(mesmaIdentidade(SUPINO, { ...SUPINO, bibliotecaId: "bib-leg-horizontal" })).toBe("insuficiente");
  });
  it("só pelo nome (sem biblioteca) = confiança moderada, sem aviso forte", () => {
    const semId = { exercicioId: null, bibliotecaId: null, nome: "Remada curvada" };
    const d = avaliarSerie({ ...semId, serie: serie(30, 12) }, [ant("2026-10-10", [[30, 10]], semId)]);
    expect(d[0].confianca).toBe("moderada");
    expect(principal(d)).toBeNull();
    expect(principal(d, { aceitarModerada: true })?.tipo).toBe("mais_reps");
  });
  it("7. técnica prescrita diferente não compara", () => {
    expect(avaliarSerie({ ...SUPINO, tecnica: "dropset", serie: serie(20, 12) }, [ant("2026-10-10", [[20, 10]])])).toEqual([]);
  });
  it("8/9/10. aquecimento nunca; drop-set e rest-pause só com o mesmo tipo e moderada", () => {
    expect(avaliarSerie({ ...SUPINO, serie: serie(20, 15, { tipo: "aquecimento" }) }, [ant("2026-10-10", [[20, 10]])])).toEqual([]);
    expect(avaliarSerie({ ...SUPINO, serie: serie(20, 12, { tipo: "dropset" }) }, [ant("2026-10-10", [[20, 10]])])).toEqual([]);
    const rp = avaliarSerie({ ...SUPINO, serie: serie(20, 12, { tipo: "rest_pause" }) }, [ant("2026-10-10", [{ serie: 1, tipo: "rest_pause", carga: 20, reps: 10 }])]);
    expect(rp[0]).toMatchObject({ tipo: "mais_reps", confianca: "moderada" });
  });
  it("11/12. assistido e convenção de carga: só o mesmo exercício (item próprio) se compara", () => {
    const assistida = { exercicioId: "ex-barra-assist", bibliotecaId: "bib-barra-assistida", nome: "Barra fixa assistida" };
    expect(avaliarSerie({ ...assistida, serie: serie(30, 8) }, [ant("2026-10-10", [[20, 8]])])).toEqual([]);
    // Halter (carga por halter) × barra (carga total) são itens diferentes: nunca se comparam.
    expect(mesmaIdentidade({ exercicioId: "a", bibliotecaId: "rosca-halter", nome: "Rosca" }, { exercicioId: "b", bibliotecaId: "rosca-barra", nome: "Rosca" })).toBe("insuficiente");
  });
  it("lado diferente (unilateral) e sessão com dor não comparam", () => {
    expect(avaliarSerie({ ...SUPINO, serie: serie(20, 12, { lado: "direito" }) }, [ant("2026-10-10", [{ serie: 1, tipo: "valida", carga: 20, reps: 10, lado: "esquerdo" }])])).toEqual([]);
    expect(avaliarSerie({ ...SUPINO, serie: serie(20, 12) }, [ant("2026-10-10", [[20, 10]], { dor: true })])).toEqual([]);
    expect(avaliarSerie({ ...SUPINO, dor: true, serie: serie(20, 12) }, [ant("2026-10-10", [[20, 10]])])).toEqual([]);
  });
  it("ordem de série diferente: compara pela mesma carga, com confiança moderada", () => {
    const d = avaliarSerie({ ...SUPINO, serie: serie(20, 12, { serie: 3 }) }, [ant("2026-10-10", [[20, 10]])]);
    expect(d[0]).toMatchObject({ tipo: "mais_reps", confianca: "moderada" });
  });
});

describe("resumo do exercício e da sessão", () => {
  it("13. sessão parcial: resume o que foi feito; sem comparabilidade, só o resumo", () => {
    const r = resumirExercicio(SUPINO, [serie(22, 12), { serie: 2, tipo: "valida", carga: null, reps: null }], [ant("2026-10-10", [[20, 12], [20, 12]])]);
    expect(r).toMatchObject({ series: 1, melhor: { carga: 22, reps: 12 }, mensagem: "Boa evolução! Você manteve as repetições usando uma carga maior." });
    const s = resumirExercicio(SUPINO, [serie(20, 8)], []);
    expect(s.comparacao).toBeNull();
    expect(s.mensagem).toMatch(/Manter o planejado/);
  });
  it("14/15/16. edição/exclusão recalculam (nada guardado) e o mesmo recorde não se repete na sessão", () => {
    const hist = [ant("2026-10-03", [[20, 10]]), ant("2026-10-10", [[20, 10]])];
    const sessao = (s: SerieReg[]) => ({ sessaoId: "hoje", data: "2026-10-17T13:00:00Z", exercicios: [{ ...SUPINO, series: s }] });
    expect(descobertasDaSessao(sessao([serie(20, 12), serie(20, 12, { serie: 2 })]), hist)).toHaveLength(1);
    expect(descobertasDaSessao(sessao([serie(20, 10)]), hist)).toEqual([]); // carga/reps corrigidas para baixo: descoberta some
    expect(descobertasDaSessao(sessao([]), hist)).toEqual([]); // série excluída
  });
  it("17/18. semana de descarga ou manutenção: menos carga/reps não gera mensagem negativa nem destaque", () => {
    expect(avaliarSerie({ ...SUPINO, serie: serie(16, 10) }, [ant("2026-10-10", [[20, 10]]), ant("2026-10-03", [[20, 10]])])).toEqual([]);
  });
  it("19/20. limites: 1 aviso por exercício e 3 por sessão; desativar = não avisar", () => {
    const m = [{ exercicio: "A" }];
    expect(podeAvisar(m, "A")).toBe(false);
    expect(podeAvisar(m, "B")).toBe(true);
    expect(podeAvisar([{ exercicio: "A" }, { exercicio: "B" }, { exercicio: "C" }], "D")).toBe(false);
    expect(podeAvisar([], "A", { porExercicio: 0, porSessao: 0 })).toBe(false);
    expect(LIMITES_PADRAO).toEqual({ porExercicio: 1, porSessao: 3 });
  });
  it("21. histórico importado sem carga não vira base de comparação", () => {
    expect(avaliarSerie({ ...SUPINO, serie: serie(20, 12) }, [ant("2026-10-10", [{ serie: 1, tipo: "valida", carga: null, reps: null }])])).toEqual([]);
  });
});

describe("pequena vitória da semana", () => {
  const metas = [{ desde: "2026-01-01", meta: 2, origem: "personal" as const }];
  const ses = (dias: string[]) => dias.map((d, i) => ({ id: `v${i}`, iniciado_em: `${d}T13:00:00Z`, status: "concluida" as const, series_planejadas: 10, series_concluidas: 10 }));
  it("22. meta da semana cumprida é a primeira prioridade; extras não inflam", () => {
    const sem = calcularAderencia({ inicio: "2026-09-07", hoje: "2026-10-21", metas, sessoes: ses(["2026-10-19", "2026-10-20"]) }).semanas;
    expect(pequenaVitoria({ semanas: sem, sessoes: [], retomadas: [], hoje: "2026-10-21" })?.tipo).toBe("meta");
    const comExtra = calcularAderencia({ inicio: "2026-09-07", hoje: "2026-10-21", metas, sessoes: [...ses(["2026-10-19"]), { id: "x", iniciado_em: "2026-10-20T13:00:00Z", status: "concluida", series_planejadas: 10, series_concluidas: 10, modo: "extra" as const }] }).semanas;
    expect(pequenaVitoria({ semanas: comExtra, sessoes: [], retomadas: [], hoje: "2026-10-21" })?.tipo).not.toBe("meta");
  });
  it("3 de 4 semanas; retomada; sem evidência = null (texto neutro)", () => {
    const segs = ["2026-09-21", "2026-09-28", "2026-10-05", "2026-10-12"];
    const dias = segs.flatMap((w, i) => (i === 3 ? [w] : [w, somarDias(w, 1)])); // a semana mais recente ficou diferente
    const sem = calcularAderencia({ inicio: "2026-09-21", hoje: "2026-10-21", metas, sessoes: ses(dias) }).semanas;
    expect(pequenaVitoria({ semanas: sem, sessoes: [], retomadas: [], hoje: "2026-10-21" })?.mensagem).toMatch(/3 das últimas 4 semanas/);
    const vazio = calcularAderencia({ inicio: "2026-10-12", hoje: "2026-10-21", metas, sessoes: [] }).semanas;
    expect(pequenaVitoria({ semanas: vazio, sessoes: [], retomadas: ["2026-10-20"], hoje: "2026-10-21" })?.tipo).toBe("retomada");
    expect(pequenaVitoria({ semanas: vazio, sessoes: [], retomadas: [], hoje: "2026-10-21" })).toBeNull();
    expect(VITORIA_NEUTRA).toMatch(/Continue registrando/);
  });
  it("23. desempenho em 2+ exercícios na janela de 7 dias (comparação só de períodos completos para aderência)", () => {
    const d = avaliarSerie({ ...SUPINO, serie: serie(20, 12) }, [ant("2026-10-10", [[20, 10]])]);
    const outro = d.map((x) => ({ ...x, exercicio: "Remada" }));
    const sem = calcularAderencia({ inicio: "2026-10-12", hoje: "2026-10-21", metas, sessoes: ses(["2026-10-20"]) }).semanas;
    expect(pequenaVitoria({ semanas: sem, sessoes: [{ dia: "2026-10-20", descobertas: [...d, ...outro] }], retomadas: [], hoje: "2026-10-21" })?.tipo).toBe("desempenho");
  });
});

import { painelDoAluno } from "./painel";
import type { SessaoCompleta } from "@/lib/data/sessoes";

describe("painel do personal", () => {
  const sc = (id: string, dia: string, carga: number, repsN: number, extra: Partial<SessaoCompleta> = {}): SessaoCompleta => ({
    id, aluno_id: "a", treino_id: null, programa_versao_id: null, letra: "A", nome_treino: "A", client_key: id, status: "concluida", iniciado_em: `${dia}T13:00:00Z`, finalizado_em: `${dia}T14:00:00Z`, duracao_seg: 3600, snapshot: {}, series_planejadas: 3, series_concluidas: 3,
    feedback_percepcao: null, feedback_comentario: null, origem: "app", created_at: dia, updated_at: dia,
    exercicios: [{ id: `${id}-e`, session_id: id, exercicio_id: "ex1", biblioteca_id: "bib1", client_key: `${id}-e`, ordem: 0, nome: "Supino", grupo_muscular: "peito", series_planejadas: 1, prescricao: {}, status: "concluido", observacao_aluno: null, created_at: dia,
      series: [{ id: `${id}-s`, session_id: id, session_exercise_id: `${id}-e`, client_key: `${id}-s`, serie: 1, tipo: "valida", carga_kg: carga, reps: repsN, rir: null, rpe: null, tempo_seg: null, lado: null, desconforto: null, observacoes: null, concluida_em: dia, created_at: dia }] }],
    ...extra,
  }) as SessaoCompleta;
  const ader = { semanas: [], indices: { semanaAtual: { pct: null, pontos: 0, meta: 0, semanas: 0 }, d28: { pct: 80, pontos: 0, meta: 0, semanas: 4 }, s12: { pct: null, pontos: 0, meta: 0, semanas: 0 }, total: { pct: null, pontos: 0, meta: 0, semanas: 0 } } };
  it("24. só usa os registros do próprio aluno; mostra a evidência e marca revisão sem recomendar carga", () => {
    const linha = painelDoAluno([sc("s2", "2026-10-19", 20, 12), sc("s1", "2026-10-12", 20, 10)], ader, "2026-10-20");
    expect(linha.descobertas[0]).toMatchObject({ tipo: "mais_reps", sessaoId: "s2", anterior: { reps: 10 } });
    expect(linha.dadosInsuficientes).toBe(false);
    const dor = painelDoAluno([sc("s2", "2026-10-19", 20, 12, { feedback_percepcao: "dor" }), sc("s1", "2026-10-12", 20, 10)], ader, "2026-10-20");
    expect(dor.descobertas).toEqual([]);
    expect(dor.revisar[0]).toMatch(/dor/);
    expect(JSON.stringify(dor)).not.toMatch(/aument/i);
    expect(painelDoAluno([], ader, "2026-10-20").dadosInsuficientes).toBe(true);
  });
});
