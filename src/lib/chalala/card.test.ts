import { describe, expect, it } from "vitest";
import { ajustarTexto, configPadrao, destaqueRecorde, enquadrarFoto, evolucaoParaCard, FORMATOS, layoutCard, metricasDisponiveis, modelosDisponiveis, nomeArquivo, type DadosCard, type Op, type OpTexto, type Medir } from "./card";

// Medição aproximada (largura média de glifo ~0,6 × tamanho; negrito um pouco maior).
const medir: Medir = (t, tam, peso) => [...t].length * tam * (peso >= 700 ? 0.62 : 0.55);
const textos = (ops: Op[]) => ops.filter((o): o is OpTexto => o.t === "texto");
const tudo = (ops: Op[]) => textos(ops).map((o) => o.linhas.join(" ")).join(" | ");

const dados: DadosCard = { nomeTreino: "Treino A — Peito e tríceps", data: "2026-10-20", duracaoMin: 52, exercicios: 7, series: 24, meta: 3, feitosSemana: 3, metaCumprida: true };

function dentroDosLimites(ops: Op[], w: number, h: number) {
  for (const o of textos(ops)) {
    for (const l of o.linhas) expect(medir(l, o.tamanho, o.peso)).toBeLessThanOrEqual(o.maxLargura + 0.5);
    expect(o.y).toBeGreaterThanOrEqual(0);
    expect(o.y + o.alturaLinha * o.linhas.length).toBeLessThanOrEqual(h);
    expect(o.x).toBeLessThanOrEqual(w);
  }
}

describe("formatos de exportação", () => {
  it("dimensões exatas 9:16, 4:5 e 1:1", () => {
    expect(FORMATOS.stories).toMatchObject({ w: 1080, h: 1920 });
    expect(FORMATOS.feed).toMatchObject({ w: 1080, h: 1350 });
    expect(FORMATOS.quadrado).toMatchObject({ w: 1080, h: 1080 });
  });
  it.each(["stories", "feed", "quadrado"] as const)("modelo A em %s cabe na arte", (formato) => {
    const cfg = { ...configPadrao("A", dados, "Aline"), formato };
    const r = layoutCard(cfg, dados, medir);
    expect([r.w, r.h]).toEqual([FORMATOS[formato].w, FORMATOS[formato].h]);
    dentroDosLimites(r.ops, r.w, r.h);
    expect(tudo(r.ops)).toContain("TREINO PAGO!");
    expect(tudo(r.ops)).toContain("52 min");
    expect(tudo(r.ops)).toContain("@montinho_personal");
  });
});

describe("modelos sustentados pelos dados", () => {
  it("B (meta concluída) só quando a meta foi de fato atingida", () => {
    expect(modelosDisponiveis(dados)).toContain("B");
    expect(modelosDisponiveis({ ...dados, feitosSemana: 2, metaCumprida: false })).not.toContain("B");
    expect(modelosDisponiveis({ ...dados, feitosSemana: 2, metaCumprida: true })).not.toContain("B");
  });
  it("C só com recorde ou conquista; D só com retomada identificada", () => {
    expect(modelosDisponiveis(dados)).not.toContain("C");
    expect(modelosDisponiveis(dados)).not.toContain("D");
    expect(modelosDisponiveis({ ...dados, retomada: true })).toContain("D");
    expect(modelosDisponiveis({ ...dados, recordes: [{ exercicio: "Supino", tipo: "reps", antes: 10, agora: 12, carga: 20 }] })).toContain("C");
  });
  it("B mostra a meta real do aluno (3/3) e barra cheia", () => {
    const r = layoutCard(configPadrao("B", dados, ""), dados, medir);
    expect(tudo(r.ops)).toContain("3/3");
    expect(tudo(r.ops)).toContain("META SEMANAL CONCLUÍDA");
    expect(r.ops.find((o) => o.t === "barra")).toMatchObject({ progresso: 1 });
  });
  it("D não expõe há quantos dias o aluno estava afastado", () => {
    const r = layoutCard(configPadrao("D", { ...dados, retomada: true }, ""), { ...dados, retomada: true }, medir);
    expect(tudo(r.ops)).toContain("EU VOLTEI.");
    expect(tudo(r.ops)).not.toMatch(/dias/);
  });
  it("C com recorde de repetições", () => {
    expect(destaqueRecorde({ exercicio: "Supino", tipo: "reps", antes: 10, agora: 12, carga: 20 })).toEqual({ grande: "+2 repetições", detalhe: "Supino · 20 kg" });
    expect(destaqueRecorde({ exercicio: "Agachamento", tipo: "carga", antes: 100, agora: 102.5 }).grande).toBe("+2,5 kg");
  });
});

