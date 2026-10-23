"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import type { TemplateTreino } from "@/lib/supabase/types-extended";

type Props = {
  alunoId: string;
  templates: TemplateTreino[];
  /** Visual do atalho (cartão com ícone no perfil do aluno). */
  className?: string;
  children?: React.ReactNode;
};

export function AtribuirTreinoButton({ alunoId, templates, className, children }: Props) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      {className ? (
        <button type="button" onClick={() => setAberto(true)} className={className}>
          {children}
        </button>
      ) : (
        <Button size="sm" onClick={() => setAberto(true)}>Atribuir template</Button>
      )}
      {aberto ? (
        <AtribuirTreinoModal alunoId={alunoId} templates={templates} onClose={() => setAberto(false)} />
      ) : null}
    </>
  );
}

function AtribuirTreinoModal({
  alunoId,
  templates,
  onClose,
}: {
  alunoId: string;
  templates: TemplateTreino[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id ?? "");
  const [nome, setNome] = useState("");
  const [obs, setObs] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const selecionado = templates.find((t) => t.id === templateId);

  async function handleAtribuir() {
    if (!templateId) return;
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/treinos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aluno_id: alunoId,
          template_id: templateId,
          nome: nome.trim() || undefined,
          observacoes: obs.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErro(data.error ?? "Erro ao atribuir treino");
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setErro("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold">Atribuir treino</h2>
          <button onClick={onClose} className="alvo text-fg-muted hover:text-fg text-2xl leading-none">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {templates.length === 0 ? (
            <p className="text-sm text-fg-muted">Nenhum template criado ainda. Crie um template na Biblioteca antes de atribuir.</p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Template</label>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} ({Object.keys(t.estrutura).length} {Object.keys(t.estrutura).length === 1 ? "treino" : "treinos"})
                    </option>
                  ))}
                </select>
                {selecionado?.descricao ? (
                  <p className="text-[11px] text-fg-subtle mt-1">{selecionado.descricao}</p>
                ) : null}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Nome personalizado (opcional)</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder={selecionado?.nome ?? ""}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Observações</label>
                <textarea
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  rows={2}
                  placeholder="Instruções específicas para este aluno..."
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
                />
              </div>
              <p className="text-[11px] text-fg-subtle bg-accent/5 border border-accent/20 rounded-lg px-3 py-2">
                Os treinos anteriores do aluno serão desativados e substituídos pelos treinos deste template.
              </p>
              {erro ? <p className="text-sm text-red bg-red/10 rounded-xl px-4 py-2">{erro}</p> : null}
              <div className="flex gap-3">
                <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
                <Button
                  type="button"
                  variant="primary"
                  className="flex-1"
                  disabled={loading || !templateId}
                  onClick={() => { void handleAtribuir(); }}
                >
                  {loading ? "Atribuindo..." : "Atribuir"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
