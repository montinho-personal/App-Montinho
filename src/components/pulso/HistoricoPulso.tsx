// Ficha do aluno (personal): histórico do Montinho Pulso. Sem diagnóstico;
// cada categoria mostra o motivo. O acesso fica registrado (dados_saude_acessos).
import { CATEGORIA_ROTULO } from "@/lib/pulso/classificar";
import type { historicoPulso } from "@/lib/data/pulso";
import { TendenciaPulso } from "./TendenciaPulso";

type Dados = Awaited<ReturnType<typeof historicoPulso>>;
const dataBR = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export function HistoricoPulso({ dados }: { dados: Dados }) {
  const c = CATEGORIA_ROTULO[dados.resultado.categoria];
  return (
    <section id="pulso" className="space-y-3 rounded-xl border border-border bg-card p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold">💛 Montinho Pulso</h3>
        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold">{c.emoji} {c.rotulo}</span>
      </header>
      <p className="text-xs text-fg-muted">{c.explica} Não é diagnóstico nem previsão de desistência.</p>
      {dados.resultado.motivos.length ? (
        <ul className="space-y-0.5 text-xs text-fg-muted">{dados.resultado.motivos.map((m) => <li key={m.texto}>• {m.texto}</li>)}</ul>
      ) : null}
      <TendenciaPulso semanas={dados.semanas} />
      {dados.dificuldades.length ? (
        <p className="text-xs text-fg-muted">O que mais dificultou (90 dias): {dados.dificuldades.map((d) => `${d.rotulo} (${d.vezes}×)`).join(", ")}</p>
      ) : null}
      {dados.ultimas.length ? (
        <ul className="divide-y divide-border text-xs">
          {dados.ultimas.map((u) => (
            <li key={u.data} className="flex gap-3 py-1.5">
              <span className="w-12 shrink-0 font-mono text-fg-subtle">{dataBR(u.data)}</span>
              <span className="text-fg-muted">{u.pulou ? "Preferiu pular" : u.respostas.map((r) => `${r.emoji} ${r.rotulo}`).join(" · ")}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-fg-subtle">Ainda sem respostas do Pulso. Não responder é normal e não quer dizer desmotivação.</p>
      )}
      <p className="text-[11px] text-fg-subtle">
        Corpo e sono: {dados.consentimento === "sim" ? "o aluno autorizou guardar" : dados.consentimento === "nao" ? "o aluno preferiu não compartilhar" : "o aluno ainda não respondeu à autorização"}.
      </p>
    </section>
  );
}
