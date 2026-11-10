// O que mudou no protocolo do aluno (pedido do Montinho, 10/11/2026). Lê as
// duas últimas versões salvas (programa_versoes; o aluno lê só as dele pela
// RLS) e monta o aviso pela regra pura de src/lib/protocolo/mudanca.ts.
import { isDemoMode } from "@/lib/env";
import { listVersoes } from "@/lib/data/programas";
import { inscricoesPushDoAluno } from "@/lib/data/conquistas";
import { configurarVapid, enviarAosAparelhos } from "@/lib/push/enviar";
import { avisoDoProtocolo, mudancasDoProtocolo, type AvisoProtocolo, type MudancaProtocolo, type SnapProtocolo } from "@/lib/protocolo/mudanca";

/** Por quantos dias o aviso continua valendo (no Início e no 🔔). */
export const DIAS_AVISO_PROTOCOLO = 14;

export type MudancaRecente = { versaoId: string; salvoEm: string; mudanca: MudancaProtocolo; aviso: AvisoProtocolo };

/** `meuLogin`: versão salva pela própria pessoa (visitante montando o treino, personal no Meu treino) não vira aviso. */
export async function mudancaRecenteDoProtocolo(alunoId: string, meuLogin?: string | null): Promise<MudancaRecente | null> {
  const [atual, anterior] = await listVersoes(alunoId, 2);
  if (!atual || !anterior) return null;
  if (meuLogin && atual.autor_id === meuLogin) return null;
  if (Date.now() - Date.parse(atual.created_at) > DIAS_AVISO_PROTOCOLO * 86_400_000) return null;
  const mudanca = mudancasDoProtocolo(anterior.snapshot as unknown as SnapProtocolo, atual.snapshot as unknown as SnapProtocolo);
  if (!mudanca?.relevante) return null;
  return { versaoId: atual.id, salvoEm: atual.created_at, mudanca, aviso: avisoDoProtocolo(mudanca, atual.created_at) };
}

/**
 * Aviso no celular quando o personal salva uma MUDANÇA GRANDE (fase nova, dia
 * novo ou que saiu). Troca só de exercício fica no Início e no 🔔, sem push
 * (o personal costuma salvar várias vezes enquanto ajusta).
 */
export async function avisarMudancaProtocolo(alunoId: string): Promise<number> {
  if (isDemoMode() || !configurarVapid()) return 0;
  const m = await mudancaRecenteDoProtocolo(alunoId).catch(() => null);
  if (!m || !(m.mudanca.mudouFase || m.mudanca.diasNovos.length || m.mudanca.diasQueSairam.length)) return 0;
  const aparelhos = await inscricoesPushDoAluno(alunoId).catch(() => []);
  const tag = m.mudanca.mudouFase ? `protocolo-fase-${m.mudanca.faseDepois}` : `protocolo-${m.versaoId}`;
  const res = await enviarAosAparelhos(aparelhos, { titulo: m.aviso.push.titulo, corpo: m.aviso.push.corpo, url: "/aluno", tag }, { ttl: 2 * 86_400 });
  return res.ok;
}
