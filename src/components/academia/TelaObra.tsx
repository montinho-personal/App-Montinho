// Tela da obra (em andamento ou inaugurada): ilustração grande, etapa, números
// reais, próximo marco, previsão, a parte da pessoa e quem está construindo.
import Link from "next/link";
import { AcademiaIlustracao } from "./AcademiaIlustracao";
import { BarraObra } from "./BarraObra";
import { conversao, duracaoTexto, ETAPAS, etapaDe, frasesDaObra, infoModelo, materiaisDesbloqueados, pctDaObra, PREVISAO, previsaoDaObra, proximoMarco, REFERENCIAS_OBRA, textoMateriais, toneladas, VOCE_SABIA, type DadosObra } from "@/lib/academia/regras";
import type { Participante } from "@/lib/data/academia";

const dataBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });
const mesAno = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });

function Numero({ valor, rotulo, destaque = false }: { valor: string; rotulo: string; destaque?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${destaque ? "border-accent/50 bg-accent/10" : "border-border bg-surface"}`}>
      <p className="text-lg font-black leading-tight">{valor}</p>
      <p className="mt-0.5 text-xs text-fg-muted">{rotulo}</p>
    </div>
  );
}

export function TelaObra({ d, participantes, personal = false }: { d: DadosObra; participantes: Participante[]; personal?: boolean }) {
  const agora = new Date();
  const concluida = d.estado === "concluida";
  const pct = pctDaObra(d.total_kg, d.meta_kg);
  const etapa = etapaDe(pct, concluida);
  const prox = concluida ? null : proximoMarco(d.total_kg, d.meta_kg);
  const prev = previsaoDaObra(d, agora);
  const mat = materiaisDesbloqueados(d.total_kg, d);
  const info = infoModelo(d.modelo);
  const frases = frasesDaObra(d);
  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">{concluida ? "🎉 Inaugurada" : "🏗️ Em construção"} · {d.ordem}ª obra da tribo</p>
        <h1 className="mt-0.5 text-2xl font-black leading-tight">{d.nome}</h1>
        <p className="text-sm text-fg-muted">
          {d.area_m2.toLocaleString("pt-BR")} m² · {info.descricao}
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-border">
        <AcademiaIlustracao etapa={etapa.n} pavimentos={info.pavimentos} className="block h-auto w-full" titulo={`${d.nome}: ${etapa.nome}`} />
      </div>

      <section className="space-y-2 rounded-2xl border border-accent/40 bg-accent/5 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-bold">
            Etapa {etapa.n} de 7 · <span className="text-accent">{etapa.nome}</span>
          </p>
          <p className="text-2xl font-black">{pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</p>
        </div>
        <BarraObra pct={pct} />
        <ol className="grid grid-cols-7 gap-0.5 text-center text-[9px] leading-tight text-fg-subtle" aria-label="Etapas da obra">
          {ETAPAS.slice(1).map((e) => (
            <li key={e.n} className={pct >= e.pct ? "font-bold text-accent" : undefined}>
              <span className="block">{pct >= e.pct ? "✓" : e.n}</span>
              <span className="block truncate">{e.curto}</span>
            </li>
          ))}
        </ol>
        <p className="pt-1 text-sm">“{etapa.texto}”</p>
        {frases.map((f) => (
          <p key={f} className="text-sm text-fg-muted">
            {f}
          </p>
        ))}
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Numero valor={`${toneladas(d.total_kg)} t`} rotulo={`movimentadas pela tribo, de ${toneladas(d.meta_kg)} t`} destaque />
        <Numero valor={textoMateriais(mat)} rotulo={`de materiais na obra, de ${d.materiais_t.toLocaleString("pt-BR")} t`} />
        {prox ? <Numero valor={`${toneladas(prox.faltaKg)} t`} rotulo={`para ${prox.etapa.nome.toLowerCase()}`} /> : null}
        {concluida && d.ativada_em && d.concluida_em ? (
          <Numero valor={duracaoTexto(d.ativada_em, d.concluida_em)} rotulo={`de obra · ${dataBR(d.ativada_em)} a ${dataBR(d.concluida_em)}`} />
        ) : prev.tipo === "data" ? (
          <Numero valor={mesAno(prev.data)} rotulo={`previsão no ritmo dos últimos 14 dias (~${toneladas(prev.kgPorSemana)} t por semana)`} />
        ) : (
          <Numero
            valor={prev.tipo === "calculando" && prev.aPartirDe ? `Em ${dataBR(prev.aPartirDe).slice(0, 5)}` : "Calculando…"}
            rotulo={
              prev.tipo === "calculando" && prev.aPartirDe
                ? `sai a previsão da inauguração: com ${PREVISAO.minDias} dias de obra, pelo ritmo real da tribo`
                : prev.tipo === "calculando" && prev.faltamTreinos
                  ? `a previsão sai com mais ${prev.faltamTreinos} ${prev.faltamTreinos === 1 ? "treino" : "treinos"} na obra`
                  : "o ritmo da tribo ainda está sendo calculado"
            }
          />
        )}
      </div>

      {!personal ? (
        <section className="rounded-2xl border border-border bg-surface p-4">
          {d.meu_kg > 0 ? (
            <p className="text-sm">
              💪 Você já contribuiu com <b className="text-accent">{toneladas(d.meu_kg)} t</b> {concluida ? "nesta construção" : "nesta construção"} em {d.meus_treinos} {d.meus_treinos === 1 ? "treino" : "treinos"}.
              {concluida ? <span className="mt-1 block font-bold">Você ajudou a construir essa academia. 🏆</span> : null}
            </p>
          ) : (
            <p className="text-sm text-fg-muted">{concluida ? "Esta obra foi construída pela tribo." : "Seu próximo treino de musculação concluído entra na obra. Cada série conta!"}</p>
          )}
          {!concluida ? (
            <Link href="/aluno/treinar" className="alvo mt-3 flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-bold text-bg">
              🏋️ Treinar e ajudar na obra
            </Link>
          ) : null}
        </section>
      ) : null}

      <details className="rounded-2xl border border-border bg-surface p-4">
        <summary className="cursor-pointer text-sm font-bold">
          👷 {concluida ? "Quem fez parte" : "Quem está construindo"} ({d.participantes})
        </summary>
        {participantes.length ? (
          <ol className="mt-3 space-y-1.5 text-sm">
            {participantes.map((p, i) => (
              <li key={i} className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1 ${p.eu ? "bg-accent/10 font-semibold" : ""}`}>
                <span>
                  {p.eu ? "Você" : p.nome}
                </span>
                <span className="text-xs text-fg-muted">
                  {p.kg != null ? `${toneladas(p.kg)} t · ` : ""}
                  {p.treinos} {p.treinos === 1 ? "treino" : "treinos"}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-fg-muted">Ainda ninguém. O primeiro treino concluído coloca o primeiro nome aqui.</p>
        )}
      </details>

      <section className="space-y-2 rounded-2xl border border-border p-4 text-sm">
        <p className="font-bold">💡 Você sabia?</p>
        <p className="text-fg-muted">{d.modelo === "bairro" ? VOCE_SABIA : `Uma edificação de cerca de ${d.area_m2.toLocaleString("pt-BR")} m² pode representar por volta de ${d.materiais_t.toLocaleString("pt-BR")} toneladas de materiais, dependendo do projeto e do sistema construtivo.`}</p>
        <p className="text-fg-muted">
          São dois números diferentes: as <b>toneladas da tribo</b> são o peso real levantado nos treinos de musculação (carga × repetições). As <b>toneladas de materiais</b> são uma estimativa ilustrativa da obra. Na brincadeira, cada {conversao(d).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} t de treino “compra” 1 t de material — é uma regra do jogo, não uma conta de física.
        </p>
        <p className="text-xs text-fg-subtle">
          Contam só os treinos de musculação concluídos depois do início da obra. Aquecimento não entra; quem anota o peso “por lado” conta os dois lados. Cardio fica de fora. Treine com segurança: a obra cresce com constância, não com carga exagerada.
        </p>
        <p className="text-xs text-fg-subtle">
          Fontes:{" "}
          {REFERENCIAS_OBRA.map((r, i) => (
            <span key={r.url}>
              {i ? " · " : ""}
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline">
                {r.titulo}
              </a>
            </span>
          ))}
        </p>
      </section>
    </div>
  );
}
