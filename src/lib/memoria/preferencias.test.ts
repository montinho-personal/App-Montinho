import { describe, expect, it } from "vitest";
import { preferenciasRecorrentes } from "./preferencias";
import type { BibliotecaPrograma, SnapshotExercicio } from "@/lib/supabase/types-sessoes";

const ex = (nome: string, grupo: SnapshotExercicio["grupo_muscular"], series = 3, reps = "8-12", tecnica: SnapshotExercicio["tecnica"] = "normal") =>
  ({ id: nome, ordem: 0, nome, series, reps, ie: null, rir: null, descanso_seg: null, observacoes: null, grupo_muscular: grupo, grupos_secundarios: [], series_aquecimento: 0, tecnica, bloco: null }) as unknown as SnapshotExercicio;

const prog = (split: string, objetivo: string, exs: SnapshotExercicio[], excluido = false) =>
  ({
    id: split + objetivo,
    metadados: { split, objetivo, sessoes_semana: 4 },
    estrutura: { programa: {}, treinos: [{ id: "t", letra: "A", nome: "A", observacoes: null, ativo: true, exercicios: exs }] },
    excluido_em: excluido ? "2026-01-01" : null,
  }) as unknown as BibliotecaPrograma;

describe("preferências recorrentes do treinador", () => {
  it("sem prescrições salvas, não inventa nada", () => {
    const p = preferenciasRecorrentes([]);
    expect(p.baseadoEm).toBe(0);
    expect(p.splits).toEqual([]);
    expect(p.seriesPorExercicioMediana).toBeNull();
    expect(p.exerciciosPorGrupo).toEqual({});
  });

  it("conta só o que foi realmente salvo, ignorando itens excluídos da memória", () => {
    const p = preferenciasRecorrentes([
      prog("Upper/Lower", "hipertrofia", [ex("Supino reto com barra", "peito", 4), ex("Hip thrust com barra", "gluteo", 4, "8-10", "rest_pause")]),
      prog("Upper/Lower", "hipertrofia", [ex("supino reto com barra", "peito", 3), ex("Crucifixo na máquina (peck deck)", "peito", 3, "12-15")]),
      prog("ABC", "forca", [ex("Agachamento livre", "quadriceps", 5, "3-5")]),
      prog("PPL", "hipertrofia", [ex("Leg press 45°", "quadriceps")], true),
    ]);
    expect(p.baseadoEm).toBe(3);
    expect(p.splits[0]).toEqual({ valor: "Upper/Lower", vezes: 2 });
    expect(p.objetivos[0]).toEqual({ valor: "hipertrofia", vezes: 2 });
    expect(p.exerciciosPorGrupo.peito?.[0]).toEqual({ valor: "Supino reto com barra", vezes: 2 });
    expect(p.exerciciosPorGrupo.quadriceps).toEqual([{ valor: "Agachamento livre", vezes: 1 }]);
    expect(p.tecnicas).toEqual([{ valor: "rest_pause", vezes: 1 }]);
    expect(p.seriesPorExercicioMediana).toBe(4);
  });
});
