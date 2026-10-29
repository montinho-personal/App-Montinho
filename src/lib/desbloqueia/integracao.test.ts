import { describe, expect, it } from "vitest";
import { BASE_DESCOBERTAS } from "./base";
import { albumDoAluno, candidatasAnuncio, contextosDaConclusao, eventosDasDescobertas, pacoteDoTreino, repsPrescritas } from "./motor";
import { CONTEXTOS } from "./tipos";
import { analyticsDesbloqueia } from "./analytics";
import { fraseCurta, layoutDescoberta, quebrar } from "./card";
import { conteudoConhecimentoSchema, explorarConhecimentoSchema, eventoChalalaSchema } from "@/lib/validacao/schemas";
import { juntarEventos } from "@/lib/conquistas/jornada";

const base = BASE_DESCOBERTAS;
const medir = (t: string, tam: number) => t.length * tam * 0.5;

describe("Desbloqueia no treino", () => {
  it("sugestão automática só do que ainda não foi explorado; reps altas sempre disponível", () => {
    const p = pacoteDoTreino(base, [], CONTEXTOS);
    expect(p.porContexto.recorde).toBe("d03");
    expect(p.porContexto.descanso).toBe("d07");
    expect(p.porContexto.meta_semanal).toBe("d27");
    expect(p.repsAltas).toBe("d01");
    expect(Object.keys(p.itens).sort()).toEqual([...new Set([...Object.values(p.porContexto), "d01"])].sort());
    const depois = pacoteDoTreino(base, ["d03", "d01"], CONTEXTOS);
    expect(depois.porContexto.recorde).toBeUndefined();
    expect(depois.porContexto.reps_altas).toBeUndefined();
    expect(depois.repsAltas).toBe("d01");
  });
  it("lê a prescrição de repetições", () => {
    expect(repsPrescritas("15-20")).toBe(15);
    expect(repsPrescritas("até a falha")).toBeNull();
    expect(repsPrescritas(null)).toBeNull();
    expect(repsPrescritas("40s")).toBeNull();
    expect(repsPrescritas("30 seg")).toBeNull();
  });
  it("fim de treino: meta > treino reduzido > recorde > mais reps", () => {
    expect(contextosDaConclusao({ metaCumpridaAgora: true, modo: "reduzido", recorde: true, maisReps: false })).toEqual(["meta_semanal", "treino_reduzido", "recorde"]);
    expect(contextosDaConclusao({ metaCumpridaAgora: false, modo: "normal", recorde: false, maisReps: false })).toEqual([]);
  });
});

describe("álbum, anúncio e jornada", () => {
  const album = albumDoAluno({
    conteudos: base,
    progresso: [{ conteudo_id: "d05", origem: "personal", disponivel_em: "2026-10-18T10:00:00Z", explorado_em: null, resposta: null, acertou: null, salvo: false }, { conteudo_id: "d02", origem: "conquista", disponivel_em: null, explorado_em: "2026-10-10T10:00:00Z", resposta: "mito", acertou: true, salvo: true }],
    conquistas: [{ codigo: "primeiro_treino", conquistado_em: "2026-10-01T12:00:00Z" }],
    inicio: "2026-10-01",
    hoje: "2026-10-20",
  });
  it("quem nunca explorou recebe o convite mesmo sem item recente", () => {
    const antigo = albumDoAluno({ conteudos: base, progresso: [], conquistas: [], inicio: "2025-01-01", hoje: "2026-10-20" });
    expect(antigo.some((i) => i.novo === "disponivel")).toBe(false);
    expect(candidatasAnuncio(antigo).length).toBeGreaterThan(0);
  });
  it("recomendação do personal aparece primeiro no anúncio", () => {
    expect(candidatasAnuncio(album)[0].conteudo.id).toBe("d05");
  });
  it("cada descoberta explorada vira um acontecimento na linha do tempo, em ordem", () => {
    const ev = eventosDasDescobertas(album);
    expect(ev).toEqual([expect.objectContaining({ chave: "d:d02", tipo: "descoberta", data: "2026-10-10T15:00:00Z" })]);
    const juntos = juntarEventos([{ chave: "m:x", data: "2026-10-15T00:00:00Z", tipo: "medalha", titulo: "x", detalhe: null }], ev);
    expect(juntos.map((e) => e.chave)).toEqual(["m:x", "d:d02"]);
  });
});

