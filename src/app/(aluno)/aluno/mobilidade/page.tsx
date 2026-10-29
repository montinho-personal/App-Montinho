// Mobilidade e alongamento: os dois protocolos do Montinho, o Desafio 7 Dias
// e o histórico com a nota de desconforto (antes → depois).
import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { listarMobilidade } from "@/lib/data/mobilidade";
import { listarConquistas } from "@/lib/data/conquistas";
import { dataLocal } from "@/lib/aderencia/calcular";
import { DESAFIO_7_DIAS, PROTOCOLOS, SLUGS_MOBILIDADE } from "@/lib/mobilidade/protocolos";
import { LIMITES_MOBILIDADE, sequenciaAtual, validasEmOrdem } from "@/lib/mobilidade/regras";
import { CATALOGO, CODIGOS_MOBILIDADE } from "@/lib/conquistas/regras";
import { Voltar } from "@/components/ui/Voltar";

export const metadata = { title: "Mobilidade e alongamento" };
export const dynamic = "force-dynamic";

const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function MobilidadePage() {
  const sessao = await requireAlunoPage();
  const [sessoes, conquistas] = await Promise.all([listarMobilidade(sessao.alunoId).catch(() => []), listarConquistas(sessao.alunoId).catch(() => [])]);
  const hoje = dataLocal(new Date());
  const feitas = validasEmOrdem(sessoes).reverse();
  const ganhos = new Set(conquistas.map((c) => c.codigo as string));
  return (
    <div className="space-y-5">
      <Voltar href="/aluno/treinar" />
      <header>
        <h1 className="text-2xl font-black">🧘 Mobilidade e alongamento</h1>
        <p className="mt-1 text-sm text-fg-muted">Dois protocolos de ~22 min para fazer junto com o vídeo do Montinho, em casa ou na academia.</p>
      </header>
      <ul className="space-y-3">
        {SLUGS_MOBILIDADE.map((slug) => {
          const p = PROTOCOLOS[slug];
          const seq = sequenciaAtual(sessoes, slug, hoje);
          const vezes = feitas.filter((s) => s.protocolo === slug).length;
          return (
            <li key={slug}>
              <Link href={`/aluno/mobilidade/${slug}`} className="block rounded-2xl border border-accent/40 bg-grain-strong p-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl" aria-hidden>{p.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-black leading-tight">{p.nome}</span>
                    <span className="block text-xs text-fg-muted">{p.chamada} · ~{p.minutos} min</span>
                  </span>
                  <span aria-hidden className="text-xl text-accent">→</span>
                </div>
                <p className="mt-2 text-xs">
                  {vezes ? `Feita ${vezes} ${vezes === 1 ? "vez" : "vezes"}` : "Ainda não feita"}
                  {seq ? ` · 🔥 ${seq} ${seq === 1 ? "dia seguido" : "dias seguidos"}${seq < LIMITES_MOBILIDADE.diasDesafio ? ` (faltam ${LIMITES_MOBILIDADE.diasDesafio - seq} para o Desafio 7 Dias)` : ""}` : ""}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="rounded-xl border border-border bg-surface p-3 text-sm">{DESAFIO_7_DIAS}</p>
      <section className="space-y-2" aria-labelledby="trofeus-mob">
        <h2 id="trofeus-mob" className="text-xs font-bold uppercase tracking-wider text-fg-muted">Troféus da mobilidade</h2>
        <ul className="grid grid-cols-1 gap-2">
          {CODIGOS_MOBILIDADE.map((c) => (
            <li key={c} className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${ganhos.has(c) ? "border-accent/60 bg-grain-strong" : "border-border bg-surface"}`}>
              <span aria-hidden className="text-xl">{ganhos.has(c) ? "🏆" : "🔒"}</span>
              <span>
                <span className="block text-sm font-bold">{CATALOGO[c].titulo}</span>
                <span className="block text-xs text-fg-muted">{CATALOGO[c].criterio}</span>
              </span>
            </li>
          ))}
        </ul>
        <Link href="/aluno/conquistas/todas?aba=temas&tema=mobilidade" className="alvo text-xs font-semibold text-accent">Ver na sala de troféus →</Link>
      </section>
      {feitas.length ? (
        <section className="space-y-2" aria-labelledby="hist-mob">
          <h2 id="hist-mob" className="text-xs font-bold uppercase tracking-wider text-fg-muted">Suas mobilidades</h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface text-sm">
            {feitas.slice(0, 20).map((s) => (
              <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2">
                <span>{PROTOCOLOS[s.protocolo].emoji} {PROTOCOLOS[s.protocolo].nome.replace("Mobilidade de ", "")} · {quando(s.iniciado_em)}</span>
                {s.nota_antes != null && s.nota_depois != null ? <span className="text-xs font-semibold">desconforto {s.nota_antes} → <span className="text-accent">{s.nota_depois}</span></span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
