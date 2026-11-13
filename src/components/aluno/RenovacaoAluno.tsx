"use client";

// Aluno com o acesso vencido (pedido do Montinho, 13/11/2026): entra no app,
// mas treino e relatórios mostram a renovação; no Início, a mensagem vem no topo.
import { usePathname } from "next/navigation";
import { registrarCliqueGa } from "@/components/analytics/ga";
import { rotaTravada, type MensagemRenovacao } from "@/lib/aluno/renovacao";

export function CartaoRenovacao({ msg, tela }: { msg: MensagemRenovacao; tela: string }) {
  return (
    <section aria-label="Renovar acompanhamento" className="rounded-2xl border-2 border-accent bg-[linear-gradient(160deg,#3a3016_0%,#171717_75%)] p-5 shadow-xl">
      <p className="text-[11px] font-bold uppercase tracking-wider text-accent">{msg.etiqueta}</p>
      <h2 className="mt-1.5 text-2xl font-black leading-tight">{msg.titulo}</h2>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{msg.texto}</p>
      <ul className="mt-3 space-y-1.5 text-sm">
        {msg.beneficios.map((b) => (
          <li key={b} className="flex gap-2">
            <span aria-hidden>✅</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <a
        href={msg.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => registrarCliqueGa("APP-RENOVAR", tela)}
        className="alvo mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-4 text-base font-bold text-bg"
      >
        💬 {msg.botao}
      </a>
      <p className="mt-3 text-center text-xs font-semibold text-accent">{msg.rodape}</p>
    </section>
  );
}

export function GuardaRenovacao({ msg, children }: { msg: MensagemRenovacao; children: React.ReactNode }) {
  const caminho = usePathname() ?? "";
  if (rotaTravada(caminho)) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <p className="font-bold">🔒 Treinos e relatórios pausados</p>
          <p className="mt-1 text-fg-muted">Seu acompanhamento terminou. Renove com o Montinho e tudo volta a funcionar na hora — seu histórico está guardado.</p>
        </div>
        <CartaoRenovacao msg={msg} tela="travado" />
      </div>
    );
  }
  return (
    <>
      {caminho === "/aluno" ? (
        <div className="mb-4">
          <CartaoRenovacao msg={msg} tela="inicio" />
        </div>
      ) : null}
      {children}
    </>
  );
}
