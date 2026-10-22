import { describe, expect, it } from "vitest";
import type { SessaoCompleta } from "@/lib/data/sessoes";
import { inicioDoPeriodo, relatorioPremium } from "./premium";

function sessao(data: string, exs: Array<{ ex: string; grupo: string; sets: Array<[number, number]> }>): SessaoCompleta {
  const id = `s-${data}-${exs.map((e) => e.ex).join("")}`;
  const iso = `${data}T12:00:00Z`;
  return {
    id, aluno_id: "a", treino_id: null, programa_versao_id: null, letra: "A", nome_treino: "A", client_key: id, status: "concluida",
    iniciado_em: iso, finalizado_em: iso, duracao_seg: 3600, snapshot: {}, series_planejadas: 3, series_concluidas: 3,
    feedback_percepcao: null, feedback_comentario: null, origem: "app", created_at: iso, updated_at: iso,
    exercicios: exs.map((e, i) => ({
      id: `${id}-${i}`, session_id: id, exercicio_id: null, biblioteca_id: null, client_key: `${id}-${i}`, ordem: i, nome: e.ex, grupo_muscular: e.grupo as never, series_planejadas: e.sets.length, prescricao: {}, status: "concluido", observacao_aluno: null, created_at: iso,
      series: e.sets.map(([c, r], j) => ({ id: `${id}-${i}-${j}`, session_id: id, session_exercise_id: `${id}-${i}`, client_key: `${id}-${i}-${j}`, serie: j + 1, tipo: "valida" as const, carga_kg: c, reps: r, rir: null, rpe: null, tempo_seg: null, lado: null, desconforto: null, observacoes: null, concluida_em: iso, created_at: iso })),
    })),
  } as SessaoCompleta;
}

const sup = (data: string, carga: number) => sessao(data, [{ ex: "Supino reto", grupo: "peito", sets: [[carga, 10], [carga, 8]] }]);

describe("relatório premium de evolução de carga", () => {
  it("período: desde o início ou últimos N dias, nunca antes do início", () => {
    expect(inicioDoPeriodo("tudo", "2026-10-22", "2026-03-12")).toBe("2026-03-12");
    expect(inicioDoPeriodo("30", "2026-10-22", "2026-03-12")).toBe("2026-09-23");
    expect(inicioDoPeriodo("90", "2026-10-22", "2026-10-01")).toBe("2026-10-01");
  });

  it("evolução por exercício: primeiro × último dia, força estimada e marcos com 2+ treinos antes", () => {
    const r = relatorioPremium({
      sessoes: [sup("2026-09-01", 30), sup("2026-09-08", 32.5), sup("2026-09-15", 35), sup("2026-09-22", 40), sessao("2026-09-22", [{ ex: "Remada baixa", grupo: "costas", sets: [[50, 10]] }])],
      inicio: "2026-09-01",
      fim: "2026-09-30",
    });
    const s = r.exercicios.find((e) => e.nome === "Supino reto")!;
    expect(s.inicial).toEqual({ data: "2026-09-01", carga: 30 });
    expect(s.atual).toEqual({ data: "2026-09-22", carga: 40 });
    expect(s.deltaKg).toBe(10);
    expect(s.deltaPct).toBe(33.3);
    expect(s.e1rmInicial).toBe(40); // 30 × (1 + 10/30)
    expect(s.e1rmAtual).toBe(53.3);
    // Remada só tem 1 dia: fica fora da comparação
    expect(r.exercicios.some((e) => e.nome === "Remada baixa")).toBe(false);
    // Marcos: 35 kg (2 antes) e 40 kg (3 antes); 32,5 kg só tinha 1 antes
    expect(r.marcos.map((m) => m.carga)).toEqual([40, 35]);
    expect(r.treinos).toBe(5);
    expect(r.exerciciosQueSubiram).toBe(1);
    expect(r.destaques[0].nome).toBe("Supino reto");
    expect(r.grupos[0].rotulo).toBeTruthy();
    expect(r.volumeSemanal.length).toBe(5); // semanas de 31/08 a 28/09
    expect(r.volumeSemanal.reduce((n, w) => n + w.treinos, 0)).toBe(5);
  });

  it("histórico importado de outro app entra nos dias sem registro", () => {
    const r = relatorioPremium({
      sessoes: [sup("2026-09-22", 40)],
      resumos: [{ data: "2026-09-01", exercicio_nome: "supino reto", series: 3, carga_max_kg: 30, volume_kg: 900 }],
      inicio: "2026-09-01",
      fim: "2026-09-30",
    });
    expect(r.exercicios[0].inicial.carga).toBe(30);
    expect(r.exercicios[0].deltaKg).toBe(10);
    expect(r.semDados).toBe(false);
  });

  it("sem treinos no período: estado vazio, sem números inventados", () => {
    const r = relatorioPremium({ sessoes: [], inicio: "2026-09-01", fim: "2026-09-30" });
    expect(r.semDados).toBe(true);
    expect(r.mediaPct).toBeNull();
    expect(r.exercicios).toEqual([]);
  });
});
