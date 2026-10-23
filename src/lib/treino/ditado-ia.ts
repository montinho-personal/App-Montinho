// Converte o resultado do ditado inteligente (IA) para o mesmo formato do
// leitor sem IA (TreinoDitado), para a prévia funcionar igual. As opções de
// troca de cada linha vêm do leitor sem IA (busca por nome/sinônimo). PURO.
import type { ItemBiblioteca } from "@/lib/biblioteca/tipos";
import type { Tecnica } from "@/lib/volume/calcular";
import { interpretarDitado, type ExercicioDitado, type TreinoDitado } from "./ditado";
import type { ResultadoInterpretacao } from "@/lib/ia/interpretar-treino";

export function ditadoDaIA(res: ResultadoInterpretacao, itens: ItemBiblioteca[], opcoes: { favoritos?: Set<string>; uso?: Map<string, number> } = {}): TreinoDitado {
  const porId = new Map(itens.map((i) => [i.id, i]));
  const exercicios: ExercicioDitado[] = res.treinos.flatMap((t) =>
    t.exercicios.map((e) => {
      const escolhido = e.bibliotecaId ? porId.get(e.bibliotecaId) ?? null : null;
      const busca = interpretarDitado(e.nomeLivre ?? e.falado, itens, opcoes).exercicios.flatMap((x) => x.candidatos);
      const candidatos = [...(escolhido ? [escolhido] : []), ...busca.filter((c) => c.id !== escolhido?.id)].slice(0, 8);
      return {
        falado: e.falado,
        escolhido: escolhido ?? candidatos[0] ?? null,
        candidatos: candidatos.length ? candidatos : escolhido ? [escolhido] : [],
        confianca: escolhido ? "alta" : "confira",
        series: e.series,
        reps: e.reps,
        descansoSeg: e.descansoSeg,
        metodo: (e.metodo === "normal" ? null : e.metodo) as Tecnica | null,
        bloco: e.bloco,
      };
    })
  );
  return { exercicios, metodoGeral: (res.metodoGeral === "normal" ? null : res.metodoGeral) as Tecnica | null, naoEntendido: [] };
}
