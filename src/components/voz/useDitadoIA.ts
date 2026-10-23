"use client";

// Ditado inteligente: manda a fala para a IA organizar (api/ia/ditado) e
// guarda o resultado da última fala organizada. Se a IA não estiver ligada,
// `disponivel` vira false e a tela segue só com o leitor sem IA.
import { useCallback, useRef, useState } from "react";
import type { ResultadoInterpretacao } from "@/lib/ia/interpretar-treino";

export function useDitadoIA() {
  const [estado, setEstado] = useState<{ fala: string; resultado: ResultadoInterpretacao | null; lendo: boolean; falhou: boolean }>({ fala: "", resultado: null, lendo: false, falhou: false });
  const [disponivel, setDisponivel] = useState(true);
  const ultima = useRef("");

  const organizar = useCallback(async (fala: string) => {
    const f = fala.trim();
    if (f.length < 3 || f === ultima.current) return;
    ultima.current = f;
    setEstado((s) => ({ ...s, lendo: true, falhou: false }));
    const r = await fetch("/api/ia/ditado", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fala: f.slice(0, 4000) }) }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { ia?: boolean; resultado?: ResultadoInterpretacao | null } | null;
    if (j && j.ia === false) {
      setDisponivel(false);
      setEstado({ fala: f, resultado: null, lendo: false, falhou: false });
      return;
    }
    if (ultima.current !== f) return; // chegou uma fala mais nova
    setEstado({ fala: f, resultado: j?.resultado ?? null, lendo: false, falhou: !j?.resultado });
  }, []);

  /** Resultado só vale para a mesma fala que foi organizada. */
  const resultadoPara = (fala: string) => (estado.fala === fala.trim() ? estado.resultado : null);
  return { disponivel, lendo: estado.lendo, falhou: estado.falhou && estado.fala !== "", organizar, resultadoPara, organizada: estado.fala };
}
