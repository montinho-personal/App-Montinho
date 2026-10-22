import { describe, expect, it } from "vitest";
import { montarExtraGerado, primeiraFaixa, semanaCumprida, type EntradaExtraGerado } from "./extra-gerado";
import type { ExercicioPrescrito } from "@/lib/supabase/types-sessoes";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";

let n = 0;
const ex = (nome: string, grupo: GrupoMuscular, o: Partial<ExercicioPrescrito> = {}): ExercicioPrescrito =>
  ({ id: `e${++n}`, treino_id: "t", ordem: n, nome, series: 4, reps: "10-12/8-10/8-10/6-8", ie: 9, descanso_seg: 90, observacoes: null, video_url: null, created_at: "", grupo_muscular: grupo, grupos_secundarios: [], grupo_origem: null, grupo_confianca: null, series_aquecimento: 1, tecnica: "drop_set", bloco: null, unilateral: false, carga_alvo: "80kg", rir: 0, cadencia: null, conta_volume: true, removido_em: null, ...o }) as unknown as ExercicioPrescrito;

const plano = [
  ex("Hack machine", "quadriceps"), ex("Stiff", "posteriores"), ex("Elevação pélvica", "gluteo"), ex("Glúteo coice polia", "gluteo"),
  ex("Supino reto", "peito"), ex("Remada baixa", "costas"), ex("Desenvolvimento", "ombros"),
  ex("Rosca direta", "biceps"), ex("Tríceps corda", "triceps"), ex("Elevação lateral", "ombro_lateral"), ex("Panturrilha em pé", "panturrilha"), ex("Abdominal infra", "abdomen"),
  ex("Esteira", "cardio"),
];
const base: EntradaExtraGerado = { exercicios: plano, prioridades: ["gluteo", "posteriores"], foco: "prioridade", tempoMin: 30, corpo: "bem", recentes48h: [], proximoTreino: [], seriesDisponiveis: 12 };

