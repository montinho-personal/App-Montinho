// Lembrete no celular do troféu que está perto (0104). Calculado ao fim de cada
// treino ou cardio, com as mesmas regras da lista “Troféus ao alcance”; o banco
// troca o aviso pendente e limita a 3 por semana. Sem o 0104, só não agenda.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { dataLocal } from "@/lib/aderencia/calcular";
import { getPlanoAtivo } from "@/lib/data/programas";
import { progressoCardio } from "@/lib/data/cardio";
import { sincronizarConquistas, totalQuizPublicado } from "@/lib/data/conquistas";
import { lembreteDoAlcance, trofeusNosProximosDias } from "@/lib/conquistas/ao-alcance";
import { tecnicasFeitas } from "@/lib/conquistas/regras";
import { vitrineDeMedalhas } from "@/lib/conquistas/vitrine";
import type { AlunoBase } from "@/lib/data/conquistas";

export async function agendarLembreteTrofeu(aluno: AlunoBase): Promise<void> {
  if (isDemoMode()) return;
  const [{ todas, sessoes, aderencia }, plano, cardio] = await Promise.all([sincronizarConquistas(aluno), getPlanoAtivo(aluno.id).catch(() => null), progressoCardio(aluno.id).catch(() => null)]);
  const hoje = dataLocal(new Date());
  const medalhas = vitrineDeMedalhas({ conquistas: todas, sessoes, aderencia, hoje, cardio, extras: { quizTotal: await totalQuizPublicado() } });
  const itens = trofeusNosProximosDias({ medalhas, aderencia, hoje, cardio, tecnicasFeitas: new Set(tecnicasFeitas(sessoes).map((t) => t.familia)), treinos: (plano?.treinos ?? []).map((t) => ({ letra: t.letra, exercicios: t.exercicios })) });
  const l = lembreteDoAlcance(itens);
  const db = await getDb();
  // Sem troféu perto: chama sem código para descartar o lembrete antigo.
  await db.rpc("agendar_lembrete_trofeu", { p_aluno: aluno.id, p_codigo: l?.codigo ?? null, p_titulo: l?.titulo ?? null, p_corpo: l?.corpo ?? null, p_url: l?.url ?? null });
}
