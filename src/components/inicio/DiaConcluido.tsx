// Início depois do treino de hoje (pedido do Montinho, 29/10/2026): parabéns,
// troféus e carimbos; com cardio pendente, o cardio vira o destaque; com os
// dois feitos, “dia completo”. Regras em src/lib/inicio/dia.ts.
import Link from "next/link";
import { CardioHoje } from "@/components/cardio/CardioHoje";
import type { EstadoDia } from "@/lib/inicio/dia";
import type { ComponentProps } from "react";

type Props = {
  estado: Exclude<EstadoDia, "a_fazer">;
  nome: string;
  treinoHoje: string;
  cardioMinHoje: number;
  frase: string;
  trofeus: number;
  carimbos: number | null;
  pendentes: ComponentProps<typeof CardioHoje>["pendentes"];
  /** Dia completo: convite para um extra (só se o personal liberou o treino extra). */
  extraLiberado?: boolean;
  /** Troféus ainda não ganhos que o extra de hoje vale (Dose Dupla, Dois Fôlegos). */
  valeDoseDupla?: boolean;
  valeDoisFolegos?: boolean;
};

export function DiaConcluido({ estado, nome, treinoHoje, cardioMinHoje, frase, trofeus, carimbos, pendentes, extraLiberado = false, valeDoseDupla = false, valeDoisFolegos = false }: Props) {
  const completo = estado === "completo";
  return (
    <section className={`space-y-3 rounded-2xl border p-4 ${completo ? "border-success/50 bg-success/5" : "border-accent/50 bg-grain-strong"}`} aria-label="Seu dia">
      <p className={`text-[11px] font-bold uppercase tracking-wider ${completo ? "text-success" : "text-accent"}`}>{completo ? "🏆 Dia completo" : "✅ Treino de hoje concluído"}</p>
      <h2 className="text-xl font-black leading-tight">Parabéns, {nome}! 🎉</h2>
      <p className="text-sm text-fg-muted">{frase}</p>
      <ul className="space-y-1 text-sm">
        <li>💪 <span className="font-semibold">{treinoHoje}</span> ✅</li>
        {cardioMinHoje > 0 ? <li>❤️‍🔥 <span className="font-semibold">Cardio: {cardioMinHoje} min</span> ✅</li> : null}
      </ul>
      <div className="grid grid-cols-2 gap-2 text-center">
        <Link href="/aluno/conquistas" className="rounded-xl border border-border bg-card px-2 py-2">
          <span className="block text-xl font-black text-accent">{trofeus || "🏆"}</span>
          <span className="text-xs text-fg-muted">{trofeus ? "🏆 troféus" : "Ver troféus"}</span>
        </Link>
        <Link href="/aluno/conquistas#carimbos" className="rounded-xl border border-border bg-card px-2 py-2">
          <span className="block text-xl font-black text-accent">{carimbos ?? "—"}</span>
          <span className="text-xs text-fg-muted">🎟️ carimbos</span>
        </Link>
      </div>
      {estado === "falta_cardio" ? (
        <div className="space-y-2 rounded-xl border border-accent/60 bg-bg/60 p-3">
          <p className="text-sm font-bold">Agora só falta o cardio de hoje para fechar o dia! ❤️‍🔥</p>
          <CardioHoje pendentes={pendentes} nome={nome} livre={false} titulo="Cardio de hoje" compacto />
        </div>
      ) : (
        <>
          <p className="text-xs text-fg-muted">Agora é descansar, comer bem e dormir. A recuperação também é treino. 😴</p>
          {/* Ainda com energia? Um extra opcional — e o troféu que ele vale, se ainda não tem. */}
          <div className="space-y-2 rounded-xl border border-border bg-bg/60 p-3">
            <p className="text-sm font-bold">Ainda com gás? Escolha um extra (opcional):</p>
            <div className={`grid gap-2 ${extraLiberado ? "grid-cols-2" : "grid-cols-1"}`}>
              {extraLiberado ? (
                <Link href="/aluno/extra" className="rounded-xl border border-accent/60 px-3 py-2 text-center">
                  <span className="block text-sm font-bold text-accent">💪 Treino extra</span>
                  {valeDoseDupla ? <span className="mt-0.5 block text-[11px] font-semibold text-success">🏆 Vale o troféu Dose Dupla</span> : null}
                </Link>
              ) : null}
              <Link href="/aluno/cardio" className="rounded-xl border border-accent/60 px-3 py-2 text-center">
                <span className="block text-sm font-bold text-accent">❤️‍🔥 Cardio extra</span>
                {valeDoisFolegos ? <span className="mt-0.5 block text-[11px] font-semibold text-success">🏆 Vale o troféu Dois Fôlegos (10+ min)</span> : null}
              </Link>
            </div>
            <p className="text-[11px] text-fg-subtle">Só se o corpo estiver bem: sem dor e com a recuperação em dia.</p>
          </div>
        </>
      )}
      <Link href="/aluno/treinar" className="block py-1 text-center text-sm text-fg-muted hover:text-fg">Quer treinar de novo hoje? Ver treinos</Link>
    </section>
  );
}
