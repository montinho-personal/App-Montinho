import { describe, expect, it } from "vitest";
import { calcularAderencia, somarDias, type PausaAluno } from "@/lib/aderencia/calcular";
import { detectarConquistas, VERSAO_CRITERIO, type SessaoConquista } from "./regras";

// 2026-08-03 é segunda-feira (início do acompanhamento nos testes).
let n = 0;
function s(dia: string, o: Partial<SessaoConquista> = {}): SessaoConquista {
  return { id: `c${++n}`, iniciado_em: `${dia}T13:00:00Z`, status: "concluida", series_planejadas: 10, series_concluidas: 10, exercicios: [], ...o };
}
const metas = [{ desde: "2026-01-01", meta: 2, origem: "personal" as const }];
function detectar(sessoes: SessaoConquista[], hoje = "2026-12-21", pausas: PausaAluno[] = []) {
  const aderencia = calcularAderencia({ inicio: "2026-08-03", hoje, metas, sessoes, pausas });
  return detectarConquistas({ sessoes, aderencia, hoje });
}
const tem = (xs: ReturnType<typeof detectar>, c: string) => xs.some((x) => x.codigo === c);
/** Duas sessões (meta 2 cumprida) na semana que começa na segunda `seg`. */
const semanaCumprida = (seg: string) => [s(seg), s(somarDias(seg, 1))];

describe("Criando raízes", () => {
  it("treino em 2 semanas diferentes nas 4 primeiras semanas", () => {
    const r = detectar([s("2026-08-04"), s("2026-08-12")]);
    expect(r.find((x) => x.codigo === "criando_raizes")?.data).toBe("2026-08-12T13:00:00Z");
    expect(tem(detectar([s("2026-08-04"), s("2026-08-05")]), "criando_raizes")).toBe(false); // mesma semana
    expect(tem(detectar([s("2026-08-04"), s("2026-09-01")]), "criando_raizes")).toBe(false); // 5ª semana
  });
  it("pausa combinada estende a janela (sem contar como treino)", () => {
    const pausa = [{ inicio: "2026-08-10", fim: "2026-08-16" }];
    expect(tem(detectar([s("2026-08-04"), s("2026-09-01")], undefined, pausa), "criando_raizes")).toBe(true);
  });
  it("treino extra não conta", () => {
    expect(tem(detectar([s("2026-08-04"), s("2026-08-12", { modo: "extra" })]), "criando_raizes")).toBe(false);
  });
});

describe("Constância na vida real (3 de 4) e de verdade (8 de 12)", () => {
  it("3 de 4 semanas com a meta; uma semana diferente não zera", () => {
    const xs = [...semanaCumprida("2026-09-07"), ...semanaCumprida("2026-09-14"), s("2026-09-22"), ...semanaCumprida("2026-09-28")];
    const r = detectar(xs);
    expect(tem(r, "constancia_vida_real")).toBe(true);
    expect(tem(r, "semanas_consistentes_4")).toBe(false);
    expect(r.find((x) => x.codigo === "constancia_vida_real")?.evidencia.semanas).toHaveLength(4);
  });
  it("2 de 4 não basta", () => {
    expect(tem(detectar([...semanaCumprida("2026-09-07"), s("2026-09-15"), s("2026-09-22"), ...semanaCumprida("2026-09-28")]), "constancia_vida_real")).toBe(false);
  });
  it("pausa congela a janela e não soma semana cumprida", () => {
    const pausa = [{ inicio: "2026-09-21", fim: "2026-09-27" }];
    // semana em pausa com treinos não vira semana cumprida
    const xs = [...semanaCumprida("2026-09-07"), ...semanaCumprida("2026-09-21"), ...semanaCumprida("2026-09-28")];
    const r = detectar(xs, undefined, pausa);
    const ev = r.find((x) => x.codigo === "constancia_vida_real");
    expect(ev).toBeUndefined(); // 09-14 sem treino + pausa: só 2 cumpridas elegíveis
    expect(tem(detectar([...xs, ...semanaCumprida("2026-10-05")], undefined, pausa), "constancia_vida_real")).toBe(true);
  });
  it("8 de 12 semanas", () => {
    const segs = ["2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31", "2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19"];
    const cumpre = [1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1];
    const xs = segs.flatMap((w, i) => (cumpre[i] ? semanaCumprida(w) : [s(w)]));
    expect(tem(detectar(xs), "constancia_verdade")).toBe(true);
    const sete = segs.flatMap((w, i) => (cumpre[i] && i < 11 ? semanaCumprida(w) : [s(w)]));
    expect(tem(detectar(sete), "constancia_verdade")).toBe(false);
  });
});

