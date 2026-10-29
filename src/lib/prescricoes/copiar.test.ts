import { describe, expect, it } from "vitest";
import { copiarProtocolo } from "./copiar";
import type { PlanoAtivo } from "@/lib/data/programas";

const ex = (o: Record<string, unknown> = {}) => ({ id: "e1", treino_id: "t1", ordem: 0, nome: "Supino reto", series: 4, reps: "8-10", ie: 8, rir: 1, descanso_seg: 120, observacoes: "Pegada média", video_url: null, created_at: "", biblioteca_id: "b1", series_config: { modo: "iguais", series: 4, reps: "8-10", ie: 8, descanso_seg: 120 }, grupo_muscular: "peito", grupos_secundarios: ["triceps"], grupo_origem: "biblioteca", grupo_confianca: "alta", series_aquecimento: 2, tecnica: "rest_pause", tecnica_config: { modo: "finalizacao" }, bloco: "A", unilateral: false, carga_alvo: "80 kg", conta_volume: true, ...o });
const plano = { programa: { id: "p1", aluno_id: "a1", nome: "Hipertrofia 4x", objetivo: "hipertrofia", nivel: "avancado", split: "ABCD", modo_semana: "fixa", frequencia: { A: 1, B: 1 }, calendario: {}, metas_volume: {}, prioridades: ["peito"], equipamentos: [], duracao_min: 60, permite_versao_reduzida: true, observacoes: "Obs", fase: "intensificacao" }, treinos: [{ id: "t1", aluno_id: "a1", letra: "A", nome: "Peito", ativo: true, observacoes: "Aquecer bem", exercicios: [ex()] }, { id: "t2", aluno_id: "a1", letra: "Z", nome: "Antigo", ativo: false, observacoes: null, exercicios: [ex({ id: "e9" })] }] } as unknown as PlanoAtivo;

describe("Copiar protocolo para outro aluno", () => {
  it("copia tudo dos treinos ativos, sem ids e sem a carga", () => {
    const c = copiarProtocolo(plano);
    expect(c.treinos).toHaveLength(1);
    const t = c.treinos[0];
    expect(t).toMatchObject({ letra: "A", nome: "Peito", ativo: true, observacoes: "Aquecer bem" });
    expect(t.id).toBeUndefined();
    const e = t.exercicios[0];
    expect(e.id).toBeUndefined();
    expect(e).toMatchObject({ nome: "Supino reto", series: 4, reps: "8-10", descanso_seg: 120, tecnica: "rest_pause", bloco: "A", series_aquecimento: 2, biblioteca_id: "b1", observacoes: "Pegada média" });
    expect(e.carga_alvo).toBeNull();
  });
  it("leva o programa (frequência, divisão, fase, prioridades)", () => {
    const c = copiarProtocolo(plano);
    expect(c.programa).toMatchObject({ nome: "Hipertrofia 4x", split: "ABCD", frequencia: { A: 1, B: 1 }, fase: "intensificacao", prioridades: ["peito"], permite_versao_reduzida: true });
  });
});
