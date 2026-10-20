import { describe, expect, it } from "vitest";
import { detalheRelatorio } from "./detalhe";
import type { SessaoCompleta } from "@/lib/data/sessoes";

let n = 0;
function s(dia: string, o: Partial<SessaoCompleta> & { setsSeg?: number[] } = {}): SessaoCompleta {
  const { setsSeg, ...resto } = o;
  const base = Date.parse(`${dia}T13:00:00Z`);
  const series = (setsSeg ?? []).map((t, i) => ({ id: `x${n}${i}`, session_id: "", session_exercise_id: "", client_key: "", serie: i + 1, tipo: "valida" as const, carga_kg: 20, reps: 10, rir: null, rpe: null, tempo_seg: null, lado: null, desconforto: null, observacoes: null, concluida_em: new Date(base + t * 1000).toISOString(), created_at: "" }));
  return {
    id: `d${++n}`, aluno_id: "a", treino_id: "t", programa_versao_id: null, letra: "A", nome_treino: "A", client_key: "", status: "concluida", iniciado_em: new Date(base).toISOString(), finalizado_em: null, duracao_seg: 3000, snapshot: null, series_planejadas: 10, series_concluidas: 10, feedback_percepcao: null, feedback_comentario: null, origem: "app", tempo_estimado_seg: 3000, modo: "normal", created_at: "", updated_at: "",
    exercicios: series.length ? [{ id: "e", session_id: "", exercicio_id: "x", biblioteca_id: null, client_key: "", ordem: 0, nome: "Supino", grupo_muscular: "peito", series_planejadas: 4, prescricao: null, status: "concluido", observacao_aluno: null, created_at: "", series }] : [],
    ...resto,
  } as SessaoCompleta;
}

describe("relatório detalhado", () => {
  it("tempo real × planejado só com 2+ sessões; dentro da tolerância de 15%", () => {
    expect(detalheRelatorio([s("2026-10-10")], "2026-10-01", "2026-10-21").tempo).toBeNull();
    const r = detalheRelatorio([s("2026-10-10"), s("2026-10-12", { duracao_seg: 4200 })], "2026-10-01", "2026-10-21").tempo!;
    expect(r).toMatchObject({ sessoes: 2, mediaRealMin: 60, mediaPlanejadaMin: 50, dentroDoPrevisto: 1, comparaveis: 2 });
  });

  it("descanso mediano só com 10+ intervalos plausíveis (marcação ao vivo)", () => {
    const poucos = detalheRelatorio([s("2026-10-10", { setsSeg: [0, 90, 180] })], "2026-10-01", "2026-10-21");
    expect(poucos.descansoMedianoSeg).toBeNull();
    const muitos = detalheRelatorio([s("2026-10-10", { setsSeg: [0, 90, 180, 270, 360, 450] }), s("2026-10-12", { setsSeg: [0, 100, 200, 300, 400, 5000] })], "2026-10-01", "2026-10-21");
    expect(muitos.intervalosDescanso).toBe(9);
    const ok = detalheRelatorio([s("2026-10-10", { setsSeg: [0, 90, 180, 270, 360, 450] }), s("2026-10-12", { setsSeg: [0, 100, 200, 300, 400, 500] })], "2026-10-01", "2026-10-21");
    expect(ok.descansoMedianoSeg).toBe(95);
  });

  it("extras separados; reduzidas e check-ins contados; interrupções de 14+ dias", () => {
    const r = detalheRelatorio([
      s("2026-09-01"),
      s("2026-10-05", { checkin_pre: "cansado" }),
      s("2026-10-06", { modo: "extra", series_concluidas: 0, series_planejadas: 0, duracao_seg: 1800 }),
      s("2026-10-08", { modo: "reduzido", snapshot: { reducao: { adiados: [{}, {}] } } }),
    ], "2026-10-01", "2026-10-21");
    expect(r.extras).toEqual({ sessoes: 1, minutos: 30, series: 0 });
    expect(r.reduzidas).toEqual({ sessoes: 1, exerciciosAdiados: 2 });
    expect(r.checkin.cansado).toBe(1);
    expect(r.series.planejadas).toBe(20);
    expect(r.interrupcoes).toEqual([{ de: "2026-09-01", ate: "2026-10-05", dias: 34 }]);
  });
});
