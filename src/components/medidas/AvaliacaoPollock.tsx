"use client";

// Avaliação física completa de 7 dobras (Jackson & Pollock + Siri), feita pelo
// personal na hora, com o aluno na frente: anota as leituras do adipômetro em
// rodízio (1ª, 2ª e 3ª volta), o app escolhe o valor de cada ponto (mediana/
// média), avisa quando as leituras não batem e calcula densidade, % de gordura,
// massa gorda e massa magra enquanto preenche. Rascunho guardado no aparelho:
// fechar a tela no meio não perde nada. Contas em src/lib/medidas/pollock.ts.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CAMPOS_MEDIDA, lerMedida, type ChaveMedida } from "@/lib/medidas/campos";
import { calcularPollock, extrasDoPollock, idadeNaData, PONTOS_7_DOBRAS, type PontoDobra, type SexoAvaliacao } from "@/lib/medidas/pollock";
import { Button } from "@/components/ui/Button";

type Leituras = Record<PontoDobra, [string, string, string]>;
type Rascunho = { data: string; sexo: SexoAvaliacao | ""; idade: string; peso: string; altura: string; leituras: Leituras; circ: Partial<Record<ChaveMedida, string>>; obs: string };

const hojeBR = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const num = (t: string) => {
  const n = Number(t.trim().replace(",", "."));
  return t.trim() && Number.isFinite(n) ? n : null;
};
const br = (v: number, casas = 1) => v.toLocaleString("pt-BR", { maximumFractionDigits: casas });
const vazias = (): Leituras => Object.fromEntries(PONTOS_7_DOBRAS.map((p) => [p.chave, ["", "", ""]])) as unknown as Leituras;
const CIRCUNFERENCIAS = CAMPOS_MEDIDA.filter((c) => c.grupo === "circunferencias");

