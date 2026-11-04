// “＋ Exercício extra” no treino da ficha (pedido do Montinho, 04/11/2026).
// Entra uma linha nova em session_exercises (pela RLS de sempre: só na própria
// sessão em andamento), sem vínculo com o plano. Regras em src/lib/treino/exercicio-extra.ts.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore, uid } from "@/lib/mock/store";
import { normalizarNome } from "@/lib/grupos";
import { getSessao } from "./sessoes";
import type { ItemBiblioteca } from "@/lib/biblioteca/tipos";
import type { SessionExercise } from "@/lib/supabase/types-sessoes";
import type { VideoSource } from "@/lib/video";
import { ehSessaoLivre } from "@/lib/treino/livre";
import { extrasQueCabem, prescricaoExtra, PADRAO_EXERCICIO_EXTRA } from "@/lib/treino/exercicio-extra";

export async function adicionarExercicioExtra(alunoId: string, sessionId: string, input: { clientKey: string; item: ItemBiblioteca }): Promise<SessionExercise> {
  const s = await getSessao(alunoId, sessionId);
  const item = input.item;
  const prescricao = prescricaoExtra({
    video: item.midia?.verificada ? ({ provider: item.midia.provider, id: item.midia.id } as VideoSource) : null,
    instrucoes: item.execucao ?? [],
    equipamento: (item.equipamento ?? []) as string[],
  });
  const chave = `extra:${input.clientKey}`;
  const novo: SessionExercise = {
    id: uid(),
    session_id: sessionId,
    exercicio_id: null,
    biblioteca_id: item.id.startsWith("cat-") ? null : item.id,
    client_key: chave,
    ordem: (s?.exercicios.reduce((m, e) => Math.max(m, e.ordem ?? 0), 0) ?? 0) + 1,
    nome: item.nome,
    nome_normalizado: normalizarNome(item.nome),
    grupo_muscular: item.grupo ?? null,
    series_planejadas: PADRAO_EXERCICIO_EXTRA.series,
    prescricao,
    status: "pendente",
    observacao_aluno: null,
    created_at: new Date().toISOString(),
  } as SessionExercise;
  // Demo: a sessão pode viver na memória de outra instância do servidor; segue sem gravar.
  if (!s && isDemoMode()) return novo;
  if (!s) throw new Error("Treino não encontrado");
  if (s.status !== "em_andamento") throw new Error("Este treino já foi finalizado");
  if (ehSessaoLivre(s)) throw new Error("No treino livre, escolha o exercício pelo botão de adicionar");
  const repetido = s.exercicios.find((e) => e.client_key === chave);
  if (repetido) return repetido;
  if (!extrasQueCabem(s.exercicios)) throw new Error("Limite de exercícios extras neste treino");
  if (isDemoMode()) {
    demoStore().sessionExercises.push(novo);
    return novo;
  }
  const db = await getDb();
  const { id: _i, created_at: _c, nome_normalizado: _n, ...linha } = novo as SessionExercise & { nome_normalizado?: string };
  void _i; void _c; void _n;
  const { data, error } = await db.from("session_exercises").insert(linha).select("*").single();
  if (error) throw new Error(`Não foi possível adicionar o exercício: ${error.message}`);
  return data as SessionExercise;
}
