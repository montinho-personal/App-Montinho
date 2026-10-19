import { describe, expect, it } from "vitest";
import type { SessaoCompleta } from "@/lib/data/sessoes";
import { alertasDoAluno, calendarioSessoes, e1rmEpley, estadoSemana, melhoresMarcas, periodoDias, recordesNoPeriodo, resumoPeriodo, sessoesPlanejadasNoPeriodo, tonelagem } from "./calcular";

const AGORA = new Date("2026-10-19T12:00:00Z"); // segunda-feira

function sessao(diasAtras: number, letra: string, series: Array<{ ex: string; carga: number; reps: number }>, status: SessaoCompleta["status"] = "concluida"): SessaoCompleta {
  const d = new Date(AGORA.getTime() - diasAtras * 86_400_000).toISOString();
  const porEx = new Map<string, Array<{ carga: number; reps: number }>>();
  for (const s of series) porEx.set(s.ex, [...(porEx.get(s.ex) ?? []), { carga: s.carga, reps: s.reps }]);
  const id = `s-${diasAtras}-${letra}`;
  return {
    id, aluno_id: "a", treino_id: null, programa_versao_id: null, letra: letra as SessaoCompleta["letra"], nome_treino: `Treino ${letra}`, client_key: id, status,
    iniciado_em: d, finalizado_em: d, duracao_seg: 3600, snapshot: {}, series_planejadas: series.length + 1, series_concluidas: series.length,
    feedback_percepcao: null, feedback_comentario: null, origem: "app", created_at: d, updated_at: d,
    exercicios: [...porEx.entries()].map(([nome, sets], i) => ({
      id: `${id}-${i}`, session_id: id, exercicio_id: null, biblioteca_id: null, client_key: `${id}-${i}`, ordem: i, nome, grupo_muscular: "peito", series_planejadas: sets.length, prescricao: {}, status: "concluido", observacao_aluno: null, created_at: d,
      series: sets.map((x, j) => ({ id: `${id}-${i}-${j}`, session_id: id, session_exercise_id: `${id}-${i}`, client_key: `${id}-${i}-${j}`, serie: j + 1, tipo: "valida" as const, carga_kg: x.carga, reps: x.reps, rir: null, rpe: null, tempo_seg: null, lado: null, desconforto: null, observacoes: null, concluida_em: d, created_at: d })),
    })),
  };
}

