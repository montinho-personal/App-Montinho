import { describe, expect, it } from "vitest";
import type { SessaoCompleta } from "@/lib/data/sessoes";
import { cargasEmAlta } from "./cargas-em-alta";

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

describe("cargas em alta", () => {
  it("só lista exercícios cuja carga subiu, do maior ganho relativo para o menor", () => {
    const sessoes = [
      sessao(1, "A", [{ ex: "Supino reto", carga: 40, reps: 8 }, { ex: "Crucifixo", carga: 10, reps: 12 }, { ex: "Rosca", carga: 12, reps: 10 }]),
      sessao(8, "A", [{ ex: "Supino reto", carga: 35, reps: 8 }, { ex: "Crucifixo", carga: 12, reps: 12 }, { ex: "Rosca", carga: 10, reps: 10 }]),
      sessao(15, "A", [{ ex: "Supino reto", carga: 30, reps: 8 }, { ex: "Rosca", carga: 10, reps: 10 }]),
    ];
    const r = cargasEmAlta(sessoes);
    expect(r.map((x) => x.nome)).toEqual(["Supino reto", "Rosca"]);
    expect(r[0]).toMatchObject({ primeira: 30, ultima: 40, ganhoKg: 10, ganhoPct: 33 });
    expect(r[0].pontos.map((p) => p.carga)).toEqual([30, 35, 40]);
  });

  it("usa o resumo importado como ponto de partida e respeita o limite", () => {
    const sessoes = [sessao(1, "A", [{ ex: "Leg press", carga: 120, reps: 10 }])];
    const resumos = [{ data: "2026-09-01", exercicio_nome: "Leg press", series: 4, carga_max_kg: 100, volume_kg: 3600 }];
    const r = cargasEmAlta(sessoes, resumos, 1);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ desde: "2026-09-01", ganhoKg: 20 });
    expect(cargasEmAlta([sessao(1, "A", [{ ex: "Leg press", carga: 120, reps: 10 }])])).toEqual([]);
  });
});
