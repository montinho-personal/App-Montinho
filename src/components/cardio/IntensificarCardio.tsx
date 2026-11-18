// Montinho Cardio do aluno (18/11/2026, pedido do Montinho: “botão para intensificação de cardio”).
// Quem sobe a meta é só o personal. O aluno vê: (1) o aviso quando a meta foi intensificada
// (os troféus de meta voltam a valer) e (2) com a meta da semana batida, o convite para pedir
// ao Montinho que intensifique (WhatsApp). O personal no app como aluno vai direto ao painel.
import { BRAND } from "@/config/brand";
import { somarDias } from "@/lib/aderencia/calcular";
import type { NivelCardio, SemanaCardio } from "@/lib/cardio/regras";

const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export function IntensificarCardio({ nivel, semana, hoje, alunoId, comoPersonal = false, visitante = false }: { nivel: NivelCardio | null; semana: SemanaCardio | null; hoje: string; alunoId: string; comoPersonal?: boolean; visitante?: boolean }) {
  // Intensificado há até 14 dias: aviso da meta nova.
  if (nivel && nivel.nivel > 1 && nivel.subiuEm && nivel.subiuEm >= somarDias(hoje, -13)) {
    const comeca = nivel.desde > hoje;
    return (
      <section className="space-y-1 rounded-xl border border-accent/50 bg-accent/10 p-3 text-sm">
        <p className="font-bold">🔥 Seu cardio foi intensificado!</p>
        <p>
          Meta nova: <strong>{nivel.alvoMin} min por semana</strong>
          {nivel.anteriorMin ? <> (antes {nivel.anteriorMin} min)</> : null}.
        </p>
        <p className="text-fg-muted">
          🏆 Os troféus de meta voltam a valer{comeca ? <> a partir de segunda, {ddmm(nivel.desde)}</> : null}: Semana no Ritmo, 100% no Plano, Fôlego de Ferro e Uma Hora de Chalalá. Cada um conta de novo no ranking.
        </p>
      </section>
    );
  }
  if (visitante || !semana || semana.status !== "cumprida") return null;
  const href = comoPersonal
    ? `/api/meu-treino?sair=1&para=/treinador/alunos/${alunoId}/cardio`
    : `https://wa.me/${BRAND.contact.whatsapp}?text=${encodeURIComponent(`Oi, Montinho! Bati a meta de cardio da semana (${semana.minutos} de ${semana.alvoMin} min) e quero intensificar! 🔥 [APP-CARDIO]`)}`;
  return (
    <section className="space-y-2 rounded-xl border border-border p-3 text-sm">
      <p className="font-bold">🔥 Pronto para o próximo nível?</p>
      <p className="text-fg-muted">Meta batida! Quando o Montinho intensifica o seu cardio, os troféus de meta voltam a valer na meta nova.</p>
      <a href={href} target={comoPersonal ? undefined : "_blank"} rel="noreferrer" className="alvo flex w-full items-center justify-center rounded-xl bg-accent px-3 py-3 font-bold text-bg">
        {comoPersonal ? "🔥 Intensificar no painel" : "💬 Pedir para intensificar meu cardio"}
      </a>
    </section>
  );
}
