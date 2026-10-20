"use client";

// Preferências da Tabela de Volume do treinador (regra das técnicas avançadas
// e ajuste por RIR), lembradas neste navegador e iguais em todas as telas.

import { useCallback, useEffect, useState } from "react";
import type { RegraTecnicas } from "@/lib/volume/tecnicas";

const CHAVE_REGRA = "montinho:regraTecnicas";
const CHAVE_RIR = "montinho:ajustarPorRir";

export function usePreferenciasVolume() {
  const [regraTecnicas, setRegra] = useState<RegraTecnicas>("moderada");
  const [ajustarPorRir, setRir] = useState(false);

  useEffect(() => {
    try {
      const r = localStorage.getItem(CHAVE_REGRA);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preferência local só existe no navegador
      if (r === "classica" || r === "moderada" || r === "alta") setRegra(r);
      if (localStorage.getItem(CHAVE_RIR) === "1") setRir(true);
    } catch {
      /* sem armazenamento local: fica o padrão */
    }
  }, []);

  const setRegraTecnicas = useCallback((v: RegraTecnicas) => {
    setRegra(v);
    try {
      localStorage.setItem(CHAVE_REGRA, v);
    } catch {}
  }, []);

  const setAjustarPorRir = useCallback((v: boolean) => {
    setRir(v);
    try {
      localStorage.setItem(CHAVE_RIR, v ? "1" : "0");
    } catch {}
  }, []);

  return { regraTecnicas, setRegraTecnicas, ajustarPorRir, setAjustarPorRir };
}
