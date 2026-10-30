// Oferta dos planos no celular (0131, Fase 2): depois de um treino concluído
// sem dor, agenda 1 aviso para o dia seguinte (o banco limita: visitante 1 a
// cada 7 dias, aluno 1 a cada 14). O texto usa o motivo do momento (carga
// parada, renovação, pouco tempo, dias do visitante). Sem a 0131, só não agenda.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { getAluno } from "@/lib/db";
import { contextoOferta } from "@/lib/data/ofertas";
import { textoDaOferta } from "@/lib/ofertas/regras";

export async function agendarOfertaCelular(alunoId: string): Promise<void> {
  if (isDemoMode()) return;
  const aluno = await getAluno(alunoId);
  // A ficha do próprio personal (“Meu treino”) não recebe oferta.
  if (!aluno || aluno.profile?.role === "treinador") return;
  const ctx = await contextoOferta(alunoId);
  if (!ctx || ctx.dor || !ctx.ofertas.length) return;
  const semana = Math.floor(Date.now() / (7 * 86_400_000));
  const oferta = ctx.ofertas.find((o) => o.id === ctx.motivo?.oferta) ?? ctx.ofertas[semana % ctx.ofertas.length];
  const t = ctx.motivo?.oferta === oferta.id ? { titulo: ctx.motivo.titulo, texto: ctx.motivo.texto } : textoDaOferta(oferta, { publico: ctx.publico, nome: ctx.nome, treinos: ctx.treinos });
  const db = await getDb();
  await db.rpc("agendar_oferta", { p_aluno: alunoId, p_oferta: oferta.id, p_titulo: t.titulo, p_corpo: t.texto });
}
