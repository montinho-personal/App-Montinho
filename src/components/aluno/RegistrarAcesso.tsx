"use client";

// Conta o acesso do dia (0072): no máximo 1 chamada por dia neste aparelho.
import { useEffect } from "react";
import { diaBrasilia } from "@/lib/acessos/contar";

export function RegistrarAcesso({ id }: { id: string }) {
  useEffect(() => {
    const chave = `montinho:acesso:${diaBrasilia()}:${id}`;
    try {
      if (localStorage.getItem(chave)) return;
    } catch {}
    fetch("/api/acesso", { method: "POST" })
      .then((r) => {
        if (!r.ok) return;
        try {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k?.startsWith("montinho:acesso:") && k.endsWith(`:${id}`) && k !== chave) localStorage.removeItem(k);
          }
          localStorage.setItem(chave, "1");
        } catch {}
      })
      .catch(() => {});
  }, [id]);
  return null;
}
