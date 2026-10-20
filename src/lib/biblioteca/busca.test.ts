import { describe, expect, it } from "vitest";
import { CATALOGO } from "./catalogo";
import { buscarExercicios } from "./busca";
import { itemDoCatalogo, interpretarEquipamentos } from "./itens";

const itens = CATALOGO.map((e) => itemDoCatalogo(e));
const slugs = (q: string, f = {}, o = {}) => buscarExercicios(itens, q, f, o).map((r) => r.item.slug);

describe("busca da biblioteca", () => {
  it("“pulley” encontra as puxadas, antes de qualquer outro exercício", () => {
    const r = slugs("pulley");
    expect(r.length).toBeGreaterThanOrEqual(3);
    expect(r[0]).toBe("puxada-frontal-aberta");
    expect(r).toEqual(expect.arrayContaining(["puxada-frontal-aberta", "puxada-frontal-supinada", "puxada-triangulo"]));
    for (const s of r) expect(itens.find((i) => i.slug === s)!.padrao).toBe("puxar_vertical");
  });

  it("“rosca scott” encontra as três variantes cadastradas", () => {
    const r = slugs("rosca scott");
    expect(r.slice(0, 3).sort()).toEqual(["rosca-scott-barra-w", "rosca-scott-halter", "rosca-scott-maquina"]);
  });

  it("“leg” traz leg press e não mistura flexora/extensora", () => {
    const r = slugs("leg");
    expect(r).toEqual(expect.arrayContaining(["leg-press-45", "leg-press-horizontal"]));
    expect(r).not.toContain("mesa-flexora");
    expect(r).not.toContain("cadeira-extensora");
    for (const s of r) expect(s).toMatch(/leg-press/);
  });

  it("aceita nome parcial e ignora acentos e maiúsculas", () => {
    expect(slugs("supi").every((s) => s.startsWith("supino"))).toBe(true);
    expect(slugs("ELEVACAO LATERAL")).toEqual(expect.arrayContaining(["elevacao-lateral-halteres", "elevacao-lateral-polia", "elevacao-lateral-maquina"]));
    expect(slugs("búlgaro")[0]).toBe("agachamento-bulgaro");
  });

  it("aceita sinônimos usados na academia", () => {
    expect(slugs("peck deck")[0]).toBe("crucifixo-maquina");
    expect(slugs("serrote")[0]).toBe("remada-unilateral-halter");
    expect(slugs("rdl")[0]).toBe("terra-romeno");
    expect(slugs("chin up")[0]).toBe("barra-fixa-supinada");
  });

  it("busca por grupo muscular, equipamento e padrão de movimento", () => {
    const tri = slugs("tríceps");
    expect(tri).toEqual(expect.arrayContaining(["mergulho-paralelas", "supino-fechado", "triceps-corda"]));
    const smith = slugs("smith");
    expect(smith.length).toBeGreaterThanOrEqual(5);
    expect(smith.every((s) => itens.find((i) => i.slug === s)!.equipamento.includes("smith"))).toBe(true);
    const dobr = slugs("dobradiça de quadril");
    expect(dobr).toEqual(expect.arrayContaining(["stiff-barra", "terra-romeno", "levantamento-terra"]));
  });

  it("filtros: grupo (com e sem secundários), equipamento, tipo e favoritos", () => {
    const peito = buscarExercicios(itens, "", { grupo: "peito" });
    expect(peito).toHaveLength(16);
    const peitoSec = buscarExercicios(itens, "", { grupo: "peito", incluirSecundarios: true });
    expect(peitoSec.length).toBeGreaterThan(16);
    expect(peitoSec.map((r) => r.item.slug)).toContain("mergulho-paralelas");
    const maquinaMono = buscarExercicios(itens, "", { equipamento: "maquina", tipo: "monoarticular" });
    expect(maquinaMono.every((r) => r.item.equipamento.includes("maquina") && r.item.tipo === "monoarticular")).toBe(true);
    const fav = new Set([itens.find((i) => i.slug === "hip-thrust-barra")!.id]);
    const soFav = buscarExercicios(itens, "", { somenteFavoritos: true }, { favoritos: fav });
    expect(soFav.map((r) => r.item.slug)).toEqual(["hip-thrust-barra"]);
  });

  it("favoritos e uso real sobem na ordem, sem trazer resultados irrelevantes", () => {
    const id = itens.find((i) => i.slug === "remada-maquina-articulada")!.id;
    const r = buscarExercicios(itens, "remada", {}, { favoritos: new Set([id]) });
    expect(r[0].item.slug).toBe("remada-maquina-articulada");
    const uso = new Map([[itens.find((i) => i.slug === "remada-cavalinho")!.id, 9]]);
    expect(buscarExercicios(itens, "pulley", {}, { uso }).map((x) => x.item.slug)).not.toContain("remada-cavalinho");
  });

  it("filtro de pendência de mídia: todos os itens do catálogo estão sem vídeo verificado", () => {
    expect(buscarExercicios(itens, "", { somenteSemMidia: true })).toHaveLength(150);
  });

  it("interpreta equipamentos escritos em texto livre", () => {
    expect(interpretarEquipamentos(["Barra", "halteres", "máquina", "polia", "Smith"]).sort()).toEqual(["barra", "halter", "maquina", "polia", "smith"]);
    expect(interpretarEquipamentos(["barra fixa", "elástico"]).sort()).toEqual(["barra_fixa", "elastico"]);
  });
});
