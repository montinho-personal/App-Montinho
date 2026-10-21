import { describe, expect, it } from "vitest";
import { BOM_DIA, POS_TREINO, agruparPorEnvio, mensagemChalala, proximaMensagemBomDia, topicoDoEnvio } from "./chalala";

describe("Chalalá no celular — textos", () => {
  it("Bom Dia alterna as 5 mensagens sem repetir em dias seguidos", () => {
    const seq = [null, 1, 2, 3, 4, 5].map(proximaMensagemBomDia);
    expect(seq).toEqual([1, 2, 3, 4, 5, 1]);
    for (let i = 1; i < seq.length; i++) expect(seq[i]).not.toBe(seq[i - 1]);
    expect(BOM_DIA).toHaveLength(5);
  });

  it("textos oficiais, sem cobrança nem prescrição", () => {
    expect(BOM_DIA[2].titulo).toBe("Bom dia, meu povo!");
    expect(BOM_DIA[4].corpo).toContain("É impossível dar errado!");
    expect(POS_TREINO.titulo).toBe("Seu corpo também merece um Chalalá!");
    const tudo = [...BOM_DIA.flatMap((m) => [m.titulo, m.corpo]), POS_TREINO.titulo, POS_TREINO.corpo].join(" ").toLowerCase();
    for (const proibido of ["suplement", "whey", "gramas", " g de ", "obrigat", "você precisa", "não esqueça", "culpa", "falhou"]) expect(tudo).not.toContain(proibido);
    expect(tudo).toContain("chalalá");
  });

  it("monta a notificação: abre o histórico com o texto completo e registra a abertura", () => {
    const m = mensagemChalala({ envio_id: "a1b2-c3", categoria: "bom_dia", mensagem: 3 });
    expect(m).toMatchObject({ id: "a1b2-c3", titulo: "Bom dia, meu povo!", url: "/aluno/notificacoes?n=a1b2-c3", tag: "chalala-bom_dia" });
    expect(mensagemChalala({ envio_id: "x", categoria: "pos_treino", mensagem: null }).titulo).toBe(POS_TREINO.titulo);
    expect(mensagemChalala({ envio_id: "x", categoria: "teste", mensagem: null }, { treinador: true }).url).toBe("/treinador/conquistas");
    expect(mensagemChalala({ envio_id: "x", categoria: "bom_dia", mensagem: 99 }).titulo).toBeTruthy();
  });

  it("agrupa os aparelhos de cada envio (vários celulares, sem repetir aparelho)", () => {
    const g = agruparPorEnvio([
      { envio_id: "e1", categoria: "pos_treino", mensagem: null, endpoint: "https://a", p256dh: "k", auth: "x" },
      { envio_id: "e1", categoria: "pos_treino", mensagem: null, endpoint: "https://b", p256dh: "k", auth: "x" },
      { envio_id: "e1", categoria: "pos_treino", mensagem: null, endpoint: "https://b", p256dh: "k", auth: "x" },
      { envio_id: "e2", categoria: "bom_dia", mensagem: 1, endpoint: "https://c", p256dh: "k", auth: "x" },
    ]);
    expect(g.map((x) => [x.envio_id, x.aparelhos.length])).toEqual([["e1", 2], ["e2", 1]]);
  });

  it("topic do push: só letras e números, até 32", () => {
    expect(topicoDoEnvio("9f1c2d3e-4b5a-6789-abcd-ef0123456789")).toBe("9f1c2d3e4b5a6789abcdef0123456789");
  });
});
