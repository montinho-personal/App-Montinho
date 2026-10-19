import { describe, expect, it } from "vitest";
import { buscarSemelhantes, desidentificar, extrairMetadados, hashEstrutura, interpretarTexto, resumoLegivel } from "./similaridade";
import type { BibliotecaPrograma, SnapshotPrograma } from "@/lib/supabase/types-sessoes";

function snap(nome: string, dias: number, opts: Partial<SnapshotPrograma["programa"]> = {}, exercicios: string[] = ["Supino reto", "Remada baixa"]): SnapshotPrograma {
  const letras = ["A", "B", "C", "D", "E", "F"] as const;
  return {
    programa: { nome, objetivo: "hipertrofia", nivel: "intermediario", split: null, modo_semana: "fixa", frequencia: Object.fromEntries(letras.slice(0, dias).map((l) => [l, 1])), calendario: {}, metas_volume: {}, prioridades: [], equipamentos: ["barra", "halter", "maquina"], duracao_min: 60, observacoes: "Aluna Fulana, joelho ruim", ...opts },
    treinos: letras.slice(0, dias).map((letra, i) => ({
      id: `${nome}-${letra}`, letra, nome: `Treino ${letra}`, observacoes: "obs pessoal", ativo: true,
      exercicios: exercicios.map((n, j) => ({ id: `${nome}-${letra}-${j}`, ordem: j, nome: n, series: 3 + (i % 2), reps: "10", ie: 8, rir: 2, descanso_seg: 60, observacoes: "nota", grupo_muscular: j === 0 ? ("peito" as const) : ("costas" as const), grupos_secundarios: [], series_aquecimento: 0, tecnica: "normal" as const, bloco: null, unilateral: false, carga_alvo: "40kg" })),
    })),
  };
}

function item(id: string, s: SnapshotPrograma, extra: Partial<BibliotecaPrograma> = {}): BibliotecaPrograma {
  const limpo = desidentificar(s);
  const metadados = extrairMetadados(limpo);
  return { id, origem_versao_id: null, hash_estrutura: hashEstrutura(limpo), nome: s.programa.nome, resumo: resumoLegivel(metadados), metadados, estrutura: limpo, volume: null, tags: [], status: "criado", favorito: false, uso_count: 1, feedback: { util: 0, nao_util: 0, usei_adaptei: 0 }, justificativa: null, autor_id: "t", excluido_em: null, created_at: "2026-01-01", updated_at: "2026-01-01", ...extra };
}

const acervo: BibliotecaPrograma[] = [
  item("ul4", snap("Upper/Lower glúteo", 4, { split: "Upper/Lower", prioridades: ["gluteo"] })),
  item("fb3", snap("Full body iniciante", 3, { split: "Full Body", nivel: "iniciante", objetivo: "condicionamento", duracao_min: 45 })),
  item("ppl6", snap("PPL costas", 6, { split: "PPL", prioridades: ["costas"], equipamentos: ["barra", "halter", "maquina", "polia", "kettlebell"] })),
  item("abc3", snap("ABC emagrecimento", 3, { split: "ABC", objetivo: "emagrecimento" })),
];

