"use client";

import { useEffect } from "react";
import { arquivosDaPagina, CACHE_ESTATICOS, CACHE_PAGINAS, precisaSalvar } from "@/lib/offline/paginas";

const CHAVE = "montinho-offline-salvo";

/**
 * Deixa os treinos do aluno guardados no celular para abrir sem internet.
 * Com internet, registra o service worker (public/sw.js) e, de tempos em
 * tempos, salva a tela de cada treino e os arquivos que ela usa.
 */
export function GuardarTreinosOffline({ urls }: { urls: string[] }) {
  const chave = urls.join("|");
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("caches" in window)) return;
    let cancelado = false;
    const salvar = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (!navigator.onLine) return;
        let anterior: { em: number; chave: string } | null = null;
        try {
          anterior = JSON.parse(localStorage.getItem(CHAVE) ?? "null");
        } catch {
          anterior = null;
        }
        if (!precisaSalvar(anterior, chave, Date.now())) return;
        const paginas = await caches.open(CACHE_PAGINAS);
        const estaticos = await caches.open(CACHE_ESTATICOS);
        for (const url of chave.split("|").filter(Boolean)) {
          if (cancelado) return;
          const res = await fetch(url, { credentials: "same-origin" }).catch(() => null);
          if (!res || !res.ok || res.redirected) continue;
          const html = await res.clone().text();
          await paginas.put(url, res);
          for (const arq of arquivosDaPagina(html)) {
            if (!(await estaticos.match(arq))) await estaticos.add(arq).catch(() => undefined);
          }
        }
        try {
          localStorage.setItem(CHAVE, JSON.stringify({ em: Date.now(), chave }));
        } catch {
          // sem espaço: tenta de novo na próxima visita
        }
      } catch {
        // navegador sem suporte ou modo privado: o app segue normal, só sem a cópia
      }
    };
    // Espera a tela terminar de carregar para não disputar a internet com ela.
    const id = window.setTimeout(() => void salvar(), 4000);
    return () => {
      cancelado = true;
      window.clearTimeout(id);
    };
  }, [chave]);
  return null;
}
