"use client";

// Marca a conquista “Primeiro relatório consultado” (uma vez por aparelho;
// o servidor ignora repetições).
import { useEffect } from "react";

export function RegistrarRelatorio() {
  useEffect(() => {
    try {
      if (localStorage.getItem("montinho:relatorioVisto")) return;
    } catch {
      // sem armazenamento: envia mesmo assim (idempotente)
    }
    void fetch("/api/conquistas/relatorio", { method: "POST" })
      .then((r) => {
        if (r.ok) localStorage.setItem("montinho:relatorioVisto", "1");
      })
      .catch(() => undefined);
  }, []);
  return null;
}
