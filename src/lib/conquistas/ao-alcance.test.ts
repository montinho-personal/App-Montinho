import { describe, expect, it } from "vitest";
import { calcularAderencia } from "@/lib/aderencia/calcular";
import { chamadaDaAcao, ehDeHoje, samuraiNoTreino, trofeusNoTreino, trofeusNosProximosDias, type AcoesAlcance } from "./ao-alcance";
import { vitrineDeMedalhas } from "./vitrine";
import type { FamiliaTecnica, SessaoConquista } from "./regras";

let n = 0;
const s = (dia: string, o: Partial<SessaoConquista> = {}): SessaoConquista => ({ id: `a${++n}`, iniciado_em: `${dia}T13:00:00Z`, status: "concluida", series_planejadas: 10, series_concluidas: 10, ...o });
const metas = [{ desde: "2026-01-01", meta: 3, origem: "personal" as const }];
const ganhas = (...codigos: string[]) => codigos.map((codigo) => ({ codigo, conquistado_em: "2026-10-01T13:00:00Z" }));
const dias = (...ds: string[]) => ds.map((d) => s(d));
const tres = [{ nome: "Supino", tecnica: null }, { nome: "Remada", tecnica: null }, { nome: "Agachamento", tecnica: null }];
const COMECO = ganhas("primeiro_treino", "missao_cumprida", "cada_quilo_conta", "terceiro_especial", "primeira_meta_semanal", "relatorio_mensal", "strava_conectado", "compartilhou_primeiro");

function contexto(sessoes: SessaoConquista[], conquistas: ReturnType<typeof ganhas>, hoje: string, feitas: FamiliaTecnica[] = []) {
  const aderencia = calcularAderencia({ inicio: "2026-09-28", hoje, metas, sessoes });
  return { medalhas: vitrineDeMedalhas({ conquistas, sessoes, aderencia, hoje }), aderencia, tecnicasFeitas: new Set(feitas), hoje };
}
const codigos = (xs: Array<{ codigo: string }>) => xs.map((x) => x.codigo);

