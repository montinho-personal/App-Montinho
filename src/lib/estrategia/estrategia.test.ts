import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { cadastroDoArquivoStrategy, estrategiaValida, grupoDoRotulo, lerArquivoStrategy, lerEstrategia, telefoneDoWhatsapp } from "./ler";
import { diasDaEstrategia, modeloDaDivisao } from "./divisao";
import { planoDaEstrategia, prioridadesEmGrupos } from "./plano";
import { estrategiaSchema, salvarPlanoSchema } from "@/lib/validacao/schemas";

// Relatório real do Montinho Strategy, com nomes trocados (dados fictícios).
const TEXTO = fs.readFileSync(path.join(__dirname, "fixtures/relatorio-exemplo.txt"), "utf8");
const e = lerEstrategia(TEXTO);

describe("leitura do relatório do Montinho Strategy", () => {
  it("diagnóstico", () => {
    expect(e).toMatchObject({ aluno: "Fulano Teste", titulo: "Operação Teste", data: "2026-10-07", objetivo: "Recomposição corporal", experiencia: "Intermediário", diasPorSemana: 4, minutosPorTreino: 60 });
    expect(e.prioridades).toEqual(["Costas", "Peito", "Ombros", "Quadríceps", "Posterior de coxa"]);
    expect(e.objetivosSecundarios).toBe("reduzir gordura e mobilidade e flexibilidade");
    expect(estrategiaValida(e)).toBe(true);
  });
  it("estratégia: divisão, intensidade, volume (98 séries) e fases", () => {
    expect(e.divisao).toBe("Push/Pull/Legs/Superiores");
    expect(e.intensidade).toBe("Pirâmide crescente");
    expect(e.adaptacoes).toMatch(/^Iremos trabalha os treinos de pernas apenas com máquinas/);
    expect(e.volume.map((v) => [v.grupo, v.series])).toEqual([["peito", 16], ["costas", 16], ["biceps", 12], ["triceps", 8], ["abdomen", 8], ["posteriores", 8], ["ombro_anterior", 7], ["ombro_lateral", 7], ["ombro_posterior", 4], ["quadriceps", 4], ["adutores", 4], ["panturrilha", 4]]);
    expect(e.volume.reduce((a, v) => a + v.series, 0)).toBe(e.volumeTotal);
    expect(e.fases).toEqual([{ numero: 1, nome: "Adaptação", semanas: 4 }, { numero: 2, nome: "Intensificação", semanas: 4 }, { numero: 3, nome: "Consolidação", semanas: 4 }]);
  });
  it("evolução, acompanhamento e textos", () => {
    expect(e.preparacao).toEqual(["Aquecimento", "Core", "Mobilidade", "Alongamentos"]);
    expect(e.progressao).toHaveLength(5);
    expect(e.checkinSemanal).toEqual(["Sono", "Dor", "Execução", "Cargas", "Recuperação"]);
    expect(e.pontosFortes).toHaveLength(3);
    expect(e.pontosAtencao).toHaveLength(1);
    expect(e.frase).toBe("Constância inteligente: treinar forte, respeitando o seu corpo");
    expect(e.aerobico).toBe("4x ou mais/semana, após a musculação e em dias separados");
    expect(e.encerramento).toMatch(/^Sei que a perna/);
  });
  it("texto que não é relatório → nada inventado", () => {
    const x = lerEstrategia("Um PDF qualquer\nsem nada a ver");
    expect(estrategiaValida(x)).toBe(false);
    expect(x.volume).toEqual([]);
    expect(planoDaEstrategia(x)).toBeNull();
  });
});