describe("personalização e privacidade", () => {
  it("nome só aparece se o aluno ativar; métricas desligadas somem", () => {
    const cfg = configPadrao("A", dados, "Aline");
    expect(tudo(layoutCard(cfg, dados, medir).ops)).not.toContain("Aline");
    const r = layoutCard({ ...cfg, mostrarNome: true, metricas: { ...cfg.metricas, duracao: false } }, dados, medir);
    expect(tudo(r.ops)).toContain("Aline");
    expect(tudo(r.ops)).not.toContain("52 min");
  });
  it("métrica sem dado não vira opção (nada inventado)", () => {
    expect(metricasDisponiveis("A", { ...dados, duracaoMin: null })).not.toContain("duracao");
  });
  it("nomes longos, acentos e números grandes cabem (quebra/encolhe/reticências)", () => {
    const longo = "Maria da Conceição Albuquerque de Assunção Vasconcellos Brandão";
    const d2 = { ...dados, nomeTreino: "Treino especial de membros inferiores com ênfase em glúteos e posteriores — versão de três dias", series: 123456 };
    const r = layoutCard({ ...configPadrao("A", d2, longo), mostrarNome: true }, d2, medir);
    dentroDosLimites(r.ops, r.w, r.h);
    expect(tudo(r.ops)).toMatch(/Conceição/);
    const a = ajustarTexto("Pneumoultramicroscopicossilicovulcanoconiótico", 120, 30, 400, 1, 800, medir);
    expect(a.tamanho).toBe(30);
    expect(a.linhas[0].endsWith("…")).toBe(true);
  });
  it("fundo transparente não pinta fundo; texto ganha sombra", () => {
    const r = layoutCard({ ...configPadrao("A", dados, ""), fundo: "transparente" }, dados, medir);
    expect(r.ops[0]).toMatchObject({ t: "fundo", tipo: "transparente", gradiente: null });
    expect(textos(r.ops).every((o) => o.sombra)).toBe(true);
  });
  it("texto alternativo descreve o card para leitores de tela", () => {
    expect(layoutCard(configPadrao("A", dados, ""), dados, medir).textoAlternativo).toMatch(/^Card Treino pago: CHALALÁ!/);
  });
  it("nome de arquivo sem acentos", () => {
    expect(nomeArquivo(configPadrao("B", dados, ""), dados)).toBe("chalala-missao-cumprida-stories-2026-10-20.png");
  });
});

describe("foto", () => {
  it("enquadramento cover sem distorção e respeitando limites", () => {
    const e = enquadrarFoto({ w: 4000, h: 3000 }, { w: 1080, h: 1920 }, { x: 0, y: 0, zoom: 1, escurecer: 0.4 });
    expect(e.sh).toBeCloseTo(3000);
    expect(e.sw / e.sh).toBeCloseTo(1080 / 1920);
    const dir = enquadrarFoto({ w: 4000, h: 3000 }, { w: 1080, h: 1920 }, { x: 5, y: 0, zoom: 1, escurecer: 0 });
    expect(dir.sx + dir.sw).toBeCloseTo(4000);
  });
});

describe("mensal e reconhecimento", () => {
  it("mensal permite esconder todos os números (só mensagem)", () => {
    const d: DadosCard = { mensal: { rotuloPeriodo: "30 dias", treinos: 12, aderenciaPct: 83 } };
    const cfg = { ...configPadrao("mensal", d, ""), metricas: {} };
    const t = tudo(layoutCard(cfg, d, medir).ops);
    expect(t).toContain("30 DIAS");
    expect(t).not.toMatch(/83%|12/);
  });
  it("reconhecimento identifica a mensagem como escrita pelo personal", () => {
    const d: DadosCard = { reconhecimento: { mensagem: "Você está conseguindo manter sua rotina, mesmo com os desafios do dia a dia. Essa constância merece reconhecimento!", autor: "Montinho" } };
    const r = layoutCard(configPadrao("reconhecimento", d, ""), d, medir);
    expect(tudo(r.ops)).toContain("Mensagem escrita pelo seu personal");
    dentroDosLimites(r.ops, r.w, r.h);
  });
});

describe("evolução de um treino para o outro no card", () => {
  const rel = (volumePct: number | null, melhorou = 0, comparaveis = 0, recordes: Array<{ exercicio: string; carga: number }> = []) => ({ anterior: volumePct == null ? null : { volumePct }, exercicios: { melhorou, comparaveis }, recordesVida: recordes });
  it("só o que melhorou, no máximo 2 linhas", () => {
    expect(evolucaoParaCard(rel(12, 3, 5), "A")).toEqual(["+12% de carga total vs o último treino A", "3 de 5 exercícios evoluíram desde a última vez"]);
    expect(evolucaoParaCard(rel(8, 2, 4, [{ exercicio: "Supino reto", carga: 42.5 }]), "B")).toEqual(["+8% de carga total vs o último treino B", "Recorde: Supino reto com 42,5 kg"]);
  });
  it("caiu, igual ou comparação estranha: não aparece", () => {
    expect(evolucaoParaCard(rel(-5, 0, 4))).toEqual([]);
    expect(evolucaoParaCard(rel(250, 0, 0))).toEqual([]);
    expect(evolucaoParaCard(null)).toEqual([]);
  });
  it("entra no modelo A como opção ligada", () => {
    const d = { nomeTreino: "Treino A", series: 10, evolucaoTreino: ["+12% de carga total vs o último treino A"] };
    expect(metricasDisponiveis("A", d)).toContain("evolucao");
    expect(configPadrao("A", d, "").metricas.evolucao).toBe(true);
  });
});
