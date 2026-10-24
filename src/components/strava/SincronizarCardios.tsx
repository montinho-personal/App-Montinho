"use client";

// Busca os cardios novos no Strava em segundo plano (o servidor limita a 1×/hora)
// e atualiza a tela se entrou algum. Sem Strava conectado, não faz nada.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function SincronizarCardios() {
  const router = useRouter();
  useEffect(() => {
    let vivo = true;
    void fetch("/api/strava/cardios", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { novos?: number } | null) => {
        if (vivo && j?.novos) router.refresh();
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [router]);
  return null;
}
