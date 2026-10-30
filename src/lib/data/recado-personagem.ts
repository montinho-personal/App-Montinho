// Recado do personagem do dia no 🔔 (regra pura em src/lib/notificacoes/personagens.ts).
// Lê pelo login do próprio aluno; o sino pede no máximo 1× por dia por aparelho.
import { getAluno } from "@/lib/db";
import { getPlanoAtivo } from "@/lib/data/programas";
import { progressoCardio } from "@/lib/data/cardio";
import { sincronizarConquistas, totalQuizPublicado } from "@/lib/data/conquistas";
import { dataLocal, inicioDaSemana, somarDias } from "@/lib/aderencia/calcular";
import { contaCarimbo } from "@/lib/conquistas/carimbos";
import { lembreteDoAlcance, trofeusNosProximosDias } from "@/lib/conquistas/ao-alcance";
import { tecnicasFeitas } from "@/lib/conquistas/regras";
import { vitrineDeMedalhas } from "@/lib/conquistas/vitrine";
import { recadoDoPersonagem, type RecadoPersonagem } from "@/lib/notificacoes/personagens";
import { contextoOferta } from "@/lib/data/ofertas";
import { textoDaOferta } from "@/lib/ofertas/regras";

export async function recadoPersonagemDoAluno(alunoId: string, opts: { semOferta?: boolean } = {}): Promise<RecadoPersonagem | null> {
  const aluno = await getAluno(alunoId);
  if (!aluno) return null;
  const [{ todas, sessoes, aderencia }, plano, cardio] = await Promise.all([sincronizarConquistas(aluno), getPlanoAtivo(aluno.id).catch(() => null), progressoCardio(aluno.id).catch(() => null)]);
  const hoje = dataLocal(new Date());
  const semana = inicioDaSemana(hoje);
  const doisDias = somarDias(hoje, -2);
  const dorRecente = sessoes.some((s) => dataLocal(s.iniciado_em) >= doisDias && (s.feedback_percepcao === "dor" || s.checkin_pre === "desconforto"));
  const medalhas = vitrineDeMedalhas({ conquistas: todas, sessoes, aderencia, hoje, cardio, extras: { quizTotal: await totalQuizPublicado().catch(() => 0) } });
  const itens = trofeusNosProximosDias({ medalhas, aderencia, hoje, cardio, tecnicasFeitas: new Set(tecnicasFeitas(sessoes).map((t) => t.familia)), treinos: (plano?.treinos ?? []).map((t) => ({ letra: t.letra, exercicios: t.exercicios })) });
  const perto = lembreteDoAlcance(itens);
  const item = perto ? itens.find((i) => i.codigo === perto.codigo) : null;
  const passada = aderencia.semanas.find((w) => w.inicio === somarDias(semana, -7));
  // Oferta dos planos (só entra se nenhum outro personagem tiver recado).
  const ctx = opts.semOferta ? null : await contextoOferta(alunoId).catch(() => null);
  const of = ctx && !ctx.dor && ctx.ofertas.length ? (ctx.ofertas.find((o) => o.id === ctx.motivo?.oferta) ?? ctx.ofertas[0]) : null;
  let oferta: { titulo: string; fala: string } | null = null;
  if (of && ctx) {
    const t = textoDaOferta(of, { publico: ctx.publico, nome: ctx.nome, treinos: ctx.treinos });
    oferta = ctx.motivo?.oferta === of.id ? { titulo: ctx.motivo.titulo, fala: ctx.motivo.texto } : { titulo: t.titulo, fala: t.texto };
  }
  return recadoDoPersonagem({
    hoje,
    inicioSemana: semana,
    diasTreinos: sessoes.filter(contaCarimbo).map((s) => dataLocal(s.iniciado_em)).sort(),
    dorRecente,
    semanaPassadaCumprida: passada?.status === "cumprida",
    semanasSeguidas: aderencia.sequencia.atual,
    oferta,
    alcance: perto && item ? { titulo: item.titulo, corpo: item.oQueFazer, url: perto.url } : null,
  });
}
