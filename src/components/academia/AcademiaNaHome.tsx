// Academia da Tribo no Início: banner grande do lançamento (dias escolhidos pelo
// personal) → depois um card compacto e permanente; e o banner da inauguração.
import Link from "next/link";
import { AcademiaIlustracao } from "./AcademiaIlustracao";
import { BarraObra } from "./BarraObra";
import { etapaDe, infoModelo, pctDaObra, proximoMarco, textoInauguracao, toneladas, type DadosObra, type DestaqueHome } from "@/lib/academia/regras";

export function AcademiaNaHome({ ativa, inaugurada, destaque, modo }: { ativa: DadosObra | null; inaugurada: DadosObra | null; destaque: DestaqueHome; modo: "destaque" | "compacto" }) {
  if (modo === "destaque") {
    return (
      <>
        {destaque.inauguracao && inaugurada ? (
          <section className="overflow-hidden rounded-2xl border-2 border-accent bg-gradient-to-b from-accent/20 to-surface">
            <AcademiaIlustracao etapa={7} pavimentos={infoModelo(inaugurada.modelo).pavimentos} className="block h-auto w-full" titulo="Academia inaugurada" />
            <div className="space-y-2 p-4">
              <p className="text-lg font-black leading-tight">🎉 A {inaugurada.nome.toUpperCase()} ESTÁ PRONTA!</p>
              <p className="text-sm">“{textoInauguracao(inaugurada)}”</p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link href={`/aluno/academia/${inaugurada.id}`} className="alvo flex items-center justify-center rounded-xl bg-accent px-3 py-2.5 text-center text-sm font-bold text-bg">
                  Conhecer a academia
                </Link>
                <Link href={`/aluno/academia/${inaugurada.id}#quem`} className="alvo flex items-center justify-center rounded-xl border border-accent/60 px-3 py-2.5 text-center text-sm font-bold">
                  Ver quem fez parte
                </Link>
              </div>
            </div>
          </section>
        ) : null}
        {destaque.lancamento && ativa ? (
          <section className="overflow-hidden rounded-2xl border-2 border-accent bg-gradient-to-b from-accent/15 to-surface">
            <AcademiaIlustracao etapa={etapaDe(pctDaObra(ativa.total_kg, ativa.meta_kg)).n} pavimentos={infoModelo(ativa.modelo).pavimentos} className="block h-auto w-full" titulo={ativa.nome} />
            <div className="space-y-2 p-4">
              <p className="text-lg font-black leading-tight">🏗️ ESTAMOS CONSTRUINDO {ativa.ordem === 1 ? "NOSSA PRIMEIRA ACADEMIA!" : "MAIS UMA ACADEMIA!"}</p>
              <p className="text-sm">“A obra começou do zero. Cada tonelada que a tribo movimentar a partir de agora ajuda a transformar esse terreno em uma academia de verdade!”</p>
              <BarraObra pct={pctDaObra(ativa.total_kg, ativa.meta_kg)} pequena />
              <p className="text-xs text-fg-muted">
                {toneladas(ativa.total_kg)} t de {toneladas(ativa.meta_kg)} t · {ativa.participantes} {ativa.participantes === 1 ? "pessoa já ajudou" : "pessoas já ajudaram"}
              </p>
              <Link href="/aluno/academia" className="alvo flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-bold text-bg">
                PARTICIPAR DA CONSTRUÇÃO
              </Link>
            </div>
          </section>
        ) : null}
      </>
    );
  }
  if (!destaque.compacto || !ativa) return null;
  const pct = pctDaObra(ativa.total_kg, ativa.meta_kg);
  const etapa = etapaDe(pct);
  const prox = proximoMarco(ativa.total_kg, ativa.meta_kg);
  return (
    <Link href="/aluno/academia" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 hover:border-accent/60">
      <div className="w-24 shrink-0 overflow-hidden rounded-xl border border-border">
        <AcademiaIlustracao etapa={etapa.n} pavimentos={infoModelo(ativa.modelo).pavimentos} animar={false} className="block h-auto w-full" titulo={ativa.nome} />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-bold">🏗️ {ativa.nome}</p>
        <BarraObra pct={pct} pequena />
        <p className="text-xs text-fg-muted">
          {pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% · {toneladas(ativa.total_kg)} t{prox ? ` · próximo: ${prox.etapa.curto.toLowerCase()}` : ""}
        </p>
        <p className="text-[11px] font-semibold text-accent">Ver a obra e o legado ›</p>
      </div>
    </Link>
  );
}
