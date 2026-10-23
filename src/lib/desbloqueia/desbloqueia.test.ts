import { describe, expect, it } from "vitest";
import { BASE_DESCOBERTAS } from "./base";
import { FONTES } from "./fontes";
import { albumDoAluno, mesclarConteudos, paraAnunciar, problemasEditoriais, progressoAlbum, publicados, responder, sugestaoContextual } from "./motor";
import { CATEGORIAS, type ConteudoConhecimento } from "./tipos";
import { CATALOGO } from "@/lib/conquistas/regras";

const fontes = Object.keys(FONTES);
const base = BASE_DESCOBERTAS;
const c = (id: string) => base.find((x) => x.id === id)!;

describe("conteúdo editorial (30 descobertas)", () => {
  it("1. 30 conteúdos com IDs estáveis, números 1–30 e 5 categorias", () => {
    expect(base).toHaveLength(30);
    expect(base.map((x) => x.id)).toEqual(Array.from({ length: 30 }, (_, i) => `d${String(i + 1).padStart(2, "0")}`));
    expect(base.map((x) => x.numero)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(new Set(base.map((x) => x.categoria))).toEqual(new Set(CATEGORIAS.map((k) => k.id)));
  });
  it("consistência: alternativas, resposta correta entre elas, níveis 1/2/3 e só fontes verificadas", () => {
    for (const x of base) expect(problemasEditoriais(x, fontes), x.id).toEqual([]);
    for (const x of base) expect(x.ciencia.length, x.id).toBeGreaterThan(20);
  });
  it("2/3. respostas Mito e Verdade conforme a base editorial", () => {
    // Respostas equilibradas (23/10/2026): metade verdade, sem sequência longa igual.
    const verdades = base.filter((x) => x.veredito.startsWith("VERDADE")).length;
    expect(verdades).toBeGreaterThanOrEqual(12);
    expect(base.length - verdades).toBeGreaterThanOrEqual(12);
    let seq = 1;
    for (let i = 1; i < base.length; i++) { seq = base[i].correta === base[i - 1].correta ? seq + 1 : 1; expect(seq).toBeLessThanOrEqual(3); }
    expect(c("d01")).toMatchObject({ correta: "mito", veredito: "MITO" });
    expect(c("d29")).toMatchObject({ tipo: "mito_verdade_depende", correta: "verdade", veredito: "VERDADE, COM CONTEXTO" });
  });
  it("gatilhos só usam medalhas que existem; mapeamento pedido pelo Montinho", () => {
    const codigos = Object.keys(CATALOGO);
    for (const x of base) for (const g of x.gatilhos.conquistas) expect(codigos, `${x.id} → ${g}`).toContain(g);
    const de = (g: string) => base.filter((x) => x.gatilhos.conquistas.includes(g)).map((x) => x.id);
    expect(de("primeiro_treino")).toEqual(["d02"]);
    expect(de("primeira_meta_semanal")).toEqual(["d28"]);
    expect(de("treinos_10")).toEqual(["d05"]);
    expect(de("primeiro_mes")).toEqual(["d26"]);
    expect(de("semanas_consistentes_4")).toEqual(["d23"]);
    expect(de("relatorio_mensal")).toEqual(["d13"]);
    expect(de("recorde")).toEqual(["d03"]);
    expect(de("eu_voltei")).toEqual(["d30"]);
    expect(c("d29").gatilhos.contexto).toContain("treino_reduzido");
  });
});

describe("quiz", () => {
  it("4. 'depende' funciona; 5/6. errar não pune (só muda a frase)", () => {
    const dep: ConteudoConhecimento = { ...c("d29"), id: "x", tipo: "mito_verdade_depende", correta: "depende", veredito: "DEPENDE" };
    expect(responder(dep, "depende").acertou).toBe(true);
    expect(responder(c("d01"), "mito")).toMatchObject({ acertou: true, titulo: "Isso mesmo!" });
    const errado = responder(c("d01"), "verdade");
    expect(errado.acertou).toBe(false);
    expect(errado.titulo).toMatch(/Boa tentativa/);
    expect(Object.keys(errado)).toEqual(["acertou", "titulo", "veredito"]); // sem pontos, sem penalidade
  });
});

describe("álbum e desbloqueios", () => {
  const inicio = "2026-09-01";
  it("11. aluno sem medalhas: 1ª descoberta por tempo de acompanhamento; mais uma a cada 14 dias", () => {
    const a = albumDoAluno({ conteudos: base, progresso: [], conquistas: [], inicio, hoje: "2026-09-01" });
    expect(a.filter((i) => i.estado === "disponivel")).toHaveLength(1);
    const b = albumDoAluno({ conteudos: base, progresso: [], conquistas: [], inicio, hoje: "2026-09-29" });
    expect(b.filter((i) => i.origem === "periodo")).toHaveLength(3);
    expect(progressoAlbum(b)).toEqual({ explorados: 0, total: 30 });
  });
  it("7. desbloqueio por medalha, com a data da conquista; 9. explorado sem acertar", () => {
    const a = albumDoAluno({ conteudos: base, progresso: [{ conteudo_id: "d02", origem: "conquista", disponivel_em: null, explorado_em: "2026-09-05T12:00:00Z", resposta: "verdade", acertou: false, salvo: false }], conquistas: [{ codigo: "primeiro_treino", conquistado_em: "2026-09-02T13:00:00Z" }, { codigo: "recorde", conquistado_em: "2026-09-04T13:00:00Z" }], inicio, hoje: "2026-09-06" });
    const d02 = a.find((i) => i.conteudo.id === "d02")!;
    expect(d02).toMatchObject({ estado: "explorado", disponivelEm: "2026-09-02", origem: "conquista", novo: "explorado" });
    expect(a.find((i) => i.conteudo.id === "d03")).toMatchObject({ estado: "disponivel", origem: "conquista", novo: "disponivel" });
    expect(paraAnunciar(a)?.conteudo.id).toBe("d03");
    expect(paraAnunciar(a, ["d03"])?.conteudo.id).not.toBe("d03");
  });
  it("12/13. histórico importado e pausas não apagam descobertas (estado derivado + explorado gravado)", () => {
    const a = albumDoAluno({ conteudos: base, progresso: [{ conteudo_id: "d10", origem: "biblioteca", disponivel_em: null, explorado_em: "2026-09-03T12:00:00Z", resposta: null, acertou: null, salvo: true }], conquistas: [], inicio, hoje: "2026-12-01" });
    expect(a.find((i) => i.conteudo.id === "d10")).toMatchObject({ estado: "explorado", salvo: true });
  });
  it("18. arquivado ou rascunho não aparece; 17. edição do personal (versão nova) vence a base", () => {
    const m = mesclarConteudos(base, [
      { id: "d01", dados: { titulo: "8, 12 ou 20 repetições?" }, status: "publicado", versao: 2, ordem: null },
      { id: "d02", dados: {}, status: "arquivado", versao: 2, ordem: null },
      { id: "p-novo", dados: { ...c("d04"), titulo: "Conteúdo do Montinho", pergunta: "Pergunta nova?" }, status: "rascunho", versao: 1, ordem: 40 },
    ]);
    expect(m.find((x) => x.id === "d01")).toMatchObject({ titulo: "8, 12 ou 20 repetições?", versao: 2 });
    expect(publicados(m).map((x) => x.id)).not.toContain("d02");
    expect(m.find((x) => x.id === "p-novo")).toMatchObject({ personalizado: true, status: "rascunho" });
    expect(publicados(m).map((x) => x.id)).not.toContain("p-novo");
  });
  it("8/10. sugestão contextual: relevante, sem repetir, no máximo 1 por sessão", () => {
    expect(sugestaoContextual("mais_reps", base, { explorados: [], jaSugeridos: [] })?.id).toBe("d03");
    expect(sugestaoContextual("mais_reps", base, { explorados: ["d03"], jaSugeridos: [] })).toBeNull();
    expect(sugestaoContextual("reps_altas", base, { explorados: [], jaSugeridos: ["d07"] })).toBeNull();
    expect(sugestaoContextual("treino_reduzido", base, { explorados: [], jaSugeridos: [] })?.id).toBe("d29");
  });
  it("15. orientações essenciais nunca dependem de medalha (biblioteca livre: todo publicado é legível)", () => {
    const essenciais = base.filter((x) => x.essencial);
    expect(essenciais.length).toBeGreaterThanOrEqual(4);
    expect(publicados(base).length).toBe(30);
  });
});
