import { describe, expect, it } from "vitest";
import { cenarios, conversao, destaqueNaHome, etapaDe, ETAPAS, frasesDaObra, kgDaSessao, materiaisDesbloqueados, pctDaObra, PRIMEIRA_OBRA, previsaoDaObra, proximoMarco, ritmoRecente, textoInauguracao, textoMateriais, treinoEntraNaObra, type Obra } from "./regras";

const PADRAO_VAZIO = { anilhas: null, halteres: null } as const;
const obra = (o: Partial<Obra> = {}): Obra => ({ id: "o1", ordem: 1, modelo: "bairro", nome: "Academia de Bairro", narrativa: null, area_m2: 200, materiais_t: 200, meta_kg: 6_000_000, banner_dias: 7, mostrar_contribuicoes: true, estado: "ativa", ativada_em: "2026-11-10T12:00:00Z", concluida_em: null, ...o });

describe("toneladas do treino (espelho da 0146)", () => {
  it("carga × reps, sem aquecimento; blocos somados; 600 kg fica para conferir", () => {
    const r = kgDaSessao(
      [
        { nome: "Supino máquina", series: [{ tipo: "aquecimento", carga_kg: 50, reps: 10 }, { tipo: "valida", carga_kg: 100, reps: 10 }, { tipo: "valida", carga_kg: 100, reps: 10 }, { id: "x", tipo: "valida", carga_kg: 600, reps: 5 }] },
        { nome: "Puxada", series: [{ tipo: "rest_pause", carga_kg: 50, reps: 17, blocos: [{ carga: 50, reps: 10 }, { reps: 4 }, { reps: 3 }] }] },
        { nome: "Crucifixo", series: [{ tipo: "dropset", carga_kg: 20, reps: 18, blocos: [{ carga: 20, reps: 10 }, { carga: 15, reps: 8 }] }] },
      ],
      PADRAO_VAZIO,
    );
    expect(r).toEqual({ kg: 2000 + 850 + 320, conferir: 1 });
    expect(kgDaSessao([{ nome: "Supino máquina", series: [{ id: "x", tipo: "valida", carga_kg: 600, reps: 5 }] }], PADRAO_VAZIO, new Set(["x"])).kg).toBe(3000);
  });
  it("quem anota “por lado” conta em dobro só em anilhas/halteres", () => {
    const exs = [
      { nome: "Leg press 45°", series: [{ tipo: "valida", carga_kg: 50, reps: 10 }] },
      { nome: "Rosca direta", equipamento: ["halter"], series: [{ tipo: "valida", carga_kg: 10, reps: 10 }] },
      { nome: "Rosca concentrada unilateral", equipamento: ["halter"], series: [{ tipo: "valida", carga_kg: 10, reps: 10 }] },
      { nome: "Cadeira extensora", equipamento: ["maquina"], series: [{ tipo: "valida", carga_kg: 40, reps: 10 }] },
    ];
    expect(kgDaSessao(exs, PADRAO_VAZIO).kg).toBe(500 + 100 + 200 + 400);
    expect(kgDaSessao(exs, { anilhas: "por_lado", halteres: "por_lado" }).kg).toBe(1000 + 200 + 200 + 400);
  });
  it("unilateral conta os dois lados (série anotada uma vez)", () => {
    const serie = [{ tipo: "valida", carga_kg: 10, reps: 10 }];
    expect(kgDaSessao([{ nome: "Remada unilateral com halter (serrote)", equipamento: ["halter", "banco"], series: serie }], PADRAO_VAZIO).kg).toBe(200);
    expect(kgDaSessao([{ nome: "Cadeira extensora", equipamento: ["maquina"], unilateral: true, series: serie }], PADRAO_VAZIO).kg).toBe(200);
    // 2 halteres de 10 kg (anotado um) × 10 reps em cada perna = 20 kg × 20 reps
    expect(kgDaSessao([{ nome: "Agachamento búlgaro com halteres", equipamento: ["halter"], series: serie }], { anilhas: null, halteres: "por_lado" }).kg).toBe(400);
    expect(kgDaSessao([{ nome: "Tríceps francês com halter", equipamento: ["halter"], series: serie }], PADRAO_VAZIO).kg).toBe(100);
  });
  it("materiais em kg enquanto não chega a 1 t", () => {
    expect(textoMateriais(0.4825)).toBe("482 kg");
    expect(textoMateriais(0)).toBe("0 kg");
    expect(textoMateriais(3.57)).toBe("3,5 t");
    expect(textoMateriais(116.4)).toBe("116 t");
  });
  it("só treino começado depois da ativação (e criado no servidor depois)", () => {
    const o = obra();
    expect(treinoEntraNaObra({ iniciado_em: "2026-11-10T11:59:59Z" }, o)).toBe(false);
    expect(treinoEntraNaObra({ iniciado_em: "2026-11-10T12:30:00Z", created_at: "2026-11-10T12:30:00Z" }, o)).toBe(true);
    expect(treinoEntraNaObra({ iniciado_em: "2026-11-10T12:30:00Z", created_at: "2026-11-09T12:00:00Z" }, o)).toBe(false);
    expect(treinoEntraNaObra({ iniciado_em: "2026-11-10T12:30:00Z" }, obra({ estado: "rascunho" }))).toBe(false);
  });
});

