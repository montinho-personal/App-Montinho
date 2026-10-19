// Painel de operação / fila do Vitor: quem precisa de contato, cobrança ou atenção.
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isMockMode, listAlunos } from "@/lib/db";

const MS_DIA = 24 * 60 * 60 * 1000;

function diasDesde(iso?: string | null) {
  if (!iso) return 999;
  return Math.floor((Date.now() - new Date(iso).getTime()) / MS_DIA);
}

function diasAteData(iso?: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / MS_DIA);
}

export async function getPainelSuporte() {
  const alunos = await listAlunos();

  if (isMockMode) {
    return {
      semContato: alunos.filter((a) => diasDesde(a.updated_at) > 15),
      inativos: alunos.filter((a) => a.status === "ativo" && diasDesde(a.ultimo_treino_em) > 5),
      treinouHojeOntem: alunos.filter((a) => diasDesde(a.ultimo_treino_em) <= 1),
      venceEm7Dias: alunos.filter((a) => {
        const dias = diasAteData(a.acesso_ate);
        return dias !== null && dias >= 0 && dias <= 7;
      }),
      checkinBaixo: [] as unknown[],
      solicitacoesVencidas: [] as unknown[],
    };
  }

  const db = createSupabaseAdminClient();
  const hoje = new Date().toISOString().slice(0, 10);
  const seteDias = new Date(Date.now() - 7 * MS_DIA).toISOString().slice(0, 10);

  const [{ data: checkins }, { data: solicitacoes }, { data: mensagens }] = await Promise.all([
    db.from("check_ins").select("*, aluno:alunos(profile:profiles(nome))").gte("data", seteDias),
    db
      .from("solicitacoes")
      .select("*, aluno:alunos(profile:profiles(nome))")
      .eq("ativo", true)
      .lte("proxima_em", hoje),
    db.from("mensagens").select("aluno_id, created_at").order("created_at", { ascending: false }),
  ]);

  const ultimoContato = new Map<string, string>();
  for (const msg of mensagens ?? []) {
    if (!ultimoContato.has(msg.aluno_id)) ultimoContato.set(msg.aluno_id, msg.created_at);
  }

  return {
    semContato: alunos.filter((a) => diasDesde(ultimoContato.get(a.id)) > 15),
    inativos: alunos.filter((a) => a.status === "ativo" && diasDesde(a.ultimo_treino_em) > 5),
    treinouHojeOntem: alunos.filter((a) => diasDesde(a.ultimo_treino_em) <= 1),
    venceEm7Dias: alunos.filter((a) => {
      const dias = diasAteData(a.acesso_ate);
      return dias !== null && dias >= 0 && dias <= 7;
    }),
    checkinBaixo: (checkins ?? []).filter(
      (c) => Math.min(c.energia ?? 10, c.sono ?? 10, c.motivacao ?? 10) <= 4 || (c.dor ?? 0) >= 7
    ),
    solicitacoesVencidas: solicitacoes ?? [],
  };
}
