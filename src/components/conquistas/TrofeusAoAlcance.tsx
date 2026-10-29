// Aviso no topo da tela de troféus: quantos dá para ganhar nos próximos dias
// e o que fazer em cada um (ao-alcance.ts). Lista curta; o resto abre no toque.
import type { ItemAlcance } from "@/lib/conquistas/ao-alcance";
import { DIAS_ALCANCE, ehDeHoje } from "@/lib/conquistas/ao-alcance";
import Link from "next/link";

const VISIVEIS = 4;

/** Onde a pessoa faz a ação de cada troféu (a linha leva direto para lá). */
function destino(codigo: string): string {
  if (codigo === "relatorio_mensal") return "/aluno/evolucao";
  if (codigo === "strava_conectado") return "/aluno/perfil";
  if (codigo === "ponto_de_partida") return "/aluno/medidas";
  if (codigo === "trouxe_amigo") return "/aluno/indicar";
  if (codigo === "criador_desafios") return "/aluno/desafios/novo";
  if (["compartilhou_primeiro", "vitrine_de_trofeus", "inspiracao_galera"].includes(codigo)) return "/aluno/conquistas/todas";
  if (codigo.startsWith("cardio_") || codigo === "dois_folegos") return "/aluno/cardio";
  return "/aluno/treinar";
}

function Linha({ i }: { i: ItemAlcance }) {
  return (
    <li>
      <Link href={destino(i.codigo)} className="flex items-start gap-3 py-2">
        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-accent/60 bg-bg font-mono font-bold text-accent ${i.selo.length > 4 ? "text-[8px]" : "text-[10px]"}`} aria-hidden>
          {i.selo}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline justify-between gap-x-2">
            <span className="text-sm font-bold">{i.titulo}</span>
            {i.quando ? <span className="text-[11px] font-semibold text-accent">{i.quando}</span> : null}
          </span>
          <span className="block text-xs text-fg-muted">{i.oQueFazer}</span>
        </span>
        <span aria-hidden className="self-center text-fg-subtle">›</span>
      </Link>
    </li>
  );
}

export function TrofeusAoAlcance({ itens }: { itens: ItemAlcance[] }) {
  if (!itens.length) return null;
  const n = itens.length;
  return (
    <section role="status" aria-labelledby="alcance-titulo" className="rounded-xl border border-accent/60 bg-accent/10 px-4 py-3">
      <p id="alcance-titulo" className="flex items-center gap-2 text-sm font-bold">
        <span aria-hidden>🔔</span>
        <span>
          Você pode ganhar <span className="text-accent">{n} {n === 1 ? "troféu" : "troféus"}</span> nos próximos {DIAS_ALCANCE} dias
        </span>
      </p>
      <ul className="mt-1 divide-y divide-border/60">
        {itens.slice(0, VISIVEIS).map((i) => <Linha key={i.codigo} i={i} />)}
      </ul>
      {n > VISIVEIS ? (
        <details className="group">
          <summary className="alvo cursor-pointer list-none py-1 text-xs font-semibold text-accent">
            <span className="group-open:hidden">Ver mais {n - VISIVEIS} →</span>
            <span className="hidden group-open:inline">Ver menos</span>
          </summary>
          <ul className="divide-y divide-border/60">
            {itens.slice(VISIVEIS).map((i) => <Linha key={i.codigo} i={i} />)}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

/** Início (pedido do Montinho, 28/10/2026): “Dá para ganhar hoje” separado de “Nos próximos dias”. */
export function TrofeusHojeEProximos({ itens }: { itens: ItemAlcance[] }) {
  if (!itens.length) return null;
  const hoje = itens.filter((i) => ehDeHoje(i.quando));
  const depois = itens.filter((i) => !ehDeHoje(i.quando));
  const bloco = (titulo: string, lista: ItemAlcance[], aberto: boolean) =>
    lista.length ? (
      <details open={aberto} className="group">
        <summary className="alvo flex cursor-pointer list-none items-center justify-between gap-2 py-1 text-xs font-bold uppercase tracking-wider text-accent">
          <span>{titulo} · {lista.length}</span>
          <span aria-hidden className="text-fg-subtle group-open:rotate-180">▾</span>
        </summary>
        <ul className="divide-y divide-border/60">{lista.map((i) => <Linha key={i.codigo} i={i} />)}</ul>
      </details>
    ) : null;
  return (
    <section aria-labelledby="trofeus-hoje-titulo" className="space-y-1 rounded-xl border border-accent/60 bg-accent/10 px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="trofeus-hoje-titulo" className="text-sm font-bold">🏆 Troféus que você pode ganhar</h2>
        <Link href="/aluno/conquistas" className="alvo shrink-0 text-xs font-semibold text-accent">Ver todos →</Link>
      </div>
      {bloco("🔥 Ainda hoje", hoje, true)}
      {bloco(`📅 Nos próximos ${DIAS_ALCANCE} dias`, depois, !hoje.length)}
    </section>
  );
}
