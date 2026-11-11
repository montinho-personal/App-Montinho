import { describe, expect, it } from "vitest";
import type { SessaoConquista } from "./regras";
import { CATALOGO, detectarConquistas, LENDARIAS } from "./regras";
import { CONTEUDO } from "./conteudo";
import { CODIGOS_RECORDES_TRILHA, maiorSubida, proximoDaTrilha, totaisDosRecordes, trofeusDosRecordes, trofeusForcaEmAlta } from "./recordes-trilha";

let n = 0;
function sessao(exs: NonNullable<SessaoConquista["exercicios"]>, extra: Partial<SessaoConquista> = {}): SessaoConquista {
  n++;
  const d = new Date(Date.UTC(2026, 8, 1) + n * 86_400_000).toISOString().slice(0, 10);
  return { id: `s${n}`, iniciado_em: `${d}T10:00:00.000Z`, status: "concluida", modo: "normal", series_planejadas: 10, series_concluidas: 10, treino_id: "t", letra: "A", nome_treino: "A", duracao_seg: 3600, origem: "app", conta_aderencia: true, exercicios: exs, ...extra } as SessaoConquista;
}
const ex = (nome: string, carga: number, reps = 10) => ({ exercicio_id: null, nome, series: [{ tipo: "valida", carga_kg: carga, reps }] });
const rec = (nome: string) => ({ exercicio: nome, tipo: "carga" as const, antes: 10, agora: 12 });
const detectar = (sessoes: SessaoConquista[]) => detectarConquistas({ sessoes, aderencia: { sequencia: 0, semanaAtual: null, semanas: [] } as never, relatorioVistoEm: null, baseCarga: [], hoje: "2026-12-31" } as never);

describe("Caçador de Recordes e Força em Todo Lugar", () => {
  it("soma cada exercício com recorde e conta exercícios diferentes sem acento", () => {
    const lista = [
      { sessaoId: "a", data: "2026-10-01T10:00:00Z", itens: [rec("Supino reto"), rec("Remada")] },
      { sessaoId: "b", data: "2026-10-02T10:00:00Z", itens: [rec("supino  RETO"), rec("Elevação lateral")] },
    ];
    expect(totaisDosRecordes(lista)).toEqual({ recordes: 4, exercicios: 3 });
  });

  it("concede cada degrau uma vez, no treino em que passou", () => {
    const lista = Array.from({ length: 4 }, (_, i) => ({ sessaoId: `x${i}`, data: `2026-10-0${i + 1}T10:00:00Z`, itens: [rec(`Ex ${i}a`), rec(`Ex ${i}b`), rec(`Ex ${i}c`)] }));
    const t = trofeusDosRecordes(lista);
    expect(t.find((x) => x.codigo === "recordes_5")!.sessaoId).toBe("x1"); // 6 recordes no 2º treino
    expect(t.find((x) => x.codigo === "recordes_10")!.sessaoId).toBe("x3"); // 12 no 4º
    expect(t.find((x) => x.codigo === "recordes_exercicios_10")!.sessaoId).toBe("x3");
    expect(t.filter((x) => x.codigo === "recordes_5")).toHaveLength(1);
  });

  it("próximo da trilha", () => {
    expect(proximoDaTrilha(3)).toEqual({ atual: 3, alvo: 5 });
    expect(proximoDaTrilha(5)).toEqual({ atual: 5, alvo: 10 });
    expect(proximoDaTrilha(250)).toBeNull();
  });
});

describe("Força em Alta", () => {
  it("compara com a 1ª carga e exige 2 treinos antes", () => {
    const ss = [sessao([ex("Supino", 40)]), sessao([ex("Supino", 50)]), sessao([ex("Supino", 50)]), sessao([ex("Supino", 60)])];
    const t = trofeusForcaEmAlta(ss);
    // 2º treino já seria +25%, mas só 1 treino antes; no 3º (+25%) vale; no 4º, +50%
    expect(t.find((x) => x.codigo === "forca_alta_25")!.sessaoId).toBe(ss[2].id);
    expect(t.find((x) => x.codigo === "forca_alta_50")!.sessaoId).toBe(ss[3].id);
    expect(t.some((x) => x.codigo === "forca_alta_100")).toBe(false);
  });

  it("dor, importado, carga inicial abaixo de 5 kg e série fora do limite não valem", () => {
    const dor = [sessao([ex("Rosca", 10)]), sessao([ex("Rosca", 10)]), sessao([ex("Rosca", 30)], { feedback_percepcao: "dor" })];
    expect(trofeusForcaEmAlta(dor)).toHaveLength(0);
    const leve = [sessao([ex("Elevação", 2)]), sessao([ex("Elevação", 3)]), sessao([ex("Elevação", 6)])];
    expect(trofeusForcaEmAlta(leve)).toHaveLength(0);
    const imp = [sessao([ex("Leg", 100)], { origem: "importado" }), sessao([ex("Leg", 100)], { origem: "importado" }), sessao([ex("Leg", 250)], { origem: "importado" })];
    expect(trofeusForcaEmAlta(imp)).toHaveLength(0);
    const fora = [sessao([ex("Leg", 100)]), sessao([ex("Leg", 100)]), sessao([ex("Leg", 900)])];
    expect(trofeusForcaEmAlta(fora)).toHaveLength(0);
  });

  it("o importado serve de base (1ª carga)", () => {
    const ss = [sessao([ex("Leg", 100)], { origem: "importado" }), sessao([ex("Leg", 110)]), sessao([ex("Leg", 200)])];
    expect(trofeusForcaEmAlta(ss).map((x) => x.codigo)).toEqual(["forca_alta_25", "forca_alta_50", "forca_alta_100"]);
  });

  it("maior subida para o progresso", () => {
    const ss = [sessao([ex("Supino", 40), ex("Remada", 30)]), sessao([ex("Supino", 44), ex("Remada", 30)]), sessao([ex("Supino", 50), ex("Remada", 33)])];
    expect(maiorSubida(ss)).toEqual({ exercicio: "Supino", pct: 25 });
  });
});

describe("integração", () => {
  it("entra no detectarConquistas e o recorde mostra o progresso da trilha", () => {
    const ss = Array.from({ length: 8 }, (_, i) => sessao([ex("Supino", 40 + i * 5), ex("Remada", 30 + i * 5)]));
    const det = detectar(ss);
    const recordes = det.filter((d) => d.codigo === "recorde");
    expect(recordes.length).toBeGreaterThan(0);
    expect(recordes[0].descricao).toContain("Caçador de Recordes: 2 de 5");
    expect(det.some((d) => d.codigo === "recordes_5")).toBe(true);
    expect(det.some((d) => d.codigo === "forca_alta_50")).toBe(true);
  });

  it("todos os códigos têm catálogo e conteúdo; 250 é lendário", () => {
    for (const c of CODIGOS_RECORDES_TRILHA) {
      expect(CATALOGO[c].titulo).toBeTruthy();
      expect(CONTEUDO[c].categoria).toBe("desempenho");
    }
    expect(LENDARIAS.has("recordes_250")).toBe(true);
  });
});