describe("card para Stories", () => {
  it("quebra o texto e corta com reticências; sem dados pessoais", () => {
    const linhas = quebrar("uma frase bem comprida que não cabe numa linha só de jeito nenhum", 300, medir, 20, 400, 2);
    expect(linhas).toHaveLength(2);
    expect(linhas[1].endsWith("…")).toBe(true);
    const lay = layoutDescoberta(base[0], medir);
    expect(lay.selo.texto).toBe("MITO");
    expect(lay.linhas.every((l) => l.y < 1920 && l.x >= 0)).toBe(true);
    expect(lay.selo.fundo).toBe("#e5484d");
    expect(fraseCurta(base[0]).endsWith(".")).toBe(true);
  });

  it("explicação completa em todas as descobertas: nada cortado e tudo dentro do card", () => {
    for (const c of base) {
      const lay = layoutDescoberta(c, medir);
      const texto = lay.linhas.map((l) => l.texto).join(" ");
      expect(texto.includes("…")).toBe(false);
      // Todas as palavras da resposta e do “na prática” estão no card.
      for (const p of `${c.rapida} ${c.pratica}`.split(/\s+/).filter(Boolean)) expect(texto).toContain(p);
      expect(lay.linhas.every((l) => l.y <= 1920 - 40)).toBe(true);
      expect(lay.linhas.some((l) => l.texto === "A RESPOSTA")).toBe(true);
    }
  });
});

describe("analytics agregados", () => {
  it("conta exploradas, acerto, abertura de sugestões e separa correlação", () => {
    const a = analyticsDesbloqueia({
      conteudos: base,
      progresso: [
        ...["d01", "d02", "d03"].map((id) => ({ aluno_id: "A", conteudo_id: id, explorado_em: "2026-10-01", resposta: "mito", acertou: id !== "d03", salvo: id === "d01", origem: "biblioteca" })),
        { aluno_id: "B", conteudo_id: "d03", explorado_em: "2026-10-02", resposta: "verdade", acertou: false, salvo: false, origem: "personal" },
        { aluno_id: "X", conteudo_id: "d03", explorado_em: "2026-10-02", resposta: "verdade", acertou: false, salvo: false, origem: null },
      ],
      eventos: [{ aluno_id: "A", tipo: "sugestao_vista", modelo: "d03", origem: "treino" }, { aluno_id: "A", tipo: "sugestao_vista", modelo: "d07", origem: "treino" }, { aluno_id: "A", tipo: "sugestao_aberta", modelo: "d03", origem: "treino" }, { aluno_id: "A", tipo: "descoberta_compartilhada", modelo: "d01", origem: null }],
      alunosAtivos: ["A", "B", "C"],
      aderencia28: { A: 90, B: 50, C: null },
    });
    expect(a.alunosComDescoberta).toBe(2);
    expect(a.porConteudo.d03).toMatchObject({ explorados: 2, respostas: 2, acertoPct: 0, recomendados: 1 });
    expect(a.porConteudo.d01).toMatchObject({ salvos: 1, compartilhados: 1 });
    expect(a.taxaAberturaPct).toBe(50);
    expect(a.maisExplorados[0]).toBe("d03");
    expect(a.aderencia).toEqual({ engajados: 90, demais: 50, nEngajados: 1, nDemais: 1 });
  });
});

describe("validação de entrada", () => {
  it("toda a base pode ser editada pelo personal sem estourar limites", () => {
    for (const c of base) expect(conteudoConhecimentoSchema.safeParse(c).success, c.id).toBe(true);
  });
  it("rejeita resposta correta fora das alternativas e campos extras do aluno", () => {
    expect(conteudoConhecimentoSchema.safeParse({ ...base[0], correta: "depende" }).success).toBe(false);
    expect(explorarConhecimentoSchema.safeParse({ resposta: "mito", acertou: true }).success).toBe(false);
  });
  it("eventos do Desbloqueia aceitam o id da descoberta", () => {
    expect(eventoChalalaSchema.safeParse({ tipo: "quiz_respondido", modelo: "d03", origem: "album" }).success).toBe(true);
    expect(eventoChalalaSchema.safeParse({ tipo: "quiz_respondido", modelo: "<script>" }).success).toBe(false);
  });
});
