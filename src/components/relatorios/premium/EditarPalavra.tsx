"use client";

// Personal ajusta a “Palavra do Montinho” do relatório antes de mandar (06/11/2026).
// Começa com o texto que está no relatório; campo vazio = volta o automático.
import { useState } from "react";
import { useRouter } from "next/navigation";

type Textos = { continuar: string; atencao: string; missao: string; frase: string };
const CAMPOS: Array<{ k: keyof Textos; rotulo: string; dica: string; linhas: number }> = [
  { k: "continuar", rotulo: "🔥 Continue assim", dica: "O que está dando certo", linhas: 3 },
  { k: "atencao", rotulo: "🎯 Atenção para evoluir", dica: "1 ou 2 pontos, sem crítica", linhas: 3 },
  { k: "missao", rotulo: "🚀 Missão dos próximos 30 dias", dica: "Uma meta só, que dá para medir", linhas: 2 },
  { k: "frase", rotulo: "✍️ Sua frase para o aluno (opcional)", dica: "Se ficar vazio, não aparece", linhas: 3 },
];

export function EditarPalavra({ alunoId, inicial }: { alunoId: string; inicial: Textos }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [t, setT] = useState<Textos>(inicial);
  const [estado, setEstado] = useState<"" | "salvando" | "ok" | "erro">("");
  async function salvar() {
    setEstado("salvando");
    const r = await fetch(`/api/alunos/${alunoId}/relatorio-palavra`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(t) }).catch(() => null);
    if (!r?.ok) return setEstado("erro");
    setEstado("ok");
    setAberto(false);
    router.refresh();
  }
  if (!aberto) {
    return (
      <div className="so-tela flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => { setT(inicial); setAberto(true); }} className="inline-flex h-10 items-center rounded-lg border border-[#ba9e50] bg-white px-4 text-[10pt] font-bold text-[#1a1814]">✏️ Editar a Palavra do Montinho</button>
        {estado === "ok" ? <span className="text-[9pt] font-semibold text-[#2f7a3a]">✅ Salvo. O aluno já vê assim.</span> : <span className="text-[8.5pt] text-[#8a8273]">Só você vê este botão.</span>}
      </div>
    );
  }
  return (
    <div className="so-tela space-y-3 rounded-lg border border-[#ba9e50] bg-white p-4 text-[#1a1814]">
      <p className="text-[11pt] font-bold">✏️ Palavra do Montinho</p>
      <p className="text-[9pt] text-[#625c4f]">O texto já veio montado pelos números. Mude o que quiser; apagar um campo volta o texto automático. Vale por 30 dias.</p>
      {CAMPOS.map((c) => (
        <label key={c.k} className="block">
          <span className="text-[10pt] font-semibold">{c.rotulo}</span> <span className="text-[8.5pt] text-[#8a8273]">· {c.dica}</span>
          <textarea value={t[c.k]} onChange={(e) => setT({ ...t, [c.k]: e.target.value })} rows={c.linhas} maxLength={c.k === "missao" ? 300 : c.k === "frase" ? 400 : 600} className="mt-1 w-full rounded-lg border border-[#c9c2b2] p-2 text-[10pt]" />
        </label>
      ))}
      {estado === "erro" ? <p className="text-[9pt] font-semibold text-[#b42318]">Não deu para salvar. Confira a internet e tente de novo.</p> : null}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setAberto(false)} className="h-10 rounded-lg border border-[#c9c2b2] px-4 font-semibold">Cancelar</button>
        <button type="button" onClick={salvar} disabled={estado === "salvando"} className="h-10 rounded-lg bg-[#ba9e50] px-4 font-bold text-[#0a0a0a] disabled:opacity-60">{estado === "salvando" ? "Salvando…" : "Salvar"}</button>
      </div>
    </div>
  );
}
