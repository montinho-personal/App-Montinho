import { describe, expect, it } from "vitest";
import { mensagemTreinoAberto } from "./mensagem";

describe("notificação de treino em aberto", () => {
  it("mostra o treino, o progresso e leva direto ao treino em andamento", () => {
    const m = mensagemTreinoAberto({ sessao_id: "s1", treino_id: "t1", nome_treino: "Treino B — Costas", series_feitas: 12, series_planejadas: 20 });
    expect(m.titulo).toBe("Treino B — Costas ainda está em aberto");
    expect(m.corpo).toBe("Você registrou 12 de 20 séries. Toque para conferir e finalizar.");
    expect(m.url).toBe("/aluno/treino/t1?sessao=s1");
    expect(m.tag).toBe("treino-aberto-s1");
  });

  it("sem nome nem treino ainda funciona", () => {
    const m = mensagemTreinoAberto({ sessao_id: "s2", treino_id: null, nome_treino: null, series_feitas: 0, series_planejadas: 0 });
    expect(m.titulo).toBe("Seu treino ainda está em aberto");
    expect(m.corpo).toBe("Toque para conferir e finalizar.");
    // Sem treino de origem = treino livre (a tela manda para o início se não for).
    expect(m.url).toBe("/aluno/livre/s2");
  });
});