export function AvaliacaoPollock({ alunoId, sexo, nascimento, ultimoPeso, altura, onFechar }: { alunoId: string; sexo: SexoAvaliacao | null; nascimento: string | null; ultimoPeso: number | null; altura: number | null; onFechar: () => void }) {
  const router = useRouter();
  const chave = `montinho-pollock:${alunoId}`;
  const inicial = (): Rascunho => ({ data: hojeBR(), sexo: sexo ?? "", idade: String(idadeNaData(nascimento, hojeBR()) ?? ""), peso: ultimoPeso ? String(ultimoPeso).replace(".", ",") : "", altura: altura ? String(altura) : "", leituras: vazias(), circ: {}, obs: "" });
  const [r, setR] = useState<Rascunho>(inicial);
  const [recuperado, setRecuperado] = useState(false);
  const [aberto, setAberto] = useState<PontoDobra | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Rascunho no aparelho (a avaliação pode ser interrompida).
  useEffect(() => {
    try {
      const v = localStorage.getItem(chave);
      const salvo = v ? (JSON.parse(v) as Rascunho) : null;
      // Só conta como “avaliação em andamento” se já tinha alguma dobra anotada.
      if (salvo && Object.values(salvo.leituras ?? {}).some((l) => l.some((x) => x.trim()))) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- rascunho só existe no navegador
        setR({ ...inicial(), ...salvo });
        setRecuperado(true);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(chave, JSON.stringify(r));
    } catch {}
  }, [chave, r]);

  const res = useMemo(
    () =>
      calcularPollock({
        sexo: r.sexo || null,
        idade: num(r.idade),
        pesoKg: num(r.peso),
        leituras: Object.fromEntries(Object.entries(r.leituras).map(([k, v]) => [k, v.map(num)])) as never,
      }),
    [r]
  );

  const mudarLeitura = (p: PontoDobra, i: number, v: string) => setR((x) => ({ ...x, leituras: { ...x.leituras, [p]: x.leituras[p].map((y, j) => (j === i ? v : y)) as [string, string, string] } }));
  const mudarData = (data: string) => setR((x) => ({ ...x, data, idade: idadeNaData(nascimento, data) != null ? String(idadeNaData(nascimento, data)) : x.idade }));

  function descartar() {
    try {
      localStorage.removeItem(chave);
    } catch {}
    setR(inicial());
    setRecuperado(false);
  }

  async function salvar() {
    setErro(null);
    if (!res.completo || res.gorduraPct == null) return setErro("Complete as 7 dobras, o sexo e a idade para salvar.");
    const peso = num(r.peso);
    if (peso == null || peso < 20 || peso > 350) return setErro("Informe o peso (kg) para calcular a massa magra e a massa gorda.");
    const circ: Partial<Record<ChaveMedida, number>> = {};
    for (const c of CIRCUNFERENCIAS) {
      const { valor, erro: er } = lerMedida(c, r.circ[c.chave] ?? "");
      if (er) return setErro(er);
      if (valor != null) circ[c.chave] = valor;
    }
    const alt = num(r.altura);
    setSalvando(true);
    try {
      const corpo = {
        aluno_id: alunoId,
        data: r.data,
        peso_kg: peso,
        ...(alt && alt >= 100 && alt <= 250 ? { altura_cm: alt } : {}),
        gordura_pct: res.gorduraPct,
        ...(res.massaMagraKg != null ? { massa_magra_kg: res.massaMagraKg } : {}),
        ...circ,
        extras: extrasDoPollock(res),
        observacoes: `Avaliação de 7 dobras (Jackson & Pollock + Siri), ${r.sexo === "M" ? "homem" : "mulher"}, ${r.idade} anos.${r.obs.trim() ? ` ${r.obs.trim()}` : ""}`.slice(0, 500),
      };
      const resp = await fetch("/api/medidas", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(j.error ?? "Não foi possível salvar a avaliação.");
      try {
        localStorage.removeItem(chave);
      } catch {}
      router.refresh();
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Algo deu errado.");
    } finally {
      setSalvando(false);
    }
  }

  const feitos = PONTOS_7_DOBRAS.length - res.faltam.length;

  return (
    <div className="space-y-4 rounded-xl border border-accent/50 bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-extrabold">🩺 Avaliação física — 7 dobras</p>
          <p className="text-xs text-fg-muted">Jackson & Pollock + Siri. Vai calculando enquanto você anota.</p>
        </div>
        <button type="button" onClick={onFechar} className="alvo rounded-full border border-border px-3 py-1 text-xs font-semibold text-fg-muted">Fechar</button>
      </div>
      {recuperado ? (
        <p className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
          Continuando a avaliação que estava em andamento neste aparelho.
          <button type="button" onClick={descartar} className="font-semibold underline">Começar do zero</button>
        </p>
      ) : null}

      {/* Dados da pessoa */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <label className="text-xs font-semibold">Data<input type="date" value={r.data} max={hojeBR()} onChange={(e) => mudarData(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-bg px-2 py-2 text-sm" /></label>
        <div className="text-xs font-semibold">
          Sexo
          <div className="mt-1 grid grid-cols-2 gap-1">
            {(["F", "M"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setR((x) => ({ ...x, sexo: s }))} className={`touch rounded-lg border px-2 py-2 text-sm ${r.sexo === s ? "border-accent bg-accent/15 font-bold text-accent" : "border-border"}`}>{s === "F" ? "Mulher" : "Homem"}</button>
            ))}
          </div>
        </div>
        <label className="text-xs font-semibold">Idade (anos)<input inputMode="numeric" value={r.idade} onChange={(e) => setR((x) => ({ ...x, idade: e.target.value }))} className="mt-1 block w-full rounded-lg border border-border bg-bg px-2 py-2 text-sm font-mono" /></label>
        <label className="text-xs font-semibold">Peso (kg)<input inputMode="decimal" value={r.peso} onChange={(e) => setR((x) => ({ ...x, peso: e.target.value }))} placeholder="—" className="mt-1 block w-full rounded-lg border border-border bg-bg px-2 py-2 text-sm font-mono" /></label>
        <label className="text-xs font-semibold">Altura (cm)<input inputMode="decimal" value={r.altura} onChange={(e) => setR((x) => ({ ...x, altura: e.target.value }))} placeholder="—" className="mt-1 block w-full rounded-lg border border-border bg-bg px-2 py-2 text-sm font-mono" /></label>
      </div>

      {/* Dobras */}
      <section className="space-y-2" aria-label="Dobras cutâneas">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-fg-muted">Dobras (mm) · {feitos}/7</h3>
          <p className="text-[10px] text-fg-subtle">Lado direito · meça em rodízio</p>
        </div>
        <p className="rounded-lg bg-bg px-3 py-2 text-[11px] leading-snug text-fg-muted">
          Pince a dobra com polegar e indicador cerca de 1 cm acima do ponto, adipômetro perpendicular, leia 1–2 s depois de soltar. Faça a 1ª volta em todos os pontos, depois a 2ª (e a 3ª se precisar). Com 3 leituras vale a do meio; com 2, a média.
        </p>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {PONTOS_7_DOBRAS.map((p) => {
            const v = res.pontos[p.chave];
            const remedir = res.remedir.includes(p.chave);
            return (
              <li key={p.chave} className="px-2 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">{p.nome} <span className="text-[10px] font-normal text-fg-subtle">· {p.direcao}</span></p>
                  <button type="button" onClick={() => setAberto(aberto === p.chave ? null : p.chave)} className="alvo shrink-0 text-[11px] font-semibold text-accent" aria-expanded={aberto === p.chave}>
                    {aberto === p.chave ? "▲ esconder" : "ⓘ onde medir"}
                  </button>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  {[0, 1, 2].map((i) => (
                    <input
                      key={i}
                      inputMode="decimal"
                      value={r.leituras[p.chave][i]}
                      onChange={(e) => mudarLeitura(p.chave, i, e.target.value)}
                      placeholder={`${i + 1}ª`}
                      aria-label={`${p.nome}, ${i + 1}ª leitura`}
                      className={`min-w-0 flex-1 rounded-lg border bg-bg px-1 py-2 text-center text-sm font-mono ${remedir ? "border-warning" : "border-border"}`}
                    />
                  ))}
                  <span className={`w-14 shrink-0 text-right font-mono text-base font-bold ${v != null ? (remedir ? "text-warning" : "text-accent") : "text-fg-subtle"}`}>{v != null ? br(v) : "—"}</span>
                </div>
                {aberto === p.chave ? (
                  <p className="mt-1.5 rounded-lg bg-bg px-2 py-1.5 text-xs text-fg-muted">
                    {r.sexo === "F" && p.comoMulher ? p.comoMulher : p.como}
                  </p>
                ) : null}
                {remedir ? <p className="mt-1 text-[10px] text-warning">Leituras com mais de 2 mm de diferença: meça de novo.</p> : null}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Resultado */}
      <section className="rounded-xl border border-accent/40 bg-accent/10 p-3" aria-live="polite">
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Resultado</p>
        {res.gorduraPct != null ? (
          <div className="mt-2 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            <Numero rotulo="% de gordura" valor={`${br(res.gorduraPct)}%`} grande />
            <Numero rotulo="Soma das 7 dobras" valor={`${br(res.soma ?? 0)} mm`} />
            <Numero rotulo="Massa gorda" valor={res.massaGordaKg != null ? `${br(res.massaGordaKg)} kg` : "—"} />
            <Numero rotulo="Massa magra" valor={res.massaMagraKg != null ? `${br(res.massaMagraKg)} kg` : "—"} />
          </div>
        ) : (
          <p className="mt-1 text-sm text-fg-muted">{res.completo ? "Falta sexo ou idade." : `Faltam ${res.faltam.length} ${res.faltam.length === 1 ? "dobra" : "dobras"} para calcular.`}</p>
        )}
        {res.densidade != null ? <p className="mt-2 text-[11px] text-fg-subtle">Densidade corporal: {res.densidade.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} g/mL</p> : null}
        {res.avisos.map((a) => (
          <p key={a} className="mt-1 text-[11px] text-warning">⚠ {a}</p>
        ))}
      </section>

      {/* Circunferências (opcional, na mesma avaliação) */}
      <details className="rounded-xl border border-border px-3 py-2">
        <summary className="cursor-pointer text-sm font-semibold">📏 Circunferências (opcional)</summary>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CIRCUNFERENCIAS.map((c) => (
            <label key={c.chave} className="text-xs font-semibold">
              {c.rotulo} <span className="font-normal text-fg-subtle">(cm)</span>
              <input inputMode="decimal" value={r.circ[c.chave] ?? ""} onChange={(e) => setR((x) => ({ ...x, circ: { ...x.circ, [c.chave]: e.target.value } }))} placeholder="—" className="mt-1 block w-full rounded-lg border border-border bg-bg px-2 py-2 text-sm font-mono" />
            </label>
          ))}
        </div>
      </details>

      <label className="block text-xs font-semibold">
        Observação (opcional)
        <textarea value={r.obs} onChange={(e) => setR((x) => ({ ...x, obs: e.target.value.slice(0, 300) }))} rows={2} placeholder="Ex.: adipômetro Cescorf, avaliação pela manhã" className="mt-1 block w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm" />
      </label>

      {erro ? <p className="text-sm font-semibold text-red-400" role="alert">{erro}</p> : null}
      <Button type="button" onClick={salvar} disabled={salvando || res.gorduraPct == null} className="w-full">
        {salvando ? "Salvando…" : res.gorduraPct != null ? `Salvar avaliação (${br(res.gorduraPct)}% de gordura)` : "Salvar avaliação"}
      </Button>
      <p className="text-[10px] leading-snug text-fg-subtle">
        Equações de Jackson & Pollock (1978, homens 18–61 anos) e Jackson, Pollock & Ward (1980, mulheres 18–55 anos), % de gordura por Siri (1961). Cada dobra, a soma e a densidade ficam guardadas para comparar com a próxima avaliação.
      </p>
    </div>
  );
}

function Numero({ rotulo, valor, grande = false }: { rotulo: string; valor: string; grande?: boolean }) {
  return (
    <div className="rounded-lg bg-bg px-2 py-2">
      <p className={`font-mono font-black ${grande ? "text-2xl text-accent" : "text-base"}`}>{valor}</p>
      <p className="text-[10px] text-fg-subtle">{rotulo}</p>
    </div>
  );
}
