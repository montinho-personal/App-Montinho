"use client";

// Prescrição de cardio pelo personal (ficha do aluno → aba ❤️ Cardio).
// Individual: nada é igual para todos. Editar = a antiga é encerrada e a
// nova passa a valer (as semanas passadas mantêm a meta da época).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DIAS_SEMANA, INTENSIDADES, MODALIDADES, MODALIDADE_IDS, MODALIDADE_LIVRE, VINCULOS, infoModalidade } from "@/lib/cardio/modalidades";
import type { CardioPrescricao, IntensidadeCardio, ModalidadePrescricao } from "@/lib/supabase/types-extended";

type Treino = { id: string; letra: string; nome: string };
type Form = {
  modalidade: ModalidadePrescricao;
  nome: string;
  tipo: "continuo" | "intervalado";
  duracao_min: number;
  intensidade: IntensidadeCardio;
  frequencia_semanal: number;
  dias: number[];
  vinculo: keyof typeof VINCULOS;
  treino_id: string;
  fc_alvo_min: string;
  fc_alvo_max: string;
  intervalos: string;
  observacoes: string;
};

const VAZIO: Form = { modalidade: "esteira", nome: "", tipo: "continuo", duracao_min: 30, intensidade: "moderada", frequencia_semanal: 3, dias: [], vinculo: "qualquer", treino_id: "", fc_alvo_min: "", fc_alvo_max: "", intervalos: "", observacoes: "" };
const VINCULO = VINCULOS;

const doRegistro = (p: CardioPrescricao): Form => ({ modalidade: p.modalidade, nome: p.nome ?? "", tipo: p.tipo, duracao_min: p.duracao_min, intensidade: p.intensidade, frequencia_semanal: p.frequencia_semanal, dias: p.dias, vinculo: p.vinculo, treino_id: p.treino_id ?? "", fc_alvo_min: p.fc_alvo_min ? String(p.fc_alvo_min) : "", fc_alvo_max: p.fc_alvo_max ? String(p.fc_alvo_max) : "", intervalos: p.intervalos ?? "", observacoes: p.observacoes ?? "" });

