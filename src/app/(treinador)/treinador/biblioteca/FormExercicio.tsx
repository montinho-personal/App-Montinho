"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldHint } from "@/components/ui/Input";
import { GRUPO_LABEL, GRUPOS_SELECIONAVEIS } from "@/lib/grupos";
import { parseVideoSource } from "@/lib/video";
import { sugerirPesosSecundarios } from "@/lib/biblioteca/pesos";
import {
  ARTICULACAO_LABEL,
  CAMPO_REGISTRO_LABEL,
  EQUIPAMENTO_LABEL,
  NIVEL_LABEL,
  PADRAO_LABEL,
  REGIAO_ESTRESSE_LABEL,
  type Articulacao,
  type CampoRegistro,
  type ItemBiblioteca,
  type Nivel,
  type PadraoMovimento,
  type RegiaoEstresse,
} from "@/lib/biblioteca/tipos";
import type { Equipamento, GrupoMuscular } from "@/lib/supabase/types-extended";

const linhas = (t: string) => t.split("\n").map((s) => s.trim()).filter(Boolean);
const lista = (t: string) => t.split(",").map((s) => s.trim()).filter(Boolean);

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export function FormExercicio({ inicial, itens, onCancelar, onSalvo }: { inicial: ItemBiblioteca | null; itens: ItemBiblioteca[]; onCancelar: () => void; onSalvo: (i: ItemBiblioteca) => void }) {
  const toast = useToast();
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [sinonimos, setSinonimos] = useState((inicial?.sinonimos ?? []).join(", "));
  const [grupo, setGrupo] = useState<GrupoMuscular>(inicial?.grupo ?? "nao_classificado");
  const [pesos, setPesos] = useState<Partial<Record<GrupoMuscular, number>>>(inicial?.pesosSecundarios ?? {});
  const [padrao, setPadrao] = useState<PadraoMovimento | "">(inicial?.padrao ?? "");
  const [articulacoes, setArticulacoes] = useState<Articulacao[]>(inicial?.articulacoes ?? []);
  const [equipamento, setEquipamento] = useState<Equipamento[]>(inicial?.equipamento ?? []);
  const [tipo, setTipo] = useState(inicial?.tipo ?? "");
  const [nivel, setNivel] = useState<Nivel | "">(inicial?.nivel ?? "");
  const [execucao, setExecucao] = useState((inicial?.execucao ?? []).join("\n"));
  const [erros, setErros] = useState((inicial?.erros ?? []).join("\n"));
  const [registro, setRegistro] = useState<CampoRegistro[]>(inicial?.registro ?? ["carga", "repeticoes"]);
  const [estresse, setEstresse] = useState<RegiaoEstresse[]>(inicial?.estresse ?? []);
  const [contaVolume, setContaVolume] = useState(inicial?.contaVolume ?? true);
  const [video, setVideo] = useState(inicial?.midia ? (inicial.midia.provider === "youtube" ? `https://youtu.be/${inicial.midia.id}` : inicial.midia.id) : "");
  const [verificado, setVerificado] = useState(inicial?.midia?.verificada ?? false);
  const [salvando, setSalvando] = useState(false);
  // Pesos dos secundários: sem nada salvo, o formulário usa a sugestão automática
  // (exercícios parecidos da biblioteca) até o treinador mexer em algum peso.
  const [pesosEditados, setPesosEditados] = useState(Object.keys(inicial?.pesosSecundarios ?? {}).length > 0);
  const sugestao = useMemo(() => sugerirPesosSecundarios(grupo, padrao || null, itens, inicial?.id), [grupo, padrao, itens, inicial?.id]);
  const pesosEfetivos = pesosEditados ? pesos : sugestao.pesos;
  const usandoSugestao = !pesosEditados;
  const temSugestao = Object.keys(sugestao.pesos).length > 0;
  function setPeso(g: GrupoMuscular, v: string) {
    setPesos({ ...pesosEfetivos, [g]: v === "" ? undefined : Math.max(0, Math.min(1, Number(v))) });
    setPesosEditados(true);
  }
  function usarSugestao() {
    setPesos(sugestao.pesos);
    setPesosEditados(false);
  }

  const fonte = parseVideoSource(video);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (nome.trim().length < 2) return toast.error("Informe o nome do exercício.");
    if (video.trim() && !fonte) return toast.error("Link de vídeo não reconhecido (use YouTube ou Cloudflare Stream).");
    setSalvando(true);
    const corpo = {
      nome: nome.trim(),
      sinonimos: lista(sinonimos),
      grupo_muscular: grupo,
      pesos_secundarios: Object.fromEntries(Object.entries(pesosEfetivos).filter(([g, w]) => g !== grupo && w && w > 0)),
      padrao_movimento: padrao || null,
      articulacoes,
      equipamento,
      tipo_movimento: tipo || null,
      nivel_minimo: nivel || null,
      instrucoes: linhas(execucao),
      erros_comuns: linhas(erros),
      campos_registro: registro.length ? registro : ["carga", "repeticoes"],
      estresse_articular: estresse,
      conta_volume: contaVolume,
      video_provider: fonte?.provider ?? null,
      video_id: fonte?.id ?? null,
      video_validado: !!fonte && verificado,
    };
    const res = await fetch(inicial ? `/api/biblioteca/${inicial.id}` : "/api/biblioteca", {
      method: inicial ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    }).catch(() => null);
    setSalvando(false);
    const dados = await res?.json().catch(() => ({}));
    if (!res?.ok) return toast.error(dados?.error ?? "Não foi possível salvar.");
    toast.success(inicial ? "Exercício atualizado. Treinos já prescritos não mudam." : "Exercício cadastrado.");
    onSalvo(dados as ItemBiblioteca);
  }

  return (
    <form onSubmit={salvar} className="space-y-4 rounded-xl border border-border bg-card p-5" aria-label={inicial ? "Editar exercício" : "Novo exercício"}>
      <h2 className="text-lg font-bold">{inicial ? `Editar: ${inicial.nome}` : "Novo exercício"}</h2>
      {inicial?.origem === "catalogo" ? <FieldHint>Item do catálogo: ao salvar, vira uma versão sua e futuras atualizações do catálogo não sobrescrevem sua edição.</FieldHint> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="ex-nome">Nome</Label>
          <Input id="ex-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="ex-sin">Sinônimos (separados por vírgula)</Label>
          <Input id="ex-sin" value={sinonimos} onChange={(e) => setSinonimos(e.target.value)} placeholder="pulley, puxada alta" />
        </div>
        <div>
          <Label htmlFor="ex-grupo">Músculo principal</Label>
          <select id="ex-grupo" value={grupo} onChange={(e) => setGrupo(e.target.value as GrupoMuscular)} className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm">
            {GRUPOS_SELECIONAVEIS.map((g) => <option key={g} value={g}>{GRUPO_LABEL[g]}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="ex-padrao">Padrão de movimento</Label>
          <select id="ex-padrao" value={padrao} onChange={(e) => setPadrao(e.target.value as PadraoMovimento | "")} className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm">
            <option value="">—</option>
            {(Object.keys(PADRAO_LABEL) as PadraoMovimento[]).map((p) => <option key={p} value={p}>{PADRAO_LABEL[p]}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="ex-tipo">Tipo</Label>
          <select id="ex-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm">
            <option value="">—</option>
            <option value="multiarticular">Multiarticular</option>
            <option value="monoarticular">Monoarticular</option>
          </select>
        </div>
        <div>
          <Label htmlFor="ex-nivel">Nível sugerido</Label>
          <select id="ex-nivel" value={nivel} onChange={(e) => setNivel(e.target.value as Nivel | "")} className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm">
            <option value="">—</option>
            {(Object.keys(NIVEL_LABEL) as Nivel[]).map((n) => <option key={n} value={n}>{NIVEL_LABEL[n]}</option>)}
          </select>
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-fg-muted mb-1">Músculos secundários e peso no volume ponderado (0 a 1)</legend>
        <p className="mb-2 text-xs text-fg-muted" aria-live="polite">
          {!padrao
            ? "Escolha o padrão de movimento: os pesos são preenchidos automaticamente."
            : usandoSugestao && temSugestao
              ? `Preenchido automaticamente com base em ${sugestao.baseadoEm} exercício(s) parecido(s) da biblioteca (${PADRAO_LABEL[padrao]}). Ajuste se quiser; vale ao salvar.`
              : usandoSugestao
                ? `Exercícios parecidos (${PADRAO_LABEL[padrao]}) não têm músculo secundário relevante: o volume conta só para ${GRUPO_LABEL[grupo]}. Preencha abaixo se quiser.`
                : "Pesos definidos por você."}
          {!usandoSugestao && temSugestao ? (
            <button type="button" onClick={usarSugestao} className="ml-1 font-semibold text-accent underline-offset-2 hover:underline">
              Usar sugestão automática
            </button>
          ) : null}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {GRUPOS_SELECIONAVEIS.filter((g) => g !== grupo && !["cardio", "full_body", "nao_classificado", "ombros", "pernas"].includes(g))
            .sort((a, b) => Number(!!pesosEfetivos[b]) - Number(!!pesosEfetivos[a]))
            .map((g) => (
              <label key={g} className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-xs ${pesosEfetivos[g] ? "border-accent bg-accent/10 font-semibold" : "border-border"}`}>
                <span>{GRUPO_LABEL[g]}</span>
                <input type="number" inputMode="decimal" min={0} max={1} step={0.25} value={pesosEfetivos[g] ?? ""} onChange={(e) => setPeso(g, e.target.value)} className="w-14 rounded border border-border bg-bg px-1 text-right" aria-label={`Peso de ${GRUPO_LABEL[g]}`} />
              </label>
            ))}
        </div>
      </fieldset>

      <Marcadores titulo="Equipamento" opcoes={(Object.keys(EQUIPAMENTO_LABEL) as Equipamento[]).filter((k) => !["esteira", "bike", "outro", "cabo"].includes(k))} rotulo={(k) => EQUIPAMENTO_LABEL[k]} valor={equipamento} onChange={setEquipamento} />
      <Marcadores titulo="Articulações" opcoes={Object.keys(ARTICULACAO_LABEL) as Articulacao[]} rotulo={(k) => ARTICULACAO_LABEL[k]} valor={articulacoes} onChange={setArticulacoes} />
      <Marcadores titulo="Campos que o aluno registra" opcoes={Object.keys(CAMPO_REGISTRO_LABEL) as CampoRegistro[]} rotulo={(k) => CAMPO_REGISTRO_LABEL[k]} valor={registro} onChange={setRegistro} />
      <Marcadores titulo="Atenção articular (usado nas substituições)" opcoes={Object.keys(REGIAO_ESTRESSE_LABEL) as RegiaoEstresse[]} rotulo={(k) => REGIAO_ESTRESSE_LABEL[k]} valor={estresse} onChange={setEstresse} />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={contaVolume} onChange={(e) => setContaVolume(e.target.checked)} /> Conta séries no volume semanal
      </label>

      <div>
        <Label htmlFor="ex-exec">Orientações de execução (uma por linha; o aluno vê)</Label>
        <textarea id="ex-exec" value={execucao} onChange={(e) => setExecucao(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm" />
      </div>
      <div>
        <Label htmlFor="ex-erros">Erros técnicos frequentes (uma por linha)</Label>
        <textarea id="ex-erros" value={erros} onChange={(e) => setErros(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm" />
      </div>

      <div className="space-y-2 rounded-lg border border-border p-3">
        <Label htmlFor="ex-video">Vídeo demonstrativo (YouTube ou Cloudflare Stream)</Label>
        <Input id="ex-video" value={video} onChange={(e) => { setVideo(e.target.value); setVerificado(false); }} placeholder="https://youtu.be/..." />
        {video.trim() && !fonte ? <FieldHint error>Link não reconhecido.</FieldHint> : null}
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={verificado} disabled={!fonte} onChange={(e) => setVerificado(e.target.checked)} className="mt-1" />
          <span>Assisti e confirmo que o vídeo mostra este exercício corretamente. <span className="text-fg-subtle">Só vídeos verificados aparecem para o aluno.</span></span>
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancelar}>Cancelar</Button>
        <Button type="submit" variant="primary" loading={salvando}>Salvar</Button>
      </div>
    </form>
  );
}

function Marcadores<T extends string>({ titulo, opcoes, rotulo, valor, onChange }: { titulo: string; opcoes: T[]; rotulo: (k: T) => string; valor: T[]; onChange: (v: T[]) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-fg-muted mb-1">{titulo}</legend>
      <div className="flex flex-wrap gap-1.5">
        {opcoes.map((k) => (
          <button key={k} type="button" aria-pressed={valor.includes(k)} onClick={() => onChange(toggle(valor, k))} className={`rounded-md border px-2 py-1 text-xs ${valor.includes(k) ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted"}`}>
            {rotulo(k)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
