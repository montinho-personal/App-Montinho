import { describe, expect, it } from "vitest";
import {
  calcularVolumeSemanal,
  compararProgramadoRealizado,
  frequenciaDoCalendario,
  frequenciaPorMicrociclo,
  seriesValidas,
  volumeRealizadoPorGrupo,
  type DiaVolume,
} from "./calcular";
import { detectarGrupo, montarLookupBiblioteca, resolverGrupo } from "@/lib/grupos";

const ex = (nome: string, grupo: Parameters<typeof calcularVolumeSemanal>[0][number]["exercicios"][number]["grupo"], series: number, extra: Partial<DiaVolume["exercicios"][number]> = {}) => ({
  id: nome,
  nome,
  grupo,
  series,
  ...extra,
});

const linha = (r: ReturnType<typeof calcularVolumeSemanal>, g: string) => r.linhas.find((l) => l.grupo === g);

describe("calcularVolumeSemanal — cenários obrigatórios", () => {
  it("treino único: conta séries válidas por grupo uma vez", () => {
    const r = calcularVolumeSemanal(
      [{ letra: "A", exercicios: [ex("Supino", "peito", 4), ex("Crucifixo", "peito", 3), ex("Tríceps corda", "triceps", 3)] }],
      { frequencia: { A: 1 } }
    );
    expect(linha(r, "peito")?.total).toBe(7);
    expect(linha(r, "triceps")?.total).toBe(3);
    expect(r.sessoesSemana).toBe(1);
    expect(r.subtotais.superiores).toBe(10);
  });

  it("ABC 3x: cada letra uma vez", () => {
    const dias: DiaVolume[] = [
      { letra: "A", exercicios: [ex("Supino", "peito", 8)] },
      { letra: "B", exercicios: [ex("Remada", "costas", 8)] },
      { letra: "C", exercicios: [ex("Agachamento", "quadriceps", 6), ex("Hip thrust", "gluteo", 6)] },
    ];
    const r = calcularVolumeSemanal(dias, { frequencia: { A: 1, B: 1, C: 1 } });
    expect(linha(r, "peito")?.total).toBe(8);
    expect(linha(r, "quadriceps")?.total).toBe(6);
    expect(r.subtotais.inferiores).toBe(12);
    expect(r.sessoesSemana).toBe(3);
  });

  it("ABC 5x (A/B repetidos): multiplica pela frequência sem dupla contagem", () => {
    const dias: DiaVolume[] = [
      { letra: "A", exercicios: [ex("Supino", "peito", 8)] },
      { letra: "B", exercicios: [ex("Remada", "costas", 8)] },
      { letra: "C", exercicios: [ex("Agachamento", "quadriceps", 6)] },
    ];
    const r = calcularVolumeSemanal(dias, { frequencia: { A: 2, B: 2, C: 1 } });
    expect(linha(r, "peito")?.total).toBe(16);
    expect(linha(r, "costas")?.total).toBe(16);
    expect(linha(r, "quadriceps")?.total).toBe(6);
    expect(linha(r, "peito")?.porDia.A).toBe(8); // por sessão continua 8
    expect(linha(r, "peito")?.frequencia).toBe(2);
    expect(r.sessoesSemana).toBe(5);
  });

  it("PPL 6x: seis dias, cada um 1x", () => {
    const dias: DiaVolume[] = [
      { letra: "A", exercicios: [ex("Supino", "peito", 6), ex("Desenvolvimento", "ombros", 3)] },
      { letra: "B", exercicios: [ex("Puxada", "costas", 6), ex("Rosca", "biceps", 3)] },
      { letra: "C", exercicios: [ex("Agachamento", "quadriceps", 5), ex("Stiff", "posteriores", 4)] },
      { letra: "D", exercicios: [ex("Supino inclinado", "peito", 6), ex("Elevação lateral", "ombros", 4)] },
      { letra: "E", exercicios: [ex("Remada", "costas", 6), ex("Rosca martelo", "biceps", 3)] },
      { letra: "F", exercicios: [ex("Leg press", "quadriceps", 5), ex("Mesa flexora", "posteriores", 4), ex("Panturrilha", "panturrilha", 4)] },
    ];
    const r = calcularVolumeSemanal(dias, { frequencia: { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1 } });
    expect(linha(r, "peito")?.total).toBe(12);
    expect(linha(r, "ombros")?.total).toBe(7);
    expect(linha(r, "quadriceps")?.total).toBe(10);
    expect(linha(r, "posteriores")?.total).toBe(8);
    expect(linha(r, "panturrilha")?.total).toBe(4);
    expect(linha(r, "peito")?.frequencia).toBe(2);
    expect(r.sessoesSemana).toBe(6);
  });

  it("Upper/Lower 4x com prioridade de glúteo: inferiores separados e metas aplicadas", () => {
    const dias: DiaVolume[] = [
      { letra: "A", nome: "Upper 1", exercicios: [ex("Supino", "peito", 4), ex("Remada", "costas", 4), ex("Elevação lateral", "ombros", 3)] },
      { letra: "B", nome: "Lower 1", exercicios: [ex("Agachamento", "quadriceps", 4), ex("Hip thrust", "gluteo", 4), ex("Mesa flexora", "posteriores", 3), ex("Panturrilha", "panturrilha", 4)] },
      { letra: "C", nome: "Upper 2", exercicios: [ex("Supino inclinado", "peito", 4), ex("Puxada", "costas", 4), ex("Rosca", "biceps", 3)] },
      { letra: "D", nome: "Lower 2", exercicios: [ex("Leg press", "quadriceps", 3), ex("Elevação pélvica", "gluteo", 4), ex("Abdutora", "gluteo", 3), ex("Stiff", "posteriores", 3)] },
    ];
    const r = calcularVolumeSemanal(dias, {
      frequencia: { A: 1, B: 1, C: 1, D: 1 },
      metas: { gluteo: { min: 12, max: 18 }, quadriceps: { min: 8, max: 12 }, peito: { min: 10, max: 16 } },
    });
    expect(linha(r, "quadriceps")?.total).toBe(7);
    expect(linha(r, "posteriores")?.total).toBe(6);
    expect(linha(r, "gluteo")?.total).toBe(11);
    expect(linha(r, "panturrilha")?.total).toBe(4);
    expect(linha(r, "gluteo")?.status).toBe("abaixo");
    expect(linha(r, "gluteo")?.diferenca).toBe(-1);
    expect(linha(r, "quadriceps")?.status).toBe("abaixo");
    expect(linha(r, "peito")?.status).toBe("abaixo");
    expect(linha(r, "costas")?.status).toBe("sem_meta");
    expect(r.subtotais.inferiores).toBe(28);
    // "Inferiores" é só soma, não existe linha "pernas" fictícia
    expect(linha(r, "pernas")).toBeUndefined();
  });

  it("treino sem grupo: vai para 'nao_classificado' e nunca desaparece", () => {
    const r = calcularVolumeSemanal(
      [{ letra: "A", exercicios: [ex("Exercício misterioso", "nao_classificado", 3, { confianca: "baixa" }), ex("Outro qualquer", "outro", 2)] }],
      { frequencia: { A: 1 } }
    );
    expect(linha(r, "nao_classificado")?.total).toBe(5);
    expect(linha(r, "nao_classificado")?.exerciciosRevisar).toBeGreaterThanOrEqual(1);
    expect(r.subtotais.total).toBe(5);
  });

  it("exercício composto: direto no principal; secundário só em camada separada", () => {
    const dias: DiaVolume[] = [
      { letra: "A", exercicios: [ex("Supino", "peito", 4, { secundarios: ["triceps", "ombro_anterior"] })] },
    ];
    const sem = calcularVolumeSemanal(dias, { frequencia: { A: 1 } });
    expect(linha(sem, "peito")?.total).toBe(4);
    expect(linha(sem, "triceps")).toBeUndefined();

    const com = calcularVolumeSemanal(dias, { frequencia: { A: 1 }, incluirSecundario: true, fatorSecundario: 0.5 });
    expect(linha(com, "peito")?.total).toBe(4);
    expect(linha(com, "triceps")?.total).toBe(0); // não soma no total
    expect(linha(com, "triceps")?.secundario).toBe(2);
    expect(linha(com, "ombros")?.secundario).toBe(2); // ombro_anterior agrupado em ombros
    expect(com.subtotais.total).toBe(4); // sem dupla contagem
    expect(com.avisos.some((a) => a.includes("comparação com a meta"))).toBe(true);
  });

  it("com o secundário ligado, a meta é comparada com direto + secundário", () => {
    const dias: DiaVolume[] = [
      { letra: "A", exercicios: [ex("Supino", "peito", 4, { secundarios: ["triceps"] }), ex("Tríceps corda", "triceps", 3)] },
    ];
    const metas = { triceps: { min: 4, max: 6 } };
    const so = calcularVolumeSemanal(dias, { frequencia: { A: 1 }, metas });
    expect(linha(so, "triceps")).toMatchObject({ total: 3, status: "abaixo", diferenca: -1 });
    const com = calcularVolumeSemanal(dias, { frequencia: { A: 1 }, metas, incluirSecundario: true, fatorSecundario: 0.5 });
    expect(linha(com, "triceps")).toMatchObject({ total: 3, secundario: 2, ponderado: 5, status: "na_meta" });
  });

  it("séries de aquecimento não contam", () => {
    const r = calcularVolumeSemanal(
      [{ letra: "A", exercicios: [ex("Agachamento", "quadriceps", 5, { seriesAquecimento: 2 })] }],
      { frequencia: { A: 1 } }
    );
    expect(linha(r, "quadriceps")?.total).toBe(3);
    expect(r.avisos.some((a) => a.includes("aquecimento"))).toBe(true);
    expect(seriesValidas({ id: "x", nome: "x", grupo: "peito", series: 2, seriesAquecimento: 5 })).toBe(0);
  });

  it("pirâmide: cada série prescrita conta 1", () => {
    const r = calcularVolumeSemanal(
      [{ letra: "A", exercicios: [ex("Supino pirâmide", "peito", 4, { tecnica: "piramide" })] }],
      { frequencia: { A: 1 } }
    );
    expect(linha(r, "peito")?.total).toBe(4);
  });

  it("rest-pause e drop set: regra clássica = 1 por série; moderada soma drops/minis, com aviso", () => {
    const dias: DiaVolume[] = [{ letra: "A", exercicios: [ex("Rosca drop", "biceps", 3, { tecnica: "dropset" }), ex("Tríceps rest-pause", "triceps", 2, { tecnica: "rest_pause" })] }];
    const classica = calcularVolumeSemanal(dias, { frequencia: { A: 1 }, regraTecnicas: "classica" });
    expect(linha(classica, "biceps")?.total).toBe(3);
    expect(linha(classica, "triceps")?.total).toBe(2);
    const r = calcularVolumeSemanal(dias, { frequencia: { A: 1 } });
    expect(linha(r, "biceps")?.total).toBe(3.5); // 1 drop assumido na última série = +0,5
    expect(linha(r, "triceps")?.total).toBe(3); // 2 minis assumidas = +1
    expect(r.avisos.some((a) => a.toLowerCase().includes("drop"))).toBe(true);
  });

  it("alteração de calendário: ABC 3x → ABCAB 5x recalcula", () => {
    const dias: DiaVolume[] = [
      { letra: "A", exercicios: [ex("Supino", "peito", 6)] },
      { letra: "B", exercicios: [ex("Remada", "costas", 6)] },
      { letra: "C", exercicios: [ex("Agachamento", "quadriceps", 6)] },
    ];
    const f3 = frequenciaDoCalendario({ modo: "fixa", dias: [{ dia: 1, letra: "A" }, { dia: 3, letra: "B" }, { dia: 5, letra: "C" }] });
    const f5 = frequenciaDoCalendario({ modo: "fixa", dias: [{ dia: 1, letra: "A" }, { dia: 2, letra: "B" }, { dia: 3, letra: "C" }, { dia: 4, letra: "A" }, { dia: 5, letra: "B" }, { dia: 0, letra: null }] });
    expect(f3).toEqual({ A: 1, B: 1, C: 1 });
    expect(f5).toEqual({ A: 2, B: 2, C: 1 });
    expect(linha(calcularVolumeSemanal(dias, { frequencia: f3 }), "peito")?.total).toBe(6);
    expect(linha(calcularVolumeSemanal(dias, { frequencia: f5 }), "peito")?.total).toBe(12);
    expect(linha(calcularVolumeSemanal(dias, { frequencia: f5 }), "quadriceps")?.total).toBe(6);
  });

  it("ciclo rotativo ABC com 5 dias/semana: média semanal e microciclo", () => {
    const cal = { modo: "rotativo" as const, sequencia: ["A", "B", "C"], diasPorSemana: 5 };
    const f = frequenciaDoCalendario(cal);
    expect(f.A).toBeCloseTo(1.67, 1);
    const micro = frequenciaPorMicrociclo(cal);
    expect(micro.frequencia).toEqual({ A: 1, B: 1, C: 1 });
    expect(micro.diasCiclo).toBeCloseTo(4.2, 1);
  });

  it("dia desativado não conta e frequência zero zera o dia", () => {
    const dias: DiaVolume[] = [
      { letra: "A", exercicios: [ex("Supino", "peito", 6)] },
      { letra: "B", ativo: false, exercicios: [ex("Remada", "costas", 6)] },
    ];
    const r = calcularVolumeSemanal(dias, { frequencia: { A: 1, B: 1 } });
    expect(linha(r, "costas")?.total ?? 0).toBe(0);
    expect(r.sessoesSemana).toBe(1);
    const r2 = calcularVolumeSemanal(dias, { frequencia: { A: 0 } });
    expect(linha(r2, "peito")?.total).toBe(0);
  });

  it("valores negativos, nulos e inválidos são tratados como zero", () => {
    const r = calcularVolumeSemanal(
      [
        {
          letra: "A",
          exercicios: [
            ex("Supino", "peito", -3),
            ex("Remada", "costas", null as unknown as number),
            ex("Rosca", "biceps", Number.NaN),
            ex("Agachamento", "quadriceps", 4, { seriesAquecimento: -2 }),
            ex("Cardio", "cardio", 1),
          ],
        },
      ],
      { frequencia: { A: -1 as unknown as number } }
    );
    expect(r.subtotais.total).toBe(0);
    const r2 = calcularVolumeSemanal(
      [{ letra: "A", exercicios: [ex("Agachamento", "quadriceps", 4, { seriesAquecimento: -2 })] }],
      { frequencia: { A: 1 } }
    );
    expect(linha(r2, "quadriceps")?.total).toBe(4);
    expect(linha(r2, "cardio")).toBeUndefined();
  });

  it("meta definida sem séries aparece como abaixo da meta", () => {
    const r = calcularVolumeSemanal([{ letra: "A", exercicios: [ex("Supino", "peito", 4)] }], {
      frequencia: { A: 1 },
      metas: { gluteo: { min: 10, max: 16 } },
    });
    expect(linha(r, "gluteo")?.status).toBe("abaixo");
    expect(linha(r, "gluteo")?.total).toBe(0);
    expect(linha(r, "gluteo")?.diferenca).toBe(-10);
  });

  it("superset: cada exercício soma só no próprio grupo", () => {
    const r = calcularVolumeSemanal(
      [{ letra: "A", exercicios: [ex("Supino", "peito", 3, { tecnica: "superset" }), ex("Remada", "costas", 3, { tecnica: "superset" })] }],
      { frequencia: { A: 1 } }
    );
    expect(linha(r, "peito")?.total).toBe(3);
    expect(linha(r, "costas")?.total).toBe(3);
    expect(r.subtotais.total).toBe(6);
  });

  it("legado 'pernas' permanece visível como 'a classificar'", () => {
    const r = calcularVolumeSemanal([{ letra: "A", exercicios: [ex("Leg antigo", "pernas", 4, { confianca: "media" })] }], { frequencia: { A: 1 } });
    expect(linha(r, "pernas")?.total).toBe(4);
    expect(linha(r, "pernas")?.label).toContain("classificar");
    expect(r.subtotais.inferiores).toBe(4);
  });
});

