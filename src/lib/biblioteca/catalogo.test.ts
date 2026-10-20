import { describe, expect, it } from "vitest";
import { CATALOGO, GRUPOS_OBRIGATORIOS } from "./catalogo";
import { normalizarNome } from "@/lib/grupos";
import { GRUPOS_SELECIONAVEIS } from "@/lib/grupos";
import { EQUIPAMENTO_LABEL, PADRAO_LABEL, CAMPO_REGISTRO_LABEL, REGIAO_ESTRESSE_LABEL } from "./tipos";

describe("catálogo de exercícios", () => {
  it("tem exatamente 150 exercícios com slugs únicos e estáveis", () => {
    expect(CATALOGO).toHaveLength(150);
    const slugs = CATALOGO.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(150);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("não tem duplicatas reais: nenhum nome ou sinônimo aponta para dois exercícios", () => {
    const dono = new Map<string, string>();
    for (const e of CATALOGO) {
      for (const n of [e.nome, ...e.sinonimos]) {
        const k = normalizarNome(n);
        const outro = dono.get(k);
        expect(outro === undefined || outro === e.slug, `"${n}" em ${outro} e ${e.slug}`).toBe(true);
        dono.set(k, e.slug);
      }
    }
  });

  it("cobre todos os grupos musculares obrigatórios", () => {
    const grupos = new Set(CATALOGO.map((e) => e.grupo));
    for (const g of GRUPOS_OBRIGATORIOS) expect(grupos.has(g), g).toBe(true);
    // Deltoides separados: anterior, lateral e posterior têm exercícios diretos.
    expect(CATALOGO.filter((e) => e.grupo === "ombro_lateral").length).toBeGreaterThanOrEqual(3);
    expect(CATALOGO.filter((e) => e.grupo === "ombro_posterior").length).toBeGreaterThanOrEqual(3);
  });

  it("todo exercício tem metadados completos e válidos", () => {
    for (const e of CATALOGO) {
      expect(GRUPOS_SELECIONAVEIS.includes(e.grupo), `${e.slug} grupo`).toBe(true);
      expect(PADRAO_LABEL[e.padrao], `${e.slug} padrão`).toBeTruthy();
      expect(e.articulacoes.length, `${e.slug} articulações`).toBeGreaterThan(0);
      expect(e.equipamento.length, `${e.slug} equipamento`).toBeGreaterThan(0);
      for (const q of e.equipamento) expect(EQUIPAMENTO_LABEL[q], `${e.slug} ${q}`).toBeTruthy();
      expect(e.execucao.length, `${e.slug} execução`).toBeGreaterThanOrEqual(2);
      expect(e.erros.length, `${e.slug} erros`).toBeGreaterThanOrEqual(1);
      expect(e.registro.length, `${e.slug} registro`).toBeGreaterThan(0);
      for (const r of e.registro) expect(CAMPO_REGISTRO_LABEL[r]).toBeTruthy();
      for (const r of e.estresse) expect(REGIAO_ESTRESSE_LABEL[r]).toBeTruthy();
      expect(["multiarticular", "monoarticular"]).toContain(e.tipo);
    }
  });

  it("pesos do volume ponderado são frações válidas e nunca incluem o músculo principal", () => {
    for (const e of CATALOGO) {
      for (const [g, w] of Object.entries(e.pesosSecundarios)) {
        expect(g, `${e.slug}: principal não pode ser secundário`).not.toBe(e.grupo);
        expect(w).toBeGreaterThan(0);
        expect(w).toBeLessThanOrEqual(1);
      }
    }
  });

  it("substituições apontam para exercícios existentes e nunca para si mesmo", () => {
    const slugs = new Set(CATALOGO.map((e) => e.slug));
    for (const e of CATALOGO) {
      expect(e.substituicoes.length, `${e.slug} sem substituição`).toBeGreaterThan(0);
      for (const s of e.substituicoes) {
        expect(slugs.has(s), `${e.slug} → ${s}`).toBe(true);
        expect(s).not.toBe(e.slug);
      }
    }
  });

  it("classificações musculares de referência estão corretas", () => {
    const g = (slug: string) => CATALOGO.find((e) => e.slug === slug)!;
    expect(g("supino-reto-barra").grupo).toBe("peito");
    expect(g("supino-reto-barra").pesosSecundarios).toMatchObject({ triceps: 0.5, ombro_anterior: 0.5 });
    expect(g("elevacao-lateral-halteres").grupo).toBe("ombro_lateral");
    expect(g("face-pull").grupo).toBe("ombro_posterior");
    expect(g("mesa-flexora").grupo).toBe("posteriores");
    expect(g("hip-thrust-barra").grupo).toBe("gluteo");
    expect(g("cadeira-extensora").grupo).toBe("quadriceps");
    expect(g("agachamento-livre").padrao).toBe("agachar");
    expect(g("cadeira-extensora").padrao).toBe("extensao_joelho");
    expect(g("caminhada-fazendeiro").contaVolume).toBe(false);
    expect(g("prancha-frontal").registro).toEqual(["tempo"]);
    expect(g("barra-fixa-graviton").registro).toContain("assistencia");
  });

  it("nenhum exercício traz vídeo inventado (mídia só entra verificada pelo treinador)", () => {
    for (const e of CATALOGO) expect(JSON.stringify(e)).not.toMatch(/youtu|vimeo|https?:\/\//);
  });
});

describe("compatibilidade com a biblioteca anterior (ZIP) e treinos existentes", () => {
  it("todo exercício de musculação da biblioteca antiga e dos treinos de demonstração é reconhecido", async () => {
    const { indicePorNome, itemDoCatalogo } = await import("./itens");
    const { mockBiblioteca } = await import("@/lib/mock/db-extended");
    const { demoStore } = await import("@/lib/mock/store");
    const idx = indicePorNome(CATALOGO.map((e) => itemDoCatalogo(e)));
    const nomes = [...new Set([...mockBiblioteca.map((b) => b.nome), ...demoStore().exercicios.map((e) => e.nome)])];
    // Cardio (esteira, bike) fica fora da biblioteca de musculação por decisão de escopo.
    const faltam = nomes.filter((n) => !/esteira|bike/i.test(n) && !idx.has(normalizarNome(n)));
    expect(faltam).toEqual([]);
  });
});
