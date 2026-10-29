"use client";

// Troféus da tribo ganhos (inclusive enquanto o aluno estava fora do app):
// comemora com a MESMA animação das medalhas, um por vez (até 6 por visita;
// o resto na próxima), e marca como visto. Compartilhar usa o card da tribo.
import { useState } from "react";
import { CelebracaoMedalha, type ConquistaCelebravel } from "@/components/chalala/CelebracaoMedalha";
import { useMontado } from "@/lib/ui/montado";
import { cardDaTribo, motivoDaTribo, nomeDaConquistaTribo, type ConquistaTribo, type MarcoTribo } from "@/lib/tribo/regras";

const CHAMADA: Record<ConquistaTribo["metodo"], string> = {
  participacao: "fez parte de uma conquista da Tribo!",
  recuperacao: "recuperou uma conquista histórica da Tribo!",
  missao: "ajudou a Tribo a cumprir uma missão!",
};

export function CelebrarTribo({ conquistas, nome, marcos }: { conquistas: ConquistaTribo[]; nome: string; marcos?: MarcoTribo[] }) {
  const [abertas, setAbertas] = useState(conquistas.slice(0, 6));
  const montado = useMontado();
  if (!montado || !abertas.length) return null;
  const lista: ConquistaCelebravel[] = abertas.map((c) => ({
    codigo: c.codigo as ConquistaCelebravel["codigo"],
    titulo: nomeDaConquistaTribo(c, marcos),
    descricao: motivoDaTribo(c),
    conquistado_em: c.conquistado_em,
    dados: c.dados as ConquistaCelebravel["dados"],
    card: cardDaTribo(c, nome, marcos),
    chamada: CHAMADA[c.metodo],
  }));
  const fechar = () => {
    fetch("/api/tribo/vistas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: abertas.map((c) => c.id) }) }).catch(() => undefined);
    setAbertas([]);
  };
  return <CelebracaoMedalha conquistas={lista} nome={nome} onFechar={fechar} />;
}
