"use client";

// 🔔 da barra de cima do app do aluno (pedido do Montinho, 30/10/2026): bolinha
// com quantas novas e, ao tocar, a central com o que pede ação primeiro, as
// novas e as anteriores. “Lido” fica no aparelho (localStorage). Busca a lista
// ao abrir o app, ao trocar de tela (no máximo 1× por minuto) e ao voltar para
// o app. Sem notificação ligada no celular, o 1º item convida a ativar.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { detectarPush } from "./LembretePush";
import { contarNovas, ehNova, haQuanto, juntarVistos, textoContador, type ItemCentral } from "@/lib/notificacoes/central";
import type { RecadoPersonagem } from "@/lib/notificacoes/personagens";
import { Personagem } from "@/components/jornada-chalala/Personagens";
import { personagemPorId } from "@/lib/jornada-chalala/universo";

const CHAVE = "montinho-notif-vistas";
/** Recado do personagem: pedido ao servidor no máximo 1× por dia por aparelho. */
const CHAVE_PERSONAGEM = "montinho-personagem";
const CHAVE_RESPOSTAS = "montinho-personagem-resp";
const diaDeHoje = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

async function recadoDoDia(): Promise<RecadoPersonagem | null> {
  const dia = diaDeHoje();
  try {
    const g = JSON.parse(localStorage.getItem(CHAVE_PERSONAGEM) ?? "null") as { dia: string; recado: RecadoPersonagem | null } | null;
    if (g?.dia === dia) return g.recado;
  } catch {}
  const r = await fetch("/api/notificacoes/personagem", { cache: "no-store" }).catch(() => null);
  if (!r?.ok) return null;
  const { recado } = (await r.json()) as { recado: RecadoPersonagem | null };
  try {
    localStorage.setItem(CHAVE_PERSONAGEM, JSON.stringify({ dia, recado }));
  } catch {}
  return recado;
}

const itemDoRecado = (r: RecadoPersonagem, agora: string): ItemCentral => ({ id: r.id, tipo: "recado", emoji: "", titulo: r.titulo, texto: r.fala, href: r.botao.href, quando: agora, personagem: r });
const MIN_ENTRE_BUSCAS = 60_000;

function lerVistos(): Set<string> | null {
  try {
    const v = localStorage.getItem(CHAVE);
    return v ? new Set(JSON.parse(v) as string[]) : null;
  } catch {
    return null;
  }
}
function guardarVistos(ids: string[]) {
  try {
    const antes = [...(lerVistos() ?? [])];
    localStorage.setItem(CHAVE, JSON.stringify(juntarVistos(antes, ids)));
  } catch {}
}

const ITEM_ATIVAR = (agora: string): ItemCentral => ({
  id: "ativar-notificacoes",
  tipo: "acao",
  emoji: "📲",
  titulo: "Ative as notificações neste celular",
  texto: "Assim os lembretes de troféu, cardio e desafios chegam mesmo com o app fechado.",
  href: "/aluno/perfil",
  quando: agora,
});