describe("troféus neste treino", () => {
  it("primeiro treino: primeiro passo, missão cumprida e cada quilo conta", () => {
    const c = contexto([], [], "2026-10-20");
    const itens = trofeusNoTreino({ ...c, treino: { exercicios: tres, extra: false, reduzido: false } });
    expect(codigos(itens)).toEqual(["primeiro_treino", "missao_cumprida", "cada_quilo_conta"]);
    expect(itens[0].oQueFazer).toMatch(/metade das séries/);
  });

  it("treino nº 10 e o que fecha a meta da semana (4 semanas seguidas)", () => {
    // 3 semanas cumpridas + 2 treinos nesta semana = 11; o 10º já saiu.
    const sessoes = dias("2026-09-29", "2026-09-30", "2026-10-01", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-19", "2026-10-20");
    const c = contexto(sessoes, [...COMECO, ...ganhas("treinos_10")], "2026-10-21");
    const itens = trofeusNoTreino({ ...c, treino: { exercicios: tres, extra: false, reduzido: false } });
    expect(codigos(itens)).toEqual(["semanas_consistentes_4"]);
    expect(itens[0].oQueFazer).toMatch(/4 semanas seguidas/);
  });

  it("falta 1 treino para o 10º, mas a meta da semana ainda não fecha neste treino", () => {
    const sessoes = dias("2026-09-29", "2026-09-30", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-20");
    const c = contexto(sessoes, COMECO, "2026-10-21");
    expect(codigos(trofeusNoTreino({ ...c, treino: { exercicios: tres, extra: false, reduzido: false } }))).toEqual(["treinos_10"]);
  });

  it("técnica nova na ficha conta (isometria em prancha não)", () => {
    const c = contexto([s("2026-10-20")], COMECO, "2026-10-21", ["piramide", "biset"]);
    const itens = trofeusNoTreino({ ...c, treino: { exercicios: [{ nome: "Prancha", tecnica: "isometria" }, { nome: "Supino", tecnica: "dropset" }], extra: false, reduzido: false } });
    expect(codigos(itens)).toEqual(["tecnicas_3"]);
    expect(itens[0].oQueFazer).toMatch(/Drop-set/);
  });

  it("treino extra só mexe nos troféus de extra", () => {
    const c = contexto([], [], "2026-10-20");
    expect(codigos(trofeusNoTreino({ ...c, treino: { exercicios: tres, extra: true, reduzido: false } }))).toEqual(["fui_alem"]);
  });

  it("versão curta: fiz o necessário", () => {
    const c = contexto([s("2026-10-20")], COMECO, "2026-10-21");
    expect(codigos(trofeusNoTreino({ ...c, treino: { exercicios: tres, extra: false, reduzido: true } }))).toContain("fiz_o_necessario");
  });

  it("Samurai: só com o horário gravado na janela e a medalha em aberto", () => {
    const c = contexto([], [], "2026-10-20");
    expect(samuraiNoTreino(c.medalhas, true)?.codigo).toBe("treino_samurai");
    expect(samuraiNoTreino(c.medalhas, false)).toBeNull();
    const ganho = contexto([], ganhas("treino_samurai"), "2026-10-20");
    expect(samuraiNoTreino(ganho.medalhas, true)).toBeNull();
  });
});

describe("troféus nos próximos dias", () => {
  it("o que cabe no ritmo da meta, a meta desta semana, técnicas da ficha e os de um toque", () => {
    const sessoes = dias("2026-09-29", "2026-09-30", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-20");
    const c = contexto(sessoes, ganhas("primeiro_treino", "missao_cumprida", "cada_quilo_conta", "terceiro_especial", "primeira_meta_semanal"), "2026-10-21");
    const itens = trofeusNosProximosDias({ ...c, treinos: [{ letra: "A", exercicios: [{ nome: "Supino", tecnica: "rest_pause" }] }, { letra: "B", exercicios: [{ nome: "Remada", tecnica: "rest_pause" }] }] });
    expect(codigos(itens)).toEqual(["treinos_10", "primeira_tecnica", "relatorio_mensal", "strava_conectado", "compartilhou_primeiro", "ponto_de_partida"]);
    expect(itens[0]).toMatchObject({ quando: "No próximo treino" });
    expect(itens[1].oQueFazer).toBe("Faça Rest-pause no Treino A.");
  });

  it("meta da semana que ainda cabe até domingo vira troféu de semanas seguidas", () => {
    const sessoes = dias("2026-09-29", "2026-09-30", "2026-10-01", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-13", "2026-10-14", "2026-10-15");
    const c = contexto(sessoes, [...COMECO, ...ganhas("treinos_10")], "2026-10-23");
    const itens = trofeusNosProximosDias({ ...c, treinos: [] });
    expect(itens.find((i) => i.codigo === "semanas_consistentes_4")).toMatchObject({ quando: "Até domingo", oQueFazer: "Faça mais 3 treinos e feche a meta da semana. São 4 semanas seguidas." });
  });

  it("meta que não cabe mais nos dias que restam não entra", () => {
    const sessoes = dias("2026-09-29", "2026-09-30", "2026-10-01", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-13", "2026-10-14", "2026-10-15");
    const c = contexto(sessoes, [...COMECO, ...ganhas("treinos_10")], "2026-10-25");
    expect(codigos(trofeusNosProximosDias({ ...c, treinos: [] }))).not.toContain("semanas_consistentes_4");
  });
});

describe("lembrete do troféu mais perto (0104)", () => {
  it("prefere o que sai no próximo treino e deixa os de um toque de fora", async () => {
    const { lembreteDoAlcance } = await import("./ao-alcance");
    const r = lembreteDoAlcance([
      { codigo: "relatorio_mensal", titulo: "Olhar no espelho", selo: "📊", oQueFazer: "Abra a evolução.", quando: "Agora" },
      { codigo: "treinos_10", titulo: "Dez treinos", selo: "10", oQueFazer: "Conclua mais 2 treinos.", quando: "Em 2 treinos" },
      { codigo: "cardio_10", titulo: "Dez no Pulmão", selo: "10❤️", oQueFazer: "Faça mais 1 cardio.", quando: "No próximo cardio" },
    ]);
    expect(r?.codigo).toBe("cardio_10");
    expect(r?.titulo).toBe("🏆 Falta só 1 para o troféu “Dez no Pulmão”!");
    expect(r?.url).toBe("/aluno/cardio");
    expect(lembreteDoAlcance([{ codigo: "relatorio_mensal", titulo: "x", selo: "x", oQueFazer: "x", quando: "Agora" }])).toBeNull();
  });
});

describe("troféus de cardio perto", () => {
  it("falta 1 cardio para o Dez no Pulmão e a semana de cardio aberta", () => {
    const hoje = "2026-10-21";
    const sessoes = dias("2026-10-19");
    const aderencia = calcularAderencia({ inicio: "2026-09-28", hoje, metas, sessoes });
    const cardio = { feitos: 9, temPrescricao: true, prescricaoLonga: false, semana: { faltaSessoes: 2, faltaMin: 60, metaMinutos: false }, seguidas: 3 };
    const conquistas = ganhas("cardio_1", "cardio_2", "cardio_3", ...COMECO.map((c) => c.codigo));
    const medalhas = vitrineDeMedalhas({ conquistas, sessoes, aderencia, hoje, cardio });
    const itens = trofeusNosProximosDias({ medalhas, aderencia, hoje, tecnicasFeitas: new Set(), treinos: [], cardio });
    const dez = itens.find((i) => i.codigo === "cardio_10");
    expect(dez?.quando).toBe("No próximo cardio");
    expect(codigos(itens)).toEqual(expect.arrayContaining(["cardio_semana_ritmo", "cardio_meta_semana", "cardio_4_semanas"]));
  });
  it("sem cardio nenhum (nem prescrito): nada de cardio na lista", () => {
    const hoje = "2026-10-21";
    const c = contexto(dias("2026-10-19"), COMECO, hoje);
    const itens = trofeusNosProximosDias({ ...c, treinos: [], cardio: { feitos: 0, temPrescricao: false, prescricaoLonga: false } });
    expect(itens.some((i) => i.codigo.startsWith("cardio_"))).toBe(false);
  });
});

describe("troféus por ação (compartilhar, indicar, desafios, dia em dobro)", () => {
  const base: AcoesAlcance = { semanasDiario: 0, diarioEstaSemana: false, trofeusCompartilhados: [], jaCompartilhou: false, podeIndicar: false, musculacoesHoje: 0, cardiosHoje: 0, cardiosFeitos: 0 };
  const hoje = "2026-10-21";

  it("treinou hoje sem cardio: Combo Completo ainda hoje; indicar e desafio aparecem", () => {
    const c = contexto(dias("2026-10-21"), COMECO, hoje);
    const itens = trofeusNosProximosDias({ ...c, treinos: [], acoes: { ...base, musculacoesHoje: 1, podeIndicar: true, jaCompartilhou: true } });
    const combo = itens.find((i) => i.codigo === "combo_completo");
    expect(combo?.quando).toBe("Hoje");
    expect(ehDeHoje(combo?.quando)).toBe(true);
    expect(codigos(itens)).toEqual(expect.arrayContaining(["trouxe_amigo", "inspiracao_galera", "criador_desafios", "dose_dupla"]));
    expect(ehDeHoje(itens.find((i) => i.codigo === "criador_desafios")?.quando)).toBe(false);
  });

  it("Vitrine de Troféus só quando já tem troféus suficientes para compartilhar", () => {
    const c = contexto([], COMECO, hoje);
    const quatro = { ...base, trofeusCompartilhados: ["primeiro_treino", "missao_cumprida", "cada_quilo_conta", "terceiro_especial"] };
    expect(codigos(trofeusNosProximosDias({ ...c, treinos: [], acoes: quatro }))).toContain("vitrine_de_trofeus");
    const nenhum = contexto([], ganhas("primeiro_treino"), hoje);
    expect(codigos(trofeusNosProximosDias({ ...nenhum, treinos: [], acoes: base }))).not.toContain("vitrine_de_trofeus");
  });

  it("chamada no card: 1º compartilhamento ganha agora; depois conta para o Diário e a Vitrine", () => {
    const abertas = new Map<never, string>([["compartilhou_primeiro", "Espalhando o Chalalá"], ["diario_de_bordo", "Diário de Bordo"], ["vitrine_de_trofeus", "Vitrine de Troféus"]] as never);
    expect(chamadaDaAcao("card_treino", abertas, base)).toMatchObject({ codigo: "compartilhou_primeiro", agora: true });
    const semPrimeiro = new Map([...abertas].filter(([k]) => k !== "compartilhou_primeiro"));
    expect(chamadaDaAcao("card_treino", semPrimeiro, { ...base, semanasDiario: 3 })).toMatchObject({ codigo: "diario_de_bordo", agora: true });
    expect(chamadaDaAcao("card_treino", semPrimeiro, { ...base, semanasDiario: 1 })).toMatchObject({ codigo: "diario_de_bordo", agora: false });
    expect(chamadaDaAcao("card_medalha", semPrimeiro, { ...base, trofeusCompartilhados: ["a", "b", "c", "d"] }, "treinos_10")).toMatchObject({ codigo: "vitrine_de_trofeus", agora: true });
    // Troféu já compartilhado não conta de novo.
    expect(chamadaDaAcao("card_medalha", semPrimeiro, { ...base, trofeusCompartilhados: ["treinos_10"] }, "treinos_10")).toBeNull();
  });

  it("chamada do cardio: treinou hoje → Combo Completo; nada aberto → nada", () => {
    const abertas = new Map([["combo_completo", "Combo Completo"]] as never) as Map<never, string>;
    expect(chamadaDaAcao("cardio", abertas, { ...base, musculacoesHoje: 1 })).toMatchObject({ codigo: "combo_completo", agora: true });
    expect(chamadaDaAcao("cardio", new Map(), { ...base, musculacoesHoje: 1 })).toBeNull();
  });

  it("Combo em sequência: falta 1 dia → ainda hoje; se hoje já valeu, amanhã", () => {
    const hojeC = "2026-10-21";
    const sessoes = dias("2026-10-19", "2026-10-20");
    const aderencia = calcularAderencia({ inicio: "2026-09-28", hoje: hojeC, metas, sessoes });
    const cardio = { feitos: 2, temPrescricao: false, prescricaoLonga: false, comboSeguidos: 2 };
    const medalhas = vitrineDeMedalhas({ conquistas: COMECO, sessoes, aderencia, hoje: hojeC, cardio });
    const um = trofeusNosProximosDias({ medalhas, aderencia, hoje: hojeC, tecnicasFeitas: new Set(), treinos: [], acoes: base }).find((i) => i.codigo === "combo_3");
    expect(um?.quando).toBe("Hoje");
    const dois = trofeusNosProximosDias({ medalhas, aderencia, hoje: hojeC, tecnicasFeitas: new Set(), treinos: [], acoes: { ...base, comboHoje: true } }).find((i) => i.codigo === "combo_3");
    expect(dois?.quando).toBe("Amanhã");
  });
});