describe("dias da semana por músculo", () => {
  it("Push/Pull/Legs/Superiores: séries repartidas sem perder nenhuma", () => {
    const dias = diasDaEstrategia(e);
    expect(dias.map((d) => d.letra)).toEqual(["A", "B", "C", "D"]);
    const total = dias.flatMap((d) => d.grupos).reduce((a, g) => a + g.series, 0);
    expect(total).toBe(98);
    const g = (l: string) => Object.fromEntries(dias.find((d) => d.letra === l)!.grupos.map((x) => [x.grupo, x.series]));
    expect(g("A")).toMatchObject({ peito: 8, triceps: 4, ombro_anterior: 4, ombro_lateral: 4, abdomen: 2 });
    expect(g("B")).toMatchObject({ costas: 8, biceps: 6, ombro_posterior: 2 });
    expect(g("C")).toMatchObject({ posteriores: 8, quadriceps: 4, adutores: 4, panturrilha: 4 });
    expect(g("D")).toMatchObject({ peito: 8, costas: 8, biceps: 6, triceps: 4, ombro_anterior: 3, ombro_lateral: 3, ombro_posterior: 2 });
    expect(g("C").peito).toBeUndefined();
  });
  it("5 dias com Legs e Costas repetidos: volume dividido entre os dias do grupo", () => {
    const dias = diasDaEstrategia({ divisao: "Push/Pull/Legs/Costas/Legs", diasPorSemana: 7, volume: [{ rotulo: "Dorsais", grupo: "costas", series: 20 }, { rotulo: "Quadríceps", grupo: "quadriceps", series: 12 }] });
    expect(dias.map((d) => d.letra)).toEqual(["A", "B", "C", "D", "E"]);
    const s = (l: string, g: string) => dias.find((d) => d.letra === l)!.grupos.find((x) => x.grupo === g)?.series;
    expect([s("B", "costas"), s("D", "costas")]).toEqual([10, 10]);
    expect([s("C", "quadriceps"), s("E", "quadriceps")]).toEqual([6, 6]);
  });
  it("divisões conhecidas e desconhecidas", () => {
    expect(modeloDaDivisao("Upper/Lower", 4)).toHaveLength(4);
    expect(modeloDaDivisao("Push / Pull / Legs", 3)).toHaveLength(3);
    expect(modeloDaDivisao("Full body", 3)).toHaveLength(3);
    expect(modeloDaDivisao("ABCDE do Montinho", 5)).toBeNull();
    // Divisão escrita dia a dia (ex.: 5 dias com Legs duas vezes)
    expect(modeloDaDivisao("Push/Pull/Legs/Costas/Legs", 7)?.map((d) => d.nome)).toEqual(["Push — Peito, ombros e tríceps", "Pull — Costas e bíceps", "Legs — Pernas", "Costas", "Legs — Pernas"]);
    expect(modeloDaDivisao("PPL + Superiores", 4)).toHaveLength(4);
    expect(modeloDaDivisao("Push/Pull/Legs", 6)).toHaveLength(6);
    expect(grupoDoRotulo("Posterior de coxa")).toBe("posteriores");
    // Nomes sugeridos no Strategy
    expect(["Peito", "Costas", "Ombros", "Bíceps", "Tríceps", "Quadríceps", "Posterior", "Glúteos", "Panturrilha", "Abdômen"].map(grupoDoRotulo)).toEqual(["peito", "costas", "ombros", "biceps", "triceps", "quadriceps", "posteriores", "gluteo", "panturrilha", "abdomen"]);
  });
});

describe("plano inicial", () => {
  it("passa na mesma validação do montador; dias sem exercícios, com foco e metas", () => {
    const p = planoDaEstrategia(e)!;
    expect(salvarPlanoSchema.safeParse(p).success).toBe(true);
    expect(p.programa).toMatchObject({ nome: "Operação Teste", objetivo: "Recomposição corporal", split: "Push/Pull/Legs/Superiores", duracao_min: 60, modo_semana: "rotativo" });
    expect(p.programa.metas_volume.peito).toEqual({ min: 16, max: 16 });
    expect(p.treinos.every((t) => t.exercicios.length === 0)).toBe(true);
    expect(p.treinos[0].observacoes).toBeNull(); // foco aparece só no montador
    expect(prioridadesEmGrupos(e)).toEqual(["costas", "peito", "ombros", "quadriceps", "posteriores"]);
  });
});