describe("A Jornada Começou (primeiro_mes, critério v3)", () => {
  const xs = () => [s("2026-09-01"), s("2026-09-08"), s("2026-09-15")];
  it("treinos em 3 semanas diferentes; só depois dos 28 primeiros dias", () => {
    expect(tem(detectar(xs(), "2026-09-20"), "primeiro_mes")).toBe(false);
    const r = detectar(xs(), "2026-10-21").find((x) => x.codigo === "primeiro_mes")!;
    expect(r.data).toBe("2026-09-29T15:00:00Z");
    expect(r.sessaoId).toBeNull();
    expect(r.versao).toBe(3);
    expect(VERSAO_CRITERIO.primeiro_mes).toBe(3);
  });
  it("só 2 semanas diferentes, treino parcial ou fora dos 28 dias não contam", () => {
    expect(tem(detectar([s("2026-09-01"), s("2026-09-02"), s("2026-09-08"), s("2026-09-09")]), "primeiro_mes")).toBe(false);
    expect(tem(detectar([s("2026-09-01"), s("2026-09-08"), s("2026-09-15", { series_concluidas: 2 })]), "primeiro_mes")).toBe(false);
    expect(tem(detectar([s("2026-09-01"), s("2026-09-08"), s("2026-09-29")]), "primeiro_mes")).toBe(false);
  });
});

describe("Recomeço consistente e Eu voltei", () => {
  it("volta depois de 14+ dias e treina em outra semana em até 21 dias", () => {
    const r = detectar([s("2026-09-01"), s("2026-09-20"), s("2026-09-22")]);
    expect(tem(r, "eu_voltei")).toBe(true);
    expect(r.find((x) => x.codigo === "recomeco_consistente")?.evidencia).toMatchObject({ volta: "2026-09-20", segundaSemana: "2026-09-22" });
  });
  it("mesma semana ou depois de 21 dias não conta; é única (uma vez só)", () => {
    expect(tem(detectar([s("2026-09-01"), s("2026-09-22"), s("2026-09-24")]), "recomeco_consistente")).toBe(false);
    expect(tem(detectar([s("2026-09-01"), s("2026-09-20"), s("2026-10-20")]), "recomeco_consistente")).toBe(false);
    const duas = detectar([s("2026-08-03"), s("2026-08-20"), s("2026-08-25"), s("2026-09-20"), s("2026-09-22")]);
    expect(duas.filter((x) => x.codigo === "recomeco_consistente")).toHaveLength(1);
    expect(duas.filter((x) => x.codigo === "eu_voltei")).toHaveLength(2); // recorrente: uma por retomada
  });
});

describe("Gravação: versão, evidência, origem e ordem independente", () => {
  it("cada conquista leva versão do critério e origem; nenhuma depende de outra", () => {
    const imp = s("2026-08-04", { origem: "importado" });
    const r = detectar([imp, s("2026-08-12")]);
    const p = r.find((x) => x.codigo === "primeiro_treino")!;
    expect(p).toMatchObject({ versao: 1, origem: "importado" });
    // Criando raízes sai sem a “Primeira meta” (critérios independentes da ordem visual).
    expect(tem(r, "criando_raizes")).toBe(true);
    expect(tem(r, "primeira_meta_semanal")).toBe(false);
  });
  it("recalcular não duplica (mesmos pares código+referência)", () => {
    const xs = [s("2026-09-01"), s("2026-09-20"), s("2026-09-22")];
    const a = detectar(xs).map((x) => `${x.codigo}:${x.referencia}`);
    expect(new Set(a).size).toBe(a.length);
    expect(detectar(xs).map((x) => `${x.codigo}:${x.referencia}`)).toEqual(a);
  });
});
