import { describe, expect, it } from "vitest";
import type { SessaoCompleta } from "@/lib/data/sessoes";
import { evolucaoPorMusculo, evolucaoPorTreino } from "./evolucao-geral";
import { relatorioPremium } from "./premium";

function sessao(data: string, letra: string | null, exs: Array<{ ex: string; grupo: string; sets: Array<[number, number]> }>, extra: Partial<SessaoCompleta> = {}): SessaoCompleta {
  const id = `s-${data}-${letra}-${exs.map((e) => e.ex).join("")}`;
  const iso = `${data}T12:00:00Z`;
  return {
    id, aluno_id: "a", treino_id: null, programa_versao_id: null, letra, nome_treino: letra ? `Treino ${letra}` : null, client_key: id, status: "concluida",
    iniciado_em: iso, finalizado_em: iso, duracao_seg: 3600, snapshot: {}, series_planejadas: 3, series_concluidas: 3,
    feedback_percepcao: null, feedback_comentario: null, origem: "app", created_at: iso, updated_at: iso,
    exercicios: exs.map((e, i) => ({
      id: `${id}-${i}`, session_id: id, exercicio_id: null, biblioteca_id: null, client_key: `${id}-${i}`, ordem: i, nome: e.ex, grupo_muscular: e.grupo as never, series_planejadas: e.sets.length, prescricao: {}, status: "concluido", observacao_aluno: null, created_at: iso,
      series: e.sets.map(([c, r], j) => ({ id: `${id}-${i}-${j}`, session_id: id, session_exercise_id: `${id}-${i}`, client_key: `${id}-${i}-${j}`, serie: j + 1, tipo: "valida" as const, carga_kg: c, reps: r, rir: null, rpe: null, tempo_seg: null, lado: null, desconforto: null, observacoes: null, concluida_em: iso, created_at: iso })),
    })),
    ...extra,
  } as SessaoCompleta;
}

const A = (data: string, sup: number, crucifixo: number) => sessao(data, "A", [{ ex: "Supino", grupo: "peito", sets: [[sup, 10], [sup, 10]] }, { ex: "Crucifixo", grupo: "peito", sets: [[crucifixo, 12]] }]);
const B = (data: string, agacho: number) => sessao(data, "B", [{ ex: "Agachamento", grupo: "quadriceps", sets: [[agacho, 10], [agacho, 10], [agacho, 10]] }]);

describe("evolução geral por treino e por músculo", () => {
  const sessoes = [A("2026-09-01", 30, 10), B("2026-09-03", 50), A("2026-09-08", 32, 10), B("2026-09-10", 55), A("2026-09-22", 34, 12), A("2026-09-29", 36, 12), sessao("2026-09-30", null, [{ ex: "Supino", grupo: "peito", sets: [[50, 10]] }], { modo: "extra" } as Partial<SessaoCompleta>)];

  it("por treino: volume das 2 primeiras × 2 últimas sessões, carga típica dos exercícios repetidos, sem treino extra", () => {
    const t = evolucaoPorTreino(sessoes, "2026-09-01", "2026-09-30");
    expect(t.map((x) => x.letra)).toEqual(["A", "B"]);
    const a = t[0];
    expect(a.sessoes.length).toBe(4);
    expect(a.volumeInicial).toBe(Math.round((30 * 20 + 120 + 32 * 20 + 120) / 2)); // 740
    expect(a.volumeAtual).toBe(Math.round((34 * 20 + 144 + 36 * 20 + 144) / 2)); // 844
    expect(a.volumePct).toBe(14.1);
    expect(a.exerciciosComparaveis).toBe(2);
    expect(a.exerciciosSubiram).toBe(2);
    expect(a.cargaPct).toBe(20); // supino +20%, crucifixo +20%
    // B com 2 sessões: primeira × última
    expect(t[1]).toMatchObject({ volumeInicial: 1500, volumeAtual: 1650, volumePct: 10, cargaPct: 10 });
  });

  it("por músculo: prioridades primeiro, séries por semana nas duas metades (28+ dias) e carga típica", () => {
    const r = relatorioPremium({ sessoes, inicio: "2026-09-01", fim: "2026-09-30" });
    const m = evolucaoPorMusculo({ sessoes, inicio: "2026-09-01", fim: "2026-09-30", prioridades: ["quadriceps"], grupos: r.grupos });
    expect(m[0]).toMatchObject({ grupo: "quadriceps", prioridade: true, series: 6, seriesSemanaAntes: 2.8, seriesSemanaAgora: 0 }); // 1º treino em 01/09: metades de 15 dias
    const peito = m.find((x) => x.grupo === "peito")!;
    expect(peito.prioridade).toBe(false);
    expect(peito.series).toBe(13); // 3 × 4 sessões A + 1 série do extra
    expect(peito.exercicios).toBe(2);
    // período curto: sem comparação de metades
    expect(evolucaoPorMusculo({ sessoes, inicio: "2026-09-20", fim: "2026-09-30" })[0].seriesSemanaAntes).toBeNull();
  });
});

describe("metades contadas a partir do 1º treino do período", () => {
  it("período começa antes dos treinos: a 1ª metade não fica zerada", () => {
    const s = [B("2026-09-01", 50), B("2026-09-08", 50), B("2026-09-22", 55), B("2026-09-29", 55)];
    const m = evolucaoPorMusculo({ sessoes: s, inicio: "2026-03-01", fim: "2026-09-30" });
    expect(m[0].seriesSemanaAntes).toBeGreaterThan(0);
    expect(m[0].seriesSemanaAgora).toBeGreaterThan(0);
  });
});
