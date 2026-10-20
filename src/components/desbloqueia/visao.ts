// Formato enxuto (serializável) de um item do álbum para os componentes do cliente.
import type { ItemAlbum } from "@/lib/desbloqueia/motor";
import { nomeDaConquista } from "@/lib/conquistas/conteudo";

export type ItemVisao = {
  id: string;
  numero: number;
  categoria: string;
  titulo: string;
  pergunta: string;
  estado: ItemAlbum["estado"];
  novo: ItemAlbum["novo"];
  salvo: boolean;
  essencial: boolean;
  origem: ItemAlbum["origem"];
  /** Como esta descoberta se desbloqueia (para os itens ainda futuros). */
  dica: string;
};

export function paraVisao(i: ItemAlbum): ItemVisao {
  const c = i.conteudo;
  const medalhas = [...new Set(c.gatilhos.conquistas.map((k) => nomeDaConquista(k)))];
  const dica = medalhas.length ? `Desbloqueia com a medalha ${medalhas.join(" ou ")} — ou com o tempo de acompanhamento.` : "Desbloqueia com o tempo de acompanhamento ou por recomendação do Montinho.";
  return { id: c.id, numero: c.numero, categoria: c.categoria, titulo: c.titulo, pergunta: c.pergunta, estado: i.estado, novo: i.novo, salvo: i.salvo, essencial: !!c.essencial, origem: i.origem, dica };
}
