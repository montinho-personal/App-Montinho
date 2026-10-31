import { describe, expect, it } from "vitest";
import { cardRecordeBenchmark, cardRecordeForca } from "./card-recorde";
import { recordesDeBenchmark, recordesDeForca } from "./recordes";

describe("card Novo recorde pessoal", () => {
  it("força: RM exato, antes → agora, só o primeiro nome", () => {
    const [r] = recordesDeForca([
      { chave: "a", nome: "Agachamento livre", data: "2026-10-01", carga: 80, reps: 5 },
      { chave: "a", nome: "Agachamento livre", data: "2026-10-20", carga: 85, reps: 5 },
    ]);
    const c = cardRecordeForca(r, "Aline de Souza");
    expect(c.destaque).toBe("85 kg · 5RM");
    expect(c.porque).toContain("+5 kg");
    expect(c.nome).toBe("Aline");
    expect(c.data).toBe("20/10/2026");
    expect(c.legenda).toContain("@montinho_personal");
  });
  it("benchmark: condição no texto e diferença quando melhorou", () => {
    const [b] = recordesDeBenchmark([
      { bloco_id: "x", tipo: "metcon", formato: "for_time", condicao: "rx", concluido: true, tempo_seg: 400, benchmark: "fran", data: "2026-10-01" },
      { bloco_id: "x", tipo: "metcon", formato: "for_time", condicao: "rx", concluido: true, tempo_seg: 360, benchmark: "fran", data: "2026-10-20" },
    ]);
    const c = cardRecordeBenchmark(b, "Fran", "João Pedro");
    expect(c.frase).toBe("Fran · RX");
    expect(c.destaque).toBe("6:00");
    expect(c.porque).toContain("−0:40");
  });
});