describe("fase atual", () => {
  it("semana dentro da fase, troca de fase e ciclo encerrado", async () => {
    const { faseAtual } = await import("./fases");
    expect(faseAtual(e.fases, "2026-10-07", "2026-10-07")).toMatchObject({ fase: { numero: 1 }, semana: 1, fimFase: "2026-11-03" });
    expect(faseAtual(e.fases, "2026-10-07", "2026-10-20")).toMatchObject({ fase: { numero: 1 }, semana: 2, proxima: { nome: "Intensificação" } });
    expect(faseAtual(e.fases, "2026-10-07", "2026-11-04")).toMatchObject({ fase: { numero: 2 }, semana: 1 });
    expect(faseAtual(e.fases, "2026-10-07", "2027-01-30")).toMatchObject({ encerrada: true, fase: { numero: 3 } });
    expect(faseAtual(e.fases, "2026-10-07", "2026-10-01")).toBeNull();
  });
});

describe("arquivo do Montinho Strategy (.montinho.json) e faixas", () => {
  const arquivo = {
    formato: "montinho-strategy",
    versaoFormato: 1,
    geradoEm: "2026-10-20T12:00:00Z",
    estrategia: { ...e, volume: [{ rotulo: "Peitoral", series: 14, max: 18 }, { rotulo: "Dorsais", series: 16, max: null }, { rotulo: "Quadríceps", series: 4, max: 6 }], restricoes: "Dores: tendão", exerciciosEvitar: "Agachamento livre", exerciciosObrigatorios: null },
  };
  it("lê o arquivo, liga rótulos aos grupos e mantém a faixa", async () => {
    const { lerArquivoStrategy } = await import("./ler");
    const x = lerArquivoStrategy(arquivo)!;
    expect(x.volume).toEqual([{ rotulo: "Peitoral", grupo: "peito", series: 14, max: 18 }, { rotulo: "Dorsais", grupo: "costas", series: 16, max: null }, { rotulo: "Quadríceps", grupo: "quadriceps", series: 4, max: 6 }]);
    expect(x.exerciciosEvitar).toBe("Agachamento livre");
    const { estrategiaSchema } = await import("@/lib/validacao/schemas");
    expect(estrategiaSchema.safeParse(x).success).toBe(true);
    expect(lerArquivoStrategy({ formato: "outro" })).toBeNull();
    expect(lerArquivoStrategy(null)).toBeNull();
  });
  it("faixa vira meta mín–máx e é repartida entre os dias", async () => {
    const { lerArquivoStrategy } = await import("./ler");
    const x = lerArquivoStrategy(arquivo)!;
    const p = planoDaEstrategia(x)!;
    expect(p.programa.metas_volume.peito).toEqual({ min: 14, max: 18 });
    expect(p.programa.metas_volume.costas).toEqual({ min: 16, max: 16 });
    const dias = diasDaEstrategia(x);
    const peito = dias.flatMap((d) => d.grupos.filter((g) => g.grupo === "peito").map((g) => [d.letra, g.series, g.max]));
    expect(peito).toEqual([["A", 7, 9], ["D", 7, 9]]);
  });
  it("PDF com faixa na tabela de volume", () => {
    const t = TEXTO.replace("Peitoral 16 16%", "Peitoral 14–18 16%").replace("Total 98 séries", "Total 96–100 séries");
    const x = lerEstrategia(t);
    expect(x.volume[0]).toEqual({ rotulo: "Peitoral", grupo: "peito", series: 14, max: 18 });
    expect(x.volumeTotal).toBe(96);
  });
});

