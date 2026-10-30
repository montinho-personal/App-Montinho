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

const CHAVE = "montinho-notif-vistas";
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
      setItens(precisaAtivar ? [ITEM_ATIVAR(j.agora), ...j.itens] : j.itens);
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