describe("programado vs realizado", () => {
  it("compara séries válidas por grupo e calcula aderência", () => {
    const prog = calcularVolumeSemanal([{ letra: "A", exercicios: [ex("Supino", "peito", 4), ex("Rosca", "biceps", 2)] }], { frequencia: { A: 2 } });
    const real = volumeRealizadoPorGrupo([
      { grupo: "peito" }, { grupo: "peito" }, { grupo: "peito", tipo: "valida" }, { grupo: "peito", tipo: "aquecimento" },
      { grupo: "gluteo" },
    ]);
    const cmp = compararProgramadoRealizado(prog, real);
    expect(cmp.find((c) => c.grupo === "peito")).toMatchObject({ programado: 8, realizado: 3, aderencia: 38 });
    expect(cmp.find((c) => c.grupo === "biceps")).toMatchObject({ programado: 4, realizado: 0, aderencia: 0 });
    expect(cmp.find((c) => c.grupo === "gluteo")).toMatchObject({ programado: 0, realizado: 1, aderencia: null });
  });
});

describe("resolução de grupo — persistência da correção manual", () => {
  it("heurística classifica com confiança média/baixa e pede revisão", () => {
    expect(detectarGrupo("Cadeira extensora")).toMatchObject({ grupo: "quadriceps", revisar: true });
    expect(detectarGrupo("Mesa flexora").grupo).toBe("posteriores");
    expect(detectarGrupo("Elevação pélvica").grupo).toBe("gluteo");
    expect(detectarGrupo("Panturrilha sentado").grupo).toBe("panturrilha");
    expect(detectarGrupo("Zumba").grupo).toBe("nao_classificado");
    expect(detectarGrupo("").grupo).toBe("nao_classificado");
    expect(detectarGrupo("Supino reto").confianca).not.toBe("alta");
  });

  it("correção salva pelo treinador vence biblioteca e heurística", () => {
    const biblioteca = montarLookupBiblioteca([{ nome: "Hack machine", grupo_muscular: "quadriceps", grupos_secundarios: ["gluteo"] }]);
    const correcoes = new Map([["hack machine", { grupo: "gluteo" as const, secundarios: [] }]]);
    expect(resolverGrupo({ nome: "Hack Machine" }, biblioteca, null)).toMatchObject({ grupo: "quadriceps", origem: "biblioteca", confianca: "alta" });
    expect(resolverGrupo({ nome: "Hack Machine" }, biblioteca, correcoes)).toMatchObject({ grupo: "gluteo", origem: "correcao" });
    // override gravado no exercício vence tudo
    expect(resolverGrupo({ nome: "Hack Machine", grupo_muscular: "posteriores", grupo_origem: "manual" }, biblioteca, correcoes).grupo).toBe("posteriores");
    // override heurístico persistido ainda pede revisão
    expect(resolverGrupo({ nome: "Coisa estranha", grupo_muscular: "peito", grupo_origem: "heuristica" })).toMatchObject({ grupo: "peito", revisar: true });
  });

  it("biblioteca legada com 'pernas' sinaliza revisão", () => {
    const biblioteca = montarLookupBiblioteca([{ nome: "Leg press", grupo_muscular: "pernas" }]);
    expect(resolverGrupo({ nome: "Leg press" }, biblioteca)).toMatchObject({ grupo: "pernas", revisar: true });
  });
});