describe("cadastro do arquivo do Strategy", () => {
  const arq = (e: Record<string, unknown>) => ({ formato: "montinho-strategy", versaoFormato: 1, estrategia: e });
  it("lê nascimento, sexo, e-mail e WhatsApp; inválido vira null", () => {
    expect(cadastroDoArquivoStrategy(arq({ dataNascimento: "1990-05-20", idade: 36, sexo: "Masculino", email: " Fulano@Teste.com ", whatsapp: "5511988887777" }))).toEqual({ dataNascimento: "1990-05-20", idade: 36, sexo: "M", email: "fulano@teste.com", whatsapp: "5511988887777" });
    expect(cadastroDoArquivoStrategy(arq({ dataNascimento: "20/05/1990", sexo: "outro", email: "sem-arroba", whatsapp: "11988887777", idade: 36 }))).toEqual({ dataNascimento: null, idade: 36, sexo: null, email: null, whatsapp: null });
    expect(cadastroDoArquivoStrategy(arq({ dataNascimento: null, idade: null, sexo: null, email: null, whatsapp: null }))).toBeNull();
    expect(cadastroDoArquivoStrategy({ formato: "outro" })).toBeNull();
  });
  it("WhatsApp no formato do cadastro e fora da estratégia salva", () => {
    expect(telefoneDoWhatsapp("5511988887777")).toBe("+55 11 98888-7777");
    expect(telefoneDoWhatsapp("551133334444")).toBe("+55 11 3333-4444");
    const lida = lerArquivoStrategy(arq({ ...e, email: "x@y.com", whatsapp: "5511988887777", dataNascimento: "1990-05-20" }))!;
    const salva = estrategiaSchema.parse(lida) as Record<string, unknown>;
    expect(salva.email).toBeUndefined();
    expect(salva.whatsapp).toBeUndefined();
    expect(salva.dataNascimento).toBeUndefined();
  });
});

describe("divisão escrita por dia da semana (arquivo da Naya, 22/10/2026)", () => {
  const divisao = "Seg: Glúteos + Quadríceps Ter: Costas + Ombros + Bíceps Qua: Posterior de Coxa + Glúteos + Abdômen Qui: Peito + Costas + Tríceps Sex: Lower completo Sáb: Músculos pequenos — Tríceps, Bíceps, Panturrilhas e Abdômen Dom: Cardio";
  it("vira 6 dias de musculação (domingo de cardio fica fora), com os músculos de cada dia", async () => {
    const { diasPorDiaDaSemana } = await import("./divisao");
    const d = diasPorDiaDaSemana(divisao)!;
    expect(d.map((x) => x.nome)).toEqual(["Glúteos + Quadríceps", "Costas + Ombros + Bíceps", "Posterior de Coxa + Glúteos + Abdômen", "Peito + Costas + Tríceps", "Lower completo", "Músculos pequenos — Tríceps, Bíceps, Panturrilhas e Abdômen"]);
    expect(d[0].grupos).toEqual(expect.arrayContaining(["gluteo", "quadriceps"]));
    expect(d[4].grupos).toEqual(expect.arrayContaining(["quadriceps", "posteriores", "gluteo"]));
    expect(d[5].grupos).toEqual(expect.arrayContaining(["triceps", "biceps", "panturrilha", "abdomen"]));
  });

  it("o arquivo passa na validação e o plano inicial tem 6 treinos com meta de 6 por semana", async () => {
    const { lerArquivoStrategy } = await import("./ler");
    const { estrategiaSchema } = await import("@/lib/validacao/schemas");
    const { planoDaEstrategia } = await import("./plano");
    const arq = { formato: "montinho-strategy", versaoFormato: 1, estrategia: { versao: 1, aluno: "Naya", titulo: "Montinho Training Strategy", data: "2026-10-22", objetivo: "Emagrecimento", objetivosSecundarios: null, experiencia: "Intermediário", diasPorSemana: 7, minutosPorTreino: null, prioridades: ["Glúteos"], comoPriorizar: [], divisao, justificativaDivisao: null, adaptacoes: null, intensidade: "Pirâmide crescente", volume: [], volumeTotal: null, frequencia: null, fases: [], preparacao: [], preparacaoMotivo: null, progressao: [], checkinSemanal: [], pontosFortes: [], pontosAtencao: [], frase: null, logicaExercicios: [], aerobico: null, encerramento: null } };
    const lida = lerArquivoStrategy(arq)!;
    expect(estrategiaSchema.safeParse(lida).success).toBe(true);
    const plano = planoDaEstrategia(lida)!;
    expect(plano.treinos.map((t) => t.letra)).toEqual(["A", "B", "C", "D", "E", "F"]);
    expect((plano.programa.calendario as { diasPorSemana: number }).diasPorSemana).toBe(6);
  });
});