describe("etapas e progresso", () => {
  it("começa no terreno, sobe pelas etapas e só inaugura concluída", () => {
    expect(etapaDe(0).nome).toBe("Terreno");
    expect(etapaDe(9.9).n).toBe(0);
    expect(etapaDe(10).nome).toBe("Fundação");
    expect(etapaDe(56).nome).toBe("Fachada e instalações");
    expect(etapaDe(100).n).toBe(6);
    expect(etapaDe(100, true).nome).toBe("Inaugurada");
    expect(ETAPAS.map((e) => e.pct)).toEqual([0, 10, 25, 40, 55, 70, 85, 100]);
  });
  it("percentual, próximo marco, materiais e conversão (6.000 t → 30:1)", () => {
    expect(pctDaObra(1_500_000, 6_000_000)).toBe(25);
    expect(proximoMarco(1_500_000, 6_000_000)).toMatchObject({ etapa: { nome: "Paredes e cobertura" }, faltaKg: 900_000 });
    expect(proximoMarco(6_000_000, 6_000_000)).toBeNull();
    expect(materiaisDesbloqueados(3_000_000, PRIMEIRA_OBRA)).toBe(100);
    expect(conversao(PRIMEIRA_OBRA)).toBe(30);
  });
});

describe("previsão e simulador", () => {
  const agora = new Date("2026-11-24T12:00:00Z");
  it("com pouco dado não inventa: “calculando o ritmo”", () => {
    expect(previsaoDaObra({ total_kg: 100_000, meta_kg: 6_000_000, treinos: 3, ativada_em: "2026-11-20T12:00:00Z", estado: "ativa", por_dia: [] }, agora)).toEqual({ tipo: "calculando" });
  });
  it("média móvel de 14 dias", () => {
    const por_dia = Array.from({ length: 14 }, (_, i) => ({ dia: new Date(agora.getTime() - i * 86_400_000).toISOString().slice(0, 10), kg: 50_000 }));
    const p = previsaoDaObra({ total_kg: 700_000, meta_kg: 6_000_000, treinos: 80, ativada_em: "2026-11-10T12:00:00Z", estado: "ativa", por_dia }, agora);
    expect(p.tipo).toBe("data");
    if (p.tipo === "data") {
      expect(Math.round(p.kgPorSemana)).toBe(350_000);
      expect(Math.round(p.semanas * 10) / 10).toBeCloseTo(15.1, 0);
    }
  });
  it("cenários e ritmo só das semanas fechadas", () => {
    const c = cenarios(6_000_000, 400_000);
    expect(c[1].semanas).toBe(15);
    expect(ritmoRecente([{ semana: "2026-10-19", kg: 80_000 }, { semana: "2026-10-26", kg: 290_000 }, { semana: "2026-11-02", kg: 235_000 }], "2026-11-02", 2)).toBe(185_000);
  });
});

describe("destaques na Home", () => {
  it("lançamento por N dias → card compacto; inauguração por N dias", () => {
    const o = obra({ ativada_em: "2026-11-10T12:00:00Z", banner_dias: 7 });
    expect(destaqueNaHome([o], new Date("2026-11-12T12:00:00Z"))).toEqual({ lancamento: true, inauguracao: null, compacto: false });
    expect(destaqueNaHome([o], new Date("2026-11-18T12:00:00Z"))).toEqual({ lancamento: false, inauguracao: null, compacto: true });
    const pronta = obra({ id: "o0", estado: "concluida", concluida_em: "2026-11-15T12:00:00Z" });
    expect(destaqueNaHome([pronta, o], new Date("2026-11-18T12:00:00Z")).inauguracao).toEqual({ id: "o0", nome: "Academia de Bairro" });
    expect(destaqueNaHome([pronta], new Date("2026-11-25T12:00:00Z")).inauguracao).toBeNull();
  });
});

describe("textos com os números reais", () => {
  it("obra zerada, em andamento e inaugurada", () => {
    expect(frasesDaObra({ total_kg: 0, meta_kg: 6e6, participantes: 0, treinos: 0, estado: "ativa", nome: "A" })[0]).toMatch(/começou do zero/);
    expect(frasesDaObra({ total_kg: 1_500_000, meta_kg: 6e6, participantes: 12, treinos: 180, estado: "ativa", nome: "A" })).toEqual(["12 pessoas já ajudaram com 180 treinos.", "Faltam 900 t para: Paredes e cobertura."]);
    expect(textoInauguracao({ nome: "Academia de Bairro", total_kg: 6_012_000, participantes: 23, ativada_em: "2026-11-10T12:00:00Z", concluida_em: "2027-02-20T12:00:00Z" })).toBe("Depois de 102 dias, 6.012 toneladas movimentadas e 23 participantes, a Academia de Bairro foi inaugurada!");
  });
});