describe("memória de prescrições — busca estruturada", () => {
  it("encontra divisão por objetivo/frequência com explicação", () => {
    const r = buscarSemelhantes(acervo, { dias: 4, objetivo: "hipertrofia", prioridades: ["gluteo"], split: "upper lower" });
    expect(r[0].item.id).toBe("ul4");
    expect(r[0].similaridade).toBeGreaterThan(80);
    expect(r[0].motivos).toEqual(expect.arrayContaining([expect.stringContaining("mesma frequência"), expect.stringContaining("mesmo foco (gluteo)"), expect.stringContaining("mesma divisão")]));
  });

  it("interpreta texto livre em PT-BR: '4 dias, glúteos, upper/lower, academia'", () => {
    const c = interpretarTexto("4 dias, glúteos, upper/lower, academia");
    expect(c.dias).toBe(4);
    expect(c.prioridades).toContain("gluteo");
    expect(c.split).toBe("upper/lower");
    expect(c.equipamentos).toContain("barra");
    const r = buscarSemelhantes(acervo, { texto: "4 dias, glúteos, upper/lower, academia" });
    expect(r[0].item.id).toBe("ul4");
  });

  it("não recomenda programa que exige equipamento ausente", () => {
    const r = buscarSemelhantes(acervo, { dias: 6, equipamentos: ["barra", "halter", "maquina", "polia"] });
    expect(r.find((x) => x.item.id === "ppl6")).toBeUndefined();
    const r2 = buscarSemelhantes(acervo, { dias: 6, equipamentos: ["barra", "halter", "maquina", "polia", "kettlebell"] });
    expect(r2[0]?.item.id).toBe("ppl6");
  });

  it("não recomenda programa com movimento restrito", () => {
    const r = buscarSemelhantes(acervo, { dias: 3, restricoes: ["supino"] });
    expect(r.length).toBe(0);
  });

  it("não expõe dados do aluno: desidentificação remove observações, cargas e nome pessoal", () => {
    const limpo = desidentificar(snap("Treino da Fulana", 2));
    expect(limpo.programa.observacoes).toBeNull();
    expect(limpo.treinos.every((t) => t.observacoes === null)).toBe(true);
    expect(limpo.treinos.flatMap((t) => t.exercicios).every((e) => e.observacoes === null && e.carga_alvo === null)).toBe(true);
    expect(JSON.stringify(limpo)).not.toContain("Fulana");
    expect(JSON.stringify(limpo)).not.toContain("joelho");
  });

  it("funciona sem provedor de IA e com histórico vazio", () => {
    expect(buscarSemelhantes([], { texto: "4 dias glúteo" })).toEqual([]);
    expect(buscarSemelhantes(acervo, {})).toEqual([]); // sem critérios não inventa ranking
  });

  it("deduplica por estrutura e prefere feedback explícito, sem alegar superioridade", () => {
    const dup = item("dup", snap("Upper/Lower glúteo", 4, { split: "Upper/Lower", prioridades: ["gluteo"] }), { feedback: { util: 3, nao_util: 0, usei_adaptei: 1 } });
    const r = buscarSemelhantes([...acervo, dup], { dias: 4, split: "upper/lower" });
    expect(r.filter((x) => x.item.hash_estrutura === dup.hash_estrutura).length).toBe(1);
    const neg = item("neg", snap("UL ruim", 4, { split: "Upper/Lower" }, ["Supino inclinado", "Puxada"]), { feedback: { util: 0, nao_util: 2, usei_adaptei: 0 } });
    const r2 = buscarSemelhantes([...acervo, neg], { dias: 4, split: "upper/lower" });
    expect(r2.find((x) => x.item.id === "neg")?.alertas).toContain("marcado como não útil anteriormente");
    expect(r2[0].item.id).toBe("ul4");
  });

  it("hash é estável para a mesma estrutura e muda com séries/frequência", () => {
    const a = hashEstrutura(desidentificar(snap("x", 3)));
    const b = hashEstrutura(desidentificar(snap("y", 3)));
    expect(a).toBe(b);
    const c = hashEstrutura(desidentificar(snap("x", 3, { frequencia: { A: 2, B: 1, C: 1 } })));
    expect(c).not.toBe(a);
  });

  it("metadados refletem dias, sessões por semana e grupos principais", () => {
    const m = extrairMetadados(snap("x", 3, { frequencia: { A: 2, B: 2, C: 1 } }));
    expect(m.dias).toBe(3);
    expect(m.sessoes_semana).toBe(5);
    expect(m.grupos_principais[0]).toBe("peito");
    expect(resumoLegivel(m)).toContain("3 dias");
  });
});
