"use client";

// Lupa da barra de cima (pedido do Montinho, 29/10/2026): abre a busca POR
// CIMA da tela atual, com o campo já pronto para digitar e os nomes logo
// embaixo, filtrando a cada letra (sem acento, por pedaço do nome).
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { bateBusca } from "@/lib/alunos/lista";

type Pessoa = { id: string; nome: string; email: string | null; telefone: string | null; status: string; visitante: boolean; ultimoTreino: string | null };

const quando = (iso: string | null) => {
  if (!iso) return "ainda não treinou";
  const dias = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return dias <= 0 ? "treinou hoje" : dias === 1 ? "treinou ontem" : `treinou há ${dias} dias`;
};

export function BuscaRapida() {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [q, setQ] = useState("");
  const [pessoas, setPessoas] = useState<Pessoa[] | null>(null);
  const [erro, setErro] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  // A barra de cima tem desfoque (backdrop-filter), que prende o “fixed” dentro dela:
  // a janela vai direto para o <body> para ocupar a tela inteira.
  const noNavegador = useSyncExternalStore(() => () => {}, () => true, () => false);

  function abrir() {
    setAberta(true);
    setQ("");
    // Foco no mesmo toque: no iPhone o teclado só abre assim.
    campo.current?.focus();
    if (!pessoas) {
      fetch("/api/treinador/pessoas")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d: { pessoas: Pessoa[] }) => setPessoas(d.pessoas))
        .catch(() => setErro(true));
    }
  }
  const fechar = () => setAberta(false);

  useEffect(() => {
    if (!aberta) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberta(false);
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [aberta]);

  const lista = useMemo(() => (pessoas ?? []).filter((p) => p.status !== "arquivado" || q.trim()).filter((p) => bateBusca({ ...p, inicio: null, acessoAte: null }, q)), [pessoas, q]);

  function ir(id: string) {
    setAberta(false);
    router.push(`/treinador/alunos/${id}`);
  }

  return (
    <>
      <button type="button" onClick={abrir} aria-label="Buscar aluno ou treino" className="touch grid w-11 place-items-center rounded-full border border-white/20 bg-white/5 text-fg">
        <Icon name="search" size={18} />
      </button>
      {/* Sempre montada (escondida) para o campo poder receber o foco no toque da lupa. */}
      {noNavegador ? createPortal(
      <div className={`fixed inset-0 z-[80] flex flex-col bg-bg/95 backdrop-blur ${aberta ? "" : "pointer-events-none -z-10 opacity-0"}`} role="dialog" aria-modal="true" aria-label="Buscar" aria-hidden={!aberta}>
          <div className="flex items-center gap-2 border-b border-border px-3 py-3">
            <div className="relative flex-1">
              <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"><Icon name="search" size={18} /></span>
              <input
                ref={campo}
                type="search"
                inputMode="search"
                autoComplete="off"
                enterKeyHint="go"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && lista[0]) ir(lista[0].id); }}
                placeholder="Nome ou sobrenome"
                aria-label="Buscar pessoa"
                tabIndex={aberta ? 0 : -1}
                className="h-12 w-full rounded-xl border border-accent/60 bg-card pl-10 pr-3 text-base focus:outline-none"
              />
            </div>
            <button type="button" onClick={fechar} tabIndex={aberta ? 0 : -1} className="alvo rounded-lg px-3 py-2 text-sm font-semibold text-fg-muted">Fechar</button>
          </div>
          {aberta ? (
          <div className="flex-1 overflow-y-auto px-3 pb-6">
            {erro ? (
              <p className="p-6 text-center text-sm text-fg-muted">Não deu para carregar agora. Tente de novo.</p>
            ) : !pessoas ? (
              <p className="p-6 text-center text-sm text-fg-muted">Carregando…</p>
            ) : lista.length ? (
              <ul className="divide-y divide-border">
                {lista.slice(0, 60).map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => ir(p.id)} className="flex w-full items-center gap-3 py-3 text-left">
                      <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border text-sm font-bold text-accent">{p.nome.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase()}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{p.nome}</span>
                        <span className="block text-xs text-fg-muted">{p.visitante ? "Visitante · " : ""}{p.status === "arquivado" ? "arquivado · " : ""}{quando(p.ultimoTreino)}</span>
                      </span>
                      <span aria-hidden className="text-fg-subtle">→</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-6 text-center text-sm text-fg-muted">Ninguém com “{q}”. Tente só o começo do nome.</p>
            )}
            <Link href={`/treinador/busca${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`} onClick={fechar} className="mt-3 block rounded-xl border border-border bg-card px-4 py-3 text-sm">
              🏋️ Procurar por treino ou exercício (ex.: “remada cavalinho”) →
            </Link>
          </div>
          ) : null}
      </div>, document.body) : null}
    </>
  );
}