describe("relatórios — fórmulas e denominadores", () => {
  it("e1RM Epley com faixa de validade declarada", () => {
    expect(e1rmEpley(100, 5)).toBeCloseTo(116.7, 1);
    expect(e1rmEpley(100, 1)).toBeCloseTo(103.3, 1);
    expect(e1rmEpley(100, 15)).toBeNull();
    expect(e1rmEpley(0, 5)).toBeNull();
    expect(e1rmEpley(null, 5)).toBeNull();
  });

  it("sessões planejadas usam a frequência do programa, não os dias do período", () => {
    const p = periodoDias(14, AGORA);
    expect(sessoesPlanejadasNoPeriodo({ A: 2, B: 2, C: 1 }, p)).toBe(10);
    expect(sessoesPlanejadasNoPeriodo({ A: 1, B: 1, C: 1 }, periodoDias(30, AGORA))).toBe(13);
    expect(sessoesPlanejadasNoPeriodo({}, p)).toBe(0);
    expect(sessoesPlanejadasNoPeriodo(null, p)).toBe(0);
  });

  it("resumo de 30 dias: aderência, tendência e conquistas reais", () => {
    const sessoes = [
      sessao(2, "A", [{ ex: "Supino", carga: 40, reps: 8 }]),
      sessao(5, "B", [{ ex: "Remada", carga: 50, reps: 10 }]),
      sessao(9, "A", [{ ex: "Supino", carga: 37.5, reps: 8 }]),
      sessao(12, "B", [{ ex: "Remada", carga: 50, reps: 10 }]),
      sessao(16, "A", [{ ex: "Supino", carga: 35, reps: 10 }]),
      sessao(40, "A", [{ ex: "Supino", carga: 35, reps: 8 }]),
      sessao(45, "B", [{ ex: "Remada", carga: 45, reps: 10 }]),
    ];
    const r = resumoPeriodo(sessoes, { A: 1, B: 1 }, 30, AGORA);
    expect(r.sessoesFeitas).toBe(5);
    expect(r.sessoesPlanejadas).toBe(9);
    expect(r.aderencia).toBe(56);
    expect(r.aderenciaAnterior).toBe(22);
    expect(r.tendencia).toBe("melhor");
    expect(r.dadosSuficientes).toBe(true);
    expect(r.conquistas.some((c) => c.tipo === "carga" && c.titulo.includes("Supino"))).toBe(true);
    expect(r.conquistas.length).toBeLessThanOrEqual(3);
  });

  it("sem dados suficientes: estado vazio, sem média fictícia", () => {
    const r = resumoPeriodo([], { A: 1 }, 30, AGORA);
    expect(r.dadosSuficientes).toBe(false);
    expect(r.aderencia).toBe(0);
    expect(r.conquistas).toEqual([]);
    expect(r.duracaoMediaMin).toBeNull();
    const r2 = resumoPeriodo([sessao(1, "A", [])], null, 7, AGORA);
    expect(r2.sessoesPlanejadas).toBe(0);
    expect(r2.aderencia).toBeNull();
    expect(r2.tendencia).toBe("sem_comparacao");
  });

  it("recordes só quando há histórico anterior (primeira execução não é recorde)", () => {
    const p = periodoDias(7, AGORA);
    expect(recordesNoPeriodo([sessao(1, "A", [{ ex: "Supino", carga: 40, reps: 8 }])], p)).toEqual([]);
    const prs = recordesNoPeriodo([sessao(1, "A", [{ ex: "Supino", carga: 40, reps: 8 }]), sessao(20, "A", [{ ex: "Supino", carga: 40, reps: 6 }])], p);
    expect(prs[0]).toMatchObject({ tipo: "reps", valor: 8, carga: 40, anterior: 6 });
  });

  it("melhores marcas por exercício normalizado (sobrevive a troca de id)", () => {
    const m = melhoresMarcas([sessao(1, "A", [{ ex: "Supino Reto", carga: 40, reps: 8 }]), sessao(8, "A", [{ ex: "supino reto", carga: 42.5, reps: 5 }])]);
    expect(m.length).toBe(1);
    expect(m[0].melhorCarga).toMatchObject({ carga: 42.5, reps: 5 });
    expect(m[0].melhorReps).toMatchObject({ reps: 8, carga: 40 });
    expect(m[0].melhorE1rm?.valor).toBeCloseTo(50.7, 1); // 40 kg × 8 reps (Epley) supera 42,5 kg × 5
    expect(m[0].sessoes).toBe(2);
  });

  it("calendário e tonelagem", () => {
    const sessoes = [sessao(1, "A", [{ ex: "Supino", carga: 40, reps: 10 }]), sessao(3, "B", [], "abandonada")];
    const cal = calendarioSessoes(sessoes, periodoDias(7, AGORA));
    expect(cal.length).toBe(7);
    expect(cal.filter((d) => d.status === "feito").length).toBe(1);
    expect(cal.filter((d) => d.status === "abandonado").length).toBe(1);
    expect(tonelagem(sessoes)).toBe(400);
  });

  it("semana flexível: próxima letra segue o ciclo a partir da última concluída", () => {
    const sessoes = [sessao(0, "A", []), sessao(3, "C", [])]; // segunda: fez A hoje
    const e = estadoSemana(sessoes, { A: 1, B: 1, C: 1 }, ["A", "B", "C"], AGORA);
    expect(e.feitasSemana).toBe(1);
    expect(e.planejadasSemana).toBe(3);
    expect(e.proximaLetra).toBe("B");
    expect(e.retomada).toBe(false);
    const parado = estadoSemana([sessao(10, "B", [])], { A: 1, B: 1 }, ["A", "B"], AGORA);
    expect(parado.retomada).toBe(true);
    expect(parado.proximaLetra).toBe("A");
    expect(estadoSemana([], { A: 1 }, [], AGORA).proximaLetra).toBeNull();
  });

  it("alertas do treinador trazem evidência, janela e ação", () => {
    const alertas = alertasDoAluno({ alunoId: "a", alunoNome: "Ana", status: "ativo", sessoes: [sessao(1, "A", [])], frequencia: { A: 1, B: 1, C: 1 }, temPlano: true, adaptacoesAbertas: 1, checkinsDorAlta: 0, agora: AGORA });
    expect(alertas.find((a) => a.tipo === "aderencia")).toMatchObject({ evidencia: "1 de 6 sessões planejadas", janela: "últimas 2 semanas" });
    expect(alertas.find((a) => a.tipo === "adaptacao")?.acao).toContain("Responder");
    expect(alertasDoAluno({ alunoId: "b", alunoNome: "Bruno", status: "ativo", sessoes: [], frequencia: null, temPlano: false, adaptacoesAbertas: 0, checkinsDorAlta: 0, agora: AGORA })[0].tipo).toBe("sem_plano");
    expect(alertasDoAluno({ alunoId: "c", alunoNome: "Pausado", status: "pausado", sessoes: [], frequencia: null, temPlano: false, adaptacoesAbertas: 0, checkinsDorAlta: 0, agora: AGORA })).toEqual([]);
  });
});