export function SinoNotificacoes() {
  const pathname = usePathname();
  const [itens, setItens] = useState<ItemCentral[]>([]);
  const [agora, setAgora] = useState<string>("");
  const [vistos, setVistos] = useState<Set<string> | null>(null);
  const [aberto, setAberto] = useState(false);
  const [novasAoAbrir, setNovasAoAbrir] = useState<Set<string>>(new Set());
  const [montado, setMontado] = useState(false);
  const ultimaBusca = useRef(0);

  const buscar = useCallback(async (forcar = false) => {
    if (!forcar && Date.now() - ultimaBusca.current < MIN_ENTRE_BUSCAS) return;
    ultimaBusca.current = Date.now();
    try {
      const r = await fetch("/api/notificacoes", { cache: "no-store" });
      if (!r.ok) return;
      const j = (await r.json()) as { itens: ItemCentral[]; agora: string };
      const estadoPush = await detectarPush().catch(() => "sem_suporte" as const);
      const precisaAtivar = estadoPush === "desligado" || estadoPush === "bloqueado" || estadoPush === "iphone_instalar";
      const recado = await recadoDoDia().catch(() => null);
      const lista = recado ? [itemDoRecado(recado, j.agora), ...j.itens] : j.itens;
      setItens(precisaAtivar ? [ITEM_ATIVAR(j.agora), ...lista] : lista);
      setAgora(j.agora);
      setVistos(lerVistos());
    } catch {}
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal só existe no navegador
    setMontado(true);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a lista chega depois do fetch (assíncrono)
    void buscar();
  }, [buscar, pathname]);
  useEffect(() => {
    const voltar = () => document.visibilityState === "visible" && void buscar();
    document.addEventListener("visibilitychange", voltar);
    return () => document.removeEventListener("visibilitychange", voltar);
  }, [buscar]);

  const novas = useMemo(() => (agora ? contarNovas(itens, vistos, agora) : 0), [itens, vistos, agora]);

  function abrir() {
    setNovasAoAbrir(new Set(itens.filter((i) => ehNova(i, vistos, agora)).map((i) => i.id)));
    setAberto(true);
    // Abriu = viu (como no Instagram); o destaque das novas continua até fechar.
    guardarVistos(itens.map((i) => i.id));
  }
  function fechar() {
    setAberto(false);
    setVistos(lerVistos());
  }

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto]);

  const acao = itens.filter((i) => i.tipo === "acao");
  const resto = itens.filter((i) => i.tipo !== "acao");
  const novasLista = resto.filter((i) => novasAoAbrir.has(i.id));
  const anteriores = resto.filter((i) => !novasAoAbrir.has(i.id));
  const contador = textoContador(novas);

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label={novas ? `Notificações: ${novas} ${novas === 1 ? "nova" : "novas"}` : "Notificações"}
        aria-haspopup="dialog"
        className="relative grid h-10 w-10 place-items-center rounded-full border border-border text-fg-muted transition-colors hover:border-white/40 hover:text-fg"
      >
        <Icon name="bell" size={19} className={novas ? "text-fg motion-safe:animate-[sino_1.2s_ease-in-out_2]" : ""} />
        {contador ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-[#0f0f0f] bg-red px-1 text-[10px] font-black leading-none text-white" aria-hidden>
            {contador}
          </span>
        ) : null}
      </button>

      {aberto && montado
        ? createPortal(
            <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Notificações">
              <button type="button" aria-label="Fechar notificações" tabIndex={-1} onClick={fechar} className="absolute inset-0 bg-black/60" />
              <div className="absolute inset-x-0 top-0 mx-auto flex max-h-[85vh] max-w-md flex-col rounded-b-2xl border border-t-0 border-border bg-card shadow-2xl">
                <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                  <div>
                    <p className="text-base font-extrabold">🔔 Notificações</p>
                    <p className="text-[11px] text-fg-subtle">{novasAoAbrir.size ? `${novasAoAbrir.size} ${novasAoAbrir.size === 1 ? "nova" : "novas"}` : "Tudo visto"}{acao.length ? ` · ${acao.length} ${acao.length === 1 ? "pede" : "pedem"} você` : ""}</p>
                  </div>
                  <button type="button" onClick={fechar} className="alvo rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-fg-muted hover:text-fg">
                    Fechar
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-2">
                  {itens.length === 0 ? (
                    <div className="space-y-3 px-3 py-8 text-center">
                      <p className="text-3xl" aria-hidden>🎉</p>
                      <p className="font-bold">Tudo em dia por aqui!</p>
                      <p className="text-sm text-fg-muted">Quando chegar recado do Montinho, convite de desafio ou troféu novo, aparece aqui.</p>
                      <Link href="/aluno/conquistas#ao-alcance" onClick={fechar} className="touch inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-bg">
                        🏆 Ver troféus que dá para ganhar
                      </Link>
                    </div>
                  ) : (
                    <>
                      <Secao titulo="Precisa de você" itens={acao} novas={novasAoAbrir} agora={agora} onIr={fechar} destaque />
                      <Secao titulo="Novas" itens={novasLista} novas={novasAoAbrir} agora={agora} onIr={fechar} />
                      <Secao titulo="Anteriores" itens={anteriores} novas={novasAoAbrir} agora={agora} onIr={fechar} />
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-xs">
                  <Link href="/aluno/perfil" onClick={fechar} className="alvo font-semibold text-fg-muted hover:text-fg">
                    ⚙️ O que recebo no celular
                  </Link>
                  <Link href="/aluno/treinar" onClick={fechar} className="alvo rounded-full bg-accent px-3 py-1.5 font-bold text-bg">
                    💪 Treinar agora
                  </Link>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function Secao({ titulo, itens, novas, agora, onIr, destaque = false }: { titulo: string; itens: ItemCentral[]; novas: Set<string>; agora: string; onIr: () => void; destaque?: boolean }) {
  if (!itens.length) return null;
  return (
    <section className="py-1" aria-label={titulo}>
      <h3 className={`px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider ${destaque ? "text-accent" : "text-fg-subtle"}`}>{titulo}</h3>
      <ul className="space-y-0.5">
        {itens.map((i) => {
          const nova = novas.has(i.id);
          if (i.personagem) return <CartaoPersonagem key={i.id} r={i.personagem} nova={nova} onIr={onIr} />;
          return (
            <li key={i.id}>
              <Link href={i.href} onClick={onIr} className={`flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface ${destaque ? "bg-accent/10" : nova ? "bg-surface/70" : ""}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-bg text-xl" aria-hidden>
                  {i.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm leading-snug ${nova || destaque ? "font-bold text-fg" : "font-medium text-fg-muted"}`}>{i.titulo}</span>
                  {i.texto ? <span className="mt-0.5 block text-xs leading-snug text-fg-muted">{i.texto}</span> : null}
                  {i.tipo !== "acao" ? <span className="mt-0.5 block text-[10px] text-fg-subtle">{haQuanto(i.quando, agora)}</span> : null}
                </span>
                {nova ? <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-red" aria-label="nova" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Recado do personagem: desenho, fala, botão e duas respostas rápidas (o personagem responde de volta). */
function CartaoPersonagem({ r, nova, onIr }: { r: RecadoPersonagem; nova: boolean; onIr: () => void }) {
  const [escolha, setEscolha] = useState<number | null>(() => {
    try {
      const v = (JSON.parse(localStorage.getItem(CHAVE_RESPOSTAS) ?? "{}") as Record<string, number>)[r.id];
      return typeof v === "number" ? v : null;
    } catch {
      return null;
    }
  });
  function responder(k: number) {
    setEscolha(k);
    try {
      const m = JSON.parse(localStorage.getItem(CHAVE_RESPOSTAS) ?? "{}") as Record<string, number>;
      const ids = Object.keys(m).slice(-30);
      localStorage.setItem(CHAVE_RESPOSTAS, JSON.stringify({ ...Object.fromEntries(ids.map((x) => [x, m[x]])), [r.id]: k }));
    } catch {}
  }
  const p = personagemPorId(r.personagem);
  return (
    <li className={`my-1 rounded-2xl border p-3 ${nova ? "border-accent/60 bg-accent/10" : "border-border bg-surface/60"}`}>
      <div className="flex items-start gap-3">
        <span className="shrink-0" aria-hidden><Personagem id={r.personagem} tamanho={52} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-accent">{p.nome} · {p.papel}</p>
          <p className="text-sm font-bold leading-snug text-fg">{r.titulo}</p>
          <p className="mt-1 text-sm leading-snug text-fg-muted">“{r.fala}”</p>
        </div>
        {nova ? <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red" aria-label="nova" /> : null}
      </div>
      {escolha === null ? (
        <div className="mt-2 flex gap-2">
          {r.respostas.map((x, k) => (
            <button key={x.rotulo} type="button" onClick={() => responder(k)} className="alvo flex-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-accent">
              {x.rotulo}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-2 space-y-1.5">
          <p className="ml-auto w-fit rounded-2xl rounded-br-sm bg-accent/20 px-3 py-1.5 text-xs font-semibold">{r.respostas[escolha].rotulo}</p>
          <p className="w-fit max-w-[90%] rounded-2xl rounded-bl-sm bg-bg px-3 py-1.5 text-xs leading-snug"><span className="font-bold text-accent">{p.nome}:</span> {r.respostas[escolha].resposta}</p>
        </div>
      )}
      <Link href={r.botao.href} onClick={onIr} className="touch mt-2 flex w-full items-center justify-center rounded-xl bg-accent px-3 py-2 text-sm font-bold text-bg">
        {r.botao.rotulo}
      </Link>
    </li>
  );
}
