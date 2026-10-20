import { describe, expect, it } from "vitest";
import { CATALOGO } from "./catalogo";
import { itemDoCatalogo } from "./itens";
import { sugerirSubstituicoes } from "./substituicao";
import type { Equivalencia } from "./tipos";

const itens = CATALOGO.map((e) => itemDoCatalogo(e));
const porSlug = (s: string) => itens.find((i) => i.slug === s)!;
const curadas: Equivalencia[] = CATALOGO.flatMap((e) =>
  e.substituicoes.map((s) => ({ exercicioId: `cat-${e.slug}`, alternativaId: `cat-${s}`, origem: "catalogo" as const, status: "sugerida" as const, nota: null }))
);

describe("sugestões de substituição", () => {
  it("supino reto com barra sugere supino com halteres e na máquina", () => {
    const r = sugerirSubstituicoes(porSlug("supino-reto-barra"), itens, curadas);
    const s = r.sugestoes.map((x) => x.item.slug);
    expect(s.slice(0, 3)).toEqual(expect.arrayContaining(["supino-reto-halteres", "supino-reto-maquina"]));
    expect(r.sugestoes[0].motivos.join(" ")).toMatch(/Mesmo padrão/);
  });

  it("não considera equivalentes só porque trabalham o mesmo músculo", () => {
    const s = sugerirSubstituicoes(porSlug("agachamento-livre"), itens, curadas, {}, 50).sugestoes.map((x) => x.item.slug);
    expect(s).not.toContain("cadeira-extensora");
    expect(s).not.toContain("sissy-squat");
    const sem = sugerirSubstituicoes(porSlug("agachamento-livre"), itens, [], {}, 50).sugestoes;
    expect(sem.every((x) => x.item.padrao === "agachar" && x.item.grupo === "quadriceps")).toBe(true);
  });

  it("descarta alternativas sem o equipamento disponível e explica por quê", () => {
    const r = sugerirSubstituicoes(porSlug("supino-reto-barra"), itens, curadas, { equipamentos: ["halter", "banco"] });
    expect(r.sugestoes.map((x) => x.item.slug)).toContain("supino-reto-halteres");
    expect(r.sugestoes.map((x) => x.item.slug)).not.toContain("supino-reto-maquina");
    expect(r.descartadas.find((d) => d.item.slug === "supino-reto-maquina")?.motivo).toMatch(/Equipamento/);
  });

  it("restrição de joelho na anamnese rebaixa e alerta opções que estressam o joelho", () => {
    const r = sugerirSubstituicoes(porSlug("hip-thrust-barra"), itens, curadas, { regioesRestritas: ["joelho"] }, 10);
    const bulg = sugerirSubstituicoes(porSlug("leg-press-45"), itens, curadas, { regioesRestritas: ["joelho"] }, 10);
    for (const s of bulg.sugestoes) if (s.item.estresse.includes("joelho")) expect(s.alertas.join(" ")).toMatch(/joelho/);
    expect(r.sugestoes.length).toBeGreaterThan(0);
    // Stiff (lombar) para quem tem restrição lombar: alternativa sem estresse lombar vem primeiro.
    const lomb = sugerirSubstituicoes(porSlug("stiff-barra"), itens, curadas, { regioesRestritas: ["lombar"] });
    expect(lomb.sugestoes[0].item.slug).toBe("mesa-flexora");
    expect(lomb.sugestoes[0].motivos.join(" ")).toMatch(/Menos estresse em lombar/);
  });

  it("nível do aluno: exercício avançado para iniciante recebe alerta", () => {
    const r = sugerirSubstituicoes(porSlug("puxada-frontal-aberta"), itens, curadas, { nivel: "iniciante" });
    const barra = r.sugestoes.find((x) => x.item.slug === "barra-fixa-pronada")!;
    expect(barra.alertas.join(" ")).toMatch(/nível avançado/);
    expect(r.sugestoes[0].item.slug).not.toBe("barra-fixa-pronada");
  });

  it("revisão do personal: aprovada sobe para o topo e rejeitada nunca aparece", () => {
    const base: Equivalencia[] = [
      ...curadas,
      { exercicioId: "cat-supino-reto-barra", alternativaId: "cat-flexao-de-bracos", origem: "treinador", status: "aprovada", nota: "Aluno treina em casa" },
    ];
    const comRejeicao = base.map((e) =>
      e.exercicioId === "cat-supino-reto-barra" && e.alternativaId === "cat-supino-reto-smith" ? { ...e, status: "rejeitada" as const } : e
    );
    const r = sugerirSubstituicoes(porSlug("supino-reto-barra"), itens, comRejeicao);
    expect(r.sugestoes[0].item.slug).toBe("flexao-de-bracos");
    expect(r.sugestoes[0].origem).toBe("aprovada");
    expect(r.sugestoes.map((x) => x.item.slug)).not.toContain("supino-reto-smith");
  });
});