describe("volume ponderado com pesos da biblioteca", () => {
  const dia = (exs: Parameters<typeof calcularVolumeSemanal>[0][number]["exercicios"]) => [{ letra: "A", exercicios: exs }];
  it("usa o peso de cada exercício, separa deltoides e não mistura ponderado com o total direto", () => {
    const r = calcularVolumeSemanal(
      dia([
        { id: "1", nome: "Supino reto com barra", grupo: "peito", secundarios: ["triceps", "ombro_anterior"], pesosSecundarios: { triceps: 0.5, ombro_anterior: 0.5 }, series: 4, seriesAquecimento: 1 },
        { id: "2", nome: "Elevação lateral", grupo: "ombro_lateral", secundarios: ["trapezio"], pesosSecundarios: { trapezio: 0.25 }, series: 4 },
        { id: "3", nome: "Face pull", grupo: "ombro_posterior", secundarios: [], series: 3 },
      ]),
      { frequencia: { A: 2 }, incluirSecundario: true, agruparOmbros: false }
    );
    const l = (g: string) => r.linhas.find((x) => x.grupo === g)!;
    expect(l("peito").total).toBe(6); // (4 − 1 aquecimento) × 2
    expect(l("triceps").total).toBe(0);
    expect(l("triceps").secundario).toBe(3); // 3 × 0,5 × 2
    expect(l("triceps").ponderado).toBe(3);
    expect(l("ombro_anterior").secundario).toBe(3);
    expect(l("ombro_lateral").total).toBe(8);
    expect(l("ombro_posterior").total).toBe(6);
    expect(l("trapezio").secundario).toBe(2); // 4 × 0,25 × 2
    expect(r.subtotais.total).toBe(20); // só séries diretas
    expect(r.avisos.join(" ")).toMatch(/pesos de cada exercício/);
  });

  it("sem peso cadastrado ou com pesos desligados, usa o fator único configurável", () => {
    const exs = [{ id: "1", nome: "Remada", grupo: "costas" as const, secundarios: ["biceps" as const], pesosSecundarios: { biceps: 0.5 }, series: 4 }];
    const r = calcularVolumeSemanal(dia(exs), { frequencia: { A: 1 }, incluirSecundario: true, usarPesosBiblioteca: false, fatorSecundario: 0.25 });
    expect(r.linhas.find((x) => x.grupo === "biceps")!.secundario).toBe(1);
  });

  it("avisa quando há meta de Ombros no total e os deltoides estão separados", () => {
    const r = calcularVolumeSemanal(dia([{ id: "1", nome: "Elevação lateral", grupo: "ombro_lateral", series: 3 }]), {
      frequencia: { A: 1 },
      metas: { ombros: { min: 8, max: 12 } },
      agruparOmbros: false,
    });
    expect(r.avisos.join(" ")).toMatch(/deltoides estão separados/);
  });
});