export function PrescricaoCardio({ alunoId, prescricoes, treinos }: { alunoId: string; prescricoes: CardioPrescricao[]; treinos: Treino[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<string | "nova" | null>(prescricoes.length ? null : "nova");
  const [f, setF] = useState<Form>(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const abrir = (p: CardioPrescricao | null) => {
    setErro(null);
    setF(p ? doRegistro(p) : VAZIO);
    setEditando(p ? p.id : "nova");
  };

  async function salvar() {
    setSalvando(true);
    setErro(null);
    const n = (v: string) => (v.trim() ? Number(v) : null);
    const corpo = {
      ...f,
      nome: f.nome.trim() || null,
      treino_id: (f.vinculo === "apos_treino" || f.vinculo === "antes_treino") && f.treino_id ? f.treino_id : null,
      fc_alvo_min: n(f.fc_alvo_min),
      fc_alvo_max: n(f.fc_alvo_max),
      intervalos: f.tipo === "intervalado" ? f.intervalos.trim() || null : null,
      observacoes: f.observacoes.trim() || null,
      substitui_id: editando && editando !== "nova" ? editando : null,
    };
    const r = await fetch(`/api/alunos/${alunoId}/cardio`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) }).catch(() => null);
    setSalvando(false);
    if (!r?.ok) {
      const d = await r?.json().catch(() => ({}));
      setErro(d?.error ?? d?.detalhes?.[0]?.message ?? "Não foi possível salvar agora.");
      return;
    }
    setEditando(null);
    router.refresh();
  }

  async function encerrar(id: string) {
    if (!confirm("Encerrar esta prescrição de cardio? O histórico continua guardado.")) return;
    const r = await fetch(`/api/alunos/${alunoId}/cardio`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prescricao_id: id }) }).catch(() => null);
    if (r?.ok) router.refresh();
    else setErro("Não foi possível encerrar agora.");
  }

  const total = prescricoes.reduce((t, p) => t + p.frequencia_semanal * p.duracao_min, 0);

  return (
    <div className="space-y-3">
      {prescricoes.length ? (
        <ul className="space-y-2">
          {prescricoes.map((p) => (
            <li key={p.id} className="rounded-xl border border-border p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{infoModalidade(p.modalidade).emoji} {p.nome ?? infoModalidade(p.modalidade).nome} · {p.duracao_min} min · {p.frequencia_semanal}×/semana</p>
                  <p className="text-xs text-fg-muted">
                    {INTENSIDADES[p.intensidade].nome} · {p.tipo === "intervalado" ? `intervalado${p.intervalos ? ` (${p.intervalos})` : ""}` : "contínuo"} · {VINCULO[p.vinculo]}
                    {p.treino_id ? ` (treino ${treinos.find((t) => t.id === p.treino_id)?.letra ?? "?"})` : ""}
                    {p.dias.length ? ` · ${p.dias.map((d) => DIAS_SEMANA[d]).join(", ")}` : " · qualquer dia"}
                    {p.fc_alvo_min || p.fc_alvo_max ? ` · FC ${p.fc_alvo_min ?? "?"}–${p.fc_alvo_max ?? "?"}` : ""}
                  </p>
                  {p.observacoes ? <p className="mt-1 text-xs">📝 {p.observacoes}</p> : null}
                  <p className="mt-1 text-[11px] text-fg-subtle">Desde {new Date(p.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
                </div>
                <div className="flex gap-2 text-xs">
                  <button type="button" onClick={() => abrir(p)} className="alvo rounded-md border border-border px-3 py-1.5">Ajustar</button>
                  <button type="button" onClick={() => void encerrar(p.id)} className="alvo rounded-md border border-border px-3 py-1.5 text-fg-muted">Encerrar</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {prescricoes.length ? <p className="text-xs text-fg-muted">Meta da semana: <strong>{total} min</strong> em {Math.min(7, prescricoes.reduce((t, p) => t + p.frequencia_semanal, 0))} sessões.</p> : null}

      {editando ? (
        <div className="space-y-3 rounded-xl border border-accent/40 bg-accent/5 p-3 text-sm">
          <p className="font-bold">{editando === "nova" ? "Prescrever cardio" : "Ajustar prescrição (a anterior fica no histórico)"}</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            <button type="button" aria-pressed={f.modalidade === "livre"} onClick={() => setF({ ...f, modalidade: "livre" })} className={`touch col-span-3 rounded-lg border px-2 py-2 text-xs sm:col-span-4 ${f.modalidade === "livre" ? "border-accent bg-accent/15 font-bold" : "border-border"}`}>
              {MODALIDADE_LIVRE.emoji} Livre: o aluno escolhe e marca qual fez
            </button>
            {MODALIDADE_IDS.map((m) => (
              <button key={m} type="button" aria-pressed={f.modalidade === m} onClick={() => setF({ ...f, modalidade: m })} className={`touch rounded-lg border px-2 py-2 text-xs ${f.modalidade === m ? "border-accent bg-accent/15 font-bold" : "border-border"}`}>
                {MODALIDADES[m].emoji} {MODALIDADES[m].nome}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Num rotulo="Duração (min)" valor={f.duracao_min} min={5} max={240} onChange={(v) => setF({ ...f, duracao_min: v })} />
            <Num rotulo="Vezes por semana" valor={f.frequencia_semanal} min={1} max={7} onChange={(v) => setF({ ...f, frequencia_semanal: v })} />
            <label className="block"><span className="text-xs text-fg-muted">FC-alvo mín.</span><input inputMode="numeric" value={f.fc_alvo_min} onChange={(e) => setF({ ...f, fc_alvo_min: e.target.value.replace(/\D/g, "").slice(0, 3) })} className="mt-1 h-10 w-full rounded-md border border-border bg-card px-2" placeholder="opcional" /></label>
            <label className="block"><span className="text-xs text-fg-muted">FC-alvo máx.</span><input inputMode="numeric" value={f.fc_alvo_max} onChange={(e) => setF({ ...f, fc_alvo_max: e.target.value.replace(/\D/g, "").slice(0, 3) })} className="mt-1 h-10 w-full rounded-md border border-border bg-card px-2" placeholder="opcional" /></label>
          </div>
          <Grupo rotulo="Intensidade">
            {(Object.keys(INTENSIDADES) as IntensidadeCardio[]).map((k) => (
              <Chip key={k} ativo={f.intensidade === k} onClick={() => setF({ ...f, intensidade: k })}>{INTENSIDADES[k].nome}</Chip>
            ))}
          </Grupo>
          <Grupo rotulo="Tipo">
            <Chip ativo={f.tipo === "continuo"} onClick={() => setF({ ...f, tipo: "continuo" })}>Contínuo</Chip>
            <Chip ativo={f.tipo === "intervalado"} onClick={() => setF({ ...f, tipo: "intervalado" })}>Intervalado</Chip>
          </Grupo>
          {f.tipo === "intervalado" ? <input value={f.intervalos} maxLength={200} onChange={(e) => setF({ ...f, intervalos: e.target.value })} placeholder="Ex.: 8× 30 s forte + 90 s leve" className="h-10 w-full rounded-md border border-border bg-card px-2" /> : null}
          <Grupo rotulo="Dias recomendados (nenhum = qualquer dia)">
            {DIAS_SEMANA.map((d, i) => (
              <Chip key={d} ativo={f.dias.includes(i)} onClick={() => setF({ ...f, dias: f.dias.includes(i) ? f.dias.filter((x) => x !== i) : [...f.dias, i] })}>{d}</Chip>
            ))}
          </Grupo>
          <Grupo rotulo="Quando">
            {(Object.keys(VINCULO) as Array<keyof typeof VINCULO>).map((v) => (
              <Chip key={v} ativo={f.vinculo === v} onClick={() => setF({ ...f, vinculo: v })}>{VINCULO[v]}</Chip>
            ))}
          </Grupo>
          {(f.vinculo === "apos_treino" || f.vinculo === "antes_treino") && treinos.length ? (
            <label className="block"><span className="text-xs text-fg-muted">Ligado a um treino (opcional)</span>
              <select value={f.treino_id} onChange={(e) => setF({ ...f, treino_id: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-border bg-card px-2">
                <option value="">Qualquer treino</option>
                {treinos.map((t) => <option key={t.id} value={t.id}>Treino {t.letra} · {t.nome}</option>)}
              </select>
            </label>
          ) : null}
          <label className="block"><span className="text-xs text-fg-muted">Nome (opcional)</span><input value={f.nome} maxLength={60} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex.: Caminhada do sábado" className="mt-1 h-10 w-full rounded-md border border-border bg-card px-2" /></label>
          <label className="block"><span className="text-xs text-fg-muted">Observações para o aluno</span><textarea rows={2} maxLength={500} value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-card p-2" /></label>
          {erro ? <p className="text-danger" role="alert">{erro}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={salvando} onClick={() => void salvar()} className="alvo rounded-md bg-accent px-4 py-2 font-bold text-bg disabled:opacity-50">{salvando ? "Salvando…" : "Salvar prescrição"}</button>
            {prescricoes.length ? <button type="button" onClick={() => setEditando(null)} className="alvo rounded-md border border-border px-4 py-2">Cancelar</button> : null}
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => abrir(null)} className="alvo rounded-md border border-accent/50 px-4 py-2 text-sm font-semibold text-accent">➕ Prescrever cardio</button>
      )}
    </div>
  );
}

function Num({ rotulo, valor, min, max, onChange }: { rotulo: string; valor: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-fg-muted">{rotulo}</span>
      <input type="number" min={min} max={max} value={valor} onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))} className="mt-1 h-10 w-full rounded-md border border-border bg-card px-2" />
    </label>
  );
}
function Grupo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs text-fg-muted">{rotulo}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={ativo} onClick={onClick} className={`touch rounded-full border px-3 py-1.5 text-xs ${ativo ? "border-accent bg-accent/15 font-bold text-accent" : "border-border"}`}>
      {children}
    </button>
  );
}