describe("extra montado pelo app", () => {
  it("semana cumprida só com todos os treinos programados", () => {
    expect(semanaCumprida(4, 4)).toBe(true);
    expect(semanaCumprida(3, 4)).toBe(false);
    expect(semanaCumprida(5, 4)).toBe(true);
    expect(semanaCumprida(0, null)).toBe(false);
  });

  it("músculos prioridade: só glúteo e posterior, alternando, em versão simples e longe da falha", () => {
    const r = montarExtraGerado(base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.extra.exercicios.every((x) => ["gluteo", "posteriores"].includes(x.grupo_muscular!))).toBe(true);
    expect(r.extra.exercicios.map((x) => x.grupo_muscular).slice(0, 2)).toEqual(["gluteo", "posteriores"]);
    for (const x of r.extra.exercicios) {
      expect(x.tecnica).toBe("normal");
      expect(x.series_aquecimento).toBe(0);
      expect(x.rir).toBe(2);
      expect(x.ie).toBeLessThanOrEqual(7);
      expect(x.reps).toBe("10-12");
      expect(x.carga_alvo).toBeNull();
    }
    expect(r.extra.series).toBeLessThanOrEqual(12);
  });

  it("músculo treinado há menos de 48 h ou do próximo treino fica de fora, com aviso", () => {
    const r = montarExtraGerado({ ...base, foco: "pequenos", recentes48h: ["biceps"], proximoTreino: ["triceps"] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.extra.exercicios.some((x) => ["biceps", "triceps"].includes(x.grupo_muscular!))).toBe(false);
    expect(r.extra.avisos.join(" ")).toMatch(/bíceps/);
    expect(r.extra.avisos.join(" ")).toMatch(/tríceps/);
  });

  it("prioridade toda em recuperação: não monta e sugere músculos pequenos", () => {
    const r = montarExtraGerado({ ...base, recentes48h: ["gluteo", "posteriores"] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.sugerirFoco).toBe("pequenos");
    expect(r.motivo).toMatch(/48 h/);
  });

  it("full body leve: um de perna, empurrar, puxar e core", () => {
    const r = montarExtraGerado({ ...base, foco: "full_body", tempoMin: 45 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const g = r.extra.exercicios.map((x) => x.grupo_muscular);
    expect(g).toEqual(["quadriceps", "peito", "costas", "abdomen"]);
  });

  it("respeita o teto de séries extras da semana e o tempo disponível", () => {
    const pouco = montarExtraGerado({ ...base, foco: "pequenos", tempoMin: 60, seriesDisponiveis: 5 });
    expect(pouco.ok && pouco.extra.series).toBe(5);
    const curto = montarExtraGerado({ ...base, foco: "pequenos", tempoMin: 15 });
    const longo = montarExtraGerado({ ...base, foco: "pequenos", tempoMin: 60 });
    expect(curto.ok && longo.ok).toBe(true);
    if (!curto.ok || !longo.ok) return;
    expect(curto.extra.exercicios.length).toBeLessThan(longo.extra.exercicios.length);
    expect(curto.extra.duracaoMin).toBeLessThanOrEqual(17);
  });

  it("cansado: menos séries; dor: sem extra; limite da semana esgotado: sem extra", () => {
    const c = montarExtraGerado({ ...base, foco: "pequenos", corpo: "cansado" });
    expect(c.ok && c.extra.exercicios.every((x) => x.series === 2)).toBe(true);
    expect(montarExtraGerado({ ...base, corpo: "dor" }).ok).toBe(false);
    expect(montarExtraGerado({ ...base, seriesDisponiveis: 0 }).ok).toBe(false);
  });

  it("nunca usa cardio nem exercício que não conta volume", () => {
    const r = montarExtraGerado({ ...base, foco: "full_body", exercicios: [...plano, ex("Prancha", "core", { conta_volume: false })] });
    expect(r.ok && r.extra.exercicios.some((x) => x.grupo_muscular === "cardio" || x.nome === "Prancha")).toBe(false);
  });

  it("primeira faixa de repetições", () => {
    expect(primeiraFaixa("12-15/10-12")).toBe("12-15");
    expect(primeiraFaixa("45s/60s")).toBe("45s");
    expect(primeiraFaixa(null)).toBe("10-12");
  });
});

import { montarExtraLivre } from "./extra-gerado";
describe("extra do meu jeito", () => {
  const item = (nome: string, grupo: GrupoMuscular, series = 3, reps = "12") => ({ exercicio: ex(nome, grupo), series, reps });
  const b = { corpo: "bem" as const, recentes48h: [] as GrupoMuscular[], seriesDisponiveis: 12 };

  it("monta o que o aluno escolheu, com as séries e reps dele, em versão simples", () => {
    const r = montarExtraLivre({ ...b, itens: [item("Rosca direta", "biceps", 3, "12"), item("Elevação lateral", "ombro_lateral", 4, "15")] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.extra.exercicios.map((x) => [x.nome, x.series, x.reps])).toEqual([["Rosca direta", 3, "12"], ["Elevação lateral", 4, "15"]]);
    expect(r.extra.exercicios.every((x) => x.tecnica === "normal" && x.rir === 2)).toBe(true);
    expect(r.extra.series).toBe(7);
  });

  it("barra músculo treinado há menos de 48 h, dizendo qual", () => {
    const r = montarExtraLivre({ ...b, recentes48h: ["biceps"], itens: [item("Rosca direta", "biceps")] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.motivo).toMatch(/Rosca direta \(bíceps\)/);
  });

  it("respeita o teto de séries da semana, dor e lista vazia", () => {
    const muitas = montarExtraLivre({ ...b, itens: [item("A", "biceps", 5), item("B", "triceps", 5), item("C", "panturrilha", 5)] });
    expect(muitas.ok).toBe(false);
    if (!muitas.ok) expect(muitas.motivo).toMatch(/15 séries.*limite desta semana é 12.*Tire 3/);
    expect(montarExtraLivre({ ...b, corpo: "dor", itens: [item("A", "biceps")] }).ok).toBe(false);
    expect(montarExtraLivre({ ...b, itens: [] }).ok).toBe(false);
  });
});
