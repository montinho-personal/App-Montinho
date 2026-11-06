// ============================================================================
// Relatório da avaliação física de 7 dobras — documento A4 (tela e PDF),
// pedido do Montinho em 04/11/2026. Quem abre: o personal (qualquer aluno) ou
// o próprio aluno (só as dele), sempre por getSessao + podeAcessarAluno e
// leitura pela RLS. Contas em src/lib/medidas/relatorio-avaliacao.ts.
// Rótulos e cores neutros: o app não diz se subir ou descer é bom.
// ============================================================================
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessao } from "@/lib/auth/session";
import { podeAcessarAluno } from "@/lib/auth/guards";
import { getAluno } from "@/lib/db";
import { listarAvaliacoes, medidaPorId } from "@/lib/data/medidas";
import { ERRO_TIPICO_PCT, relatorioAvaliacao, textoDiferenca, type Linha } from "@/lib/medidas/relatorio-avaliacao";
import { PONTOS_7_DOBRAS } from "@/lib/medidas/pollock";
import { BRAND } from "@/config/brand";
import { dataBR } from "@/lib/format";
import { BaixarPdf } from "@/components/relatorios/premium/BaixarPdf";
import { nomeDoArquivo } from "@/lib/relatorios/nome-arquivo";
import { EnviarRelatorioAvaliacao } from "@/components/medidas/EnviarRelatorioAvaliacao";
import { CompartilharCardRelatorio } from "@/components/relatorios/CompartilharCardRelatorio";
import { cardDaAvaliacao } from "@/lib/relatorios/card-relatorio";
import { evolucaoDoRelatorio, focoDoObjetivo } from "@/lib/medidas/evolucao-avaliacao";
import { ParabensAvaliacao } from "@/components/medidas/ParabensAvaliacao";
import { resumoDaAvaliacao, ROTULO_METODO, type ResumoAvaliacao } from "@/lib/medidas/resumo-avaliacao";

export const metadata = { title: "Relatório da avaliação física", robots: { index: false } };

const br = (v: number | null | undefined, casas = 1) => (v == null ? "—" : v.toLocaleString("pt-BR", { maximumFractionDigits: casas, minimumFractionDigits: 0 }));

const CSS = `
.folha{width:210mm;min-height:297mm;margin:0 auto 24px;background:#faf8f3;color:#1a1814;box-shadow:0 8px 30px rgba(0,0,0,.18);position:relative;display:flex;flex-direction:column;padding:12mm 14mm 10mm;break-after:page;page-break-after:always;overflow:hidden}
.folha .rodape{margin-top:auto;padding-top:6mm;display:flex;justify-content:space-between;font-size:8.5pt;color:#8a8273;letter-spacing:.04em}
.eyebrow{font-size:8.5pt;letter-spacing:.28em;text-transform:uppercase;color:#ba9e50;font-weight:700}
.num{font-variant-numeric:tabular-nums}
.tab{width:100%;border-collapse:collapse;font-size:10pt}
.tab th{font-size:7.5pt;letter-spacing:.14em;text-transform:uppercase;color:#8a8273;text-align:left;padding:5px 6px;border-bottom:1.5px solid #ba9e50}
.tab td{padding:4.5px 6px;border-bottom:1px solid #e4dfd3}
.tab td.n{text-align:right;font-variant-numeric:tabular-nums}
@media screen and (max-width:820px){.folha{width:100%;min-height:auto;padding:22px 16px;margin-bottom:16px}.tab{font-size:9.5pt}}
@page{size:A4;margin:0}
@media print{html,body{background:#fff!important}.folha{margin:0;box-shadow:none;width:210mm;height:297mm;min-height:297mm}.so-tela{display:none!important}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

function Numero({ rotulo, valor, detalhe, destaque = false }: { rotulo: string; valor: string; detalhe?: string; destaque?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-3 ${destaque ? "border-[#ba9e50] bg-[#0a0a0a] text-[#f4f1ea]" : "border-[#e4dfd3] bg-white"}`}>
      <p className={`text-[7.5pt] font-bold uppercase tracking-[0.14em] ${destaque ? "text-[#ba9e50]" : "text-[#8a8273]"}`}>{rotulo}</p>
      <p className={`num mt-1 font-extrabold leading-none ${destaque ? "text-[24pt]" : "text-[17pt]"}`}>{valor}</p>
      {detalhe ? <p className={`mt-1 text-[8pt] ${destaque ? "text-[#c9c2b3]" : "text-[#8a8273]"}`}>{detalhe}</p> : null}
    </div>
  );
}

function Titulo({ eyebrow, titulo }: { eyebrow: string; titulo: string }) {
  return (
    <div className="mb-1.5 mt-4">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-0.5 text-[14pt] font-extrabold leading-tight">{titulo}</h2>
    </div>
  );
}

function TabelaComparada({ linhas, comAnterior, primeira = "Medida" }: { linhas: Linha[]; comAnterior: boolean; primeira?: string }) {
  return (
    <table className="tab">
      <thead>
        <tr>
          <th>{primeira}</th>
          <th style={{ textAlign: "right" }}>Hoje</th>
          {comAnterior ? <th style={{ textAlign: "right" }}>Anterior</th> : null}
          {comAnterior ? <th style={{ textAlign: "right" }}>Diferença</th> : null}
        </tr>
      </thead>
      <tbody>
        {linhas.map((l) => (
          <tr key={l.rotulo}>
            <td className="font-semibold">{l.rotulo}</td>
            <td className="n font-bold">{br(l.atual, l.unidade === "g/mL" ? 4 : 1)} {l.unidade}</td>
            {comAnterior ? <td className="n text-[#8a8273]">{l.anterior == null ? "—" : `${br(l.anterior)} ${l.unidade}`}</td> : null}
            {comAnterior ? <td className="n">{textoDiferenca(l)}</td> : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function RelatorioAvaliacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[\w-]{1,64}$/.test(id)) notFound();
  const sessao = await getSessao();
  if (!sessao) redirect(`/login?next=/avaliacao/${id}`);
  const linha = await medidaPorId(id);
  if (!linha || !podeAcessarAluno(sessao, linha.aluno_id)) notFound();
  const [aluno, { medidas }] = await Promise.all([getAluno(linha.aluno_id), listarAvaliacoes(linha.aluno_id)]);
  if (!aluno) notFound();
  const rel = relatorioAvaliacao(medidas, id, aluno.altura_cm ?? null);
  const nome = aluno.profile?.nome ?? "Aluno";
  const doPersonal = sessao.role === "treinador";
  if (!rel) {
    // Bioimpedância e medidas também têm relatório (06/11/2026, caso da Michelle).
    const resumo = resumoDaAvaliacao(medidas, id, aluno.altura_cm ?? null);
    if (!resumo) notFound();
    return <RelatorioGeral r={resumo} nome={nome} doPersonal={doPersonal} alunoId={aluno.id} telefone={aluno.telefone ?? null} alturaCm={(linha.altura_cm ?? aluno.altura_cm) ?? null} />;
  }
  const evolucao = evolucaoDoRelatorio(rel, focoDoObjetivo(aluno.objetivo));
  const card = cardDaAvaliacao({ rel, nome, evolucao });
  const voltar = doPersonal ? `/treinador/alunos/${aluno.id}/medidas` : "/aluno/medidas";
  const p = rel.principais;
  const comAnterior = !!rel.anterior;
  const sexoTxt = rel.sexo === "F" ? "Mulher" : rel.sexo === "M" ? "Homem" : null;

  return (
    <div className="py-4 md:py-8 print:py-0">
      <style>{CSS}</style>
      <div className="so-tela sticky top-safe z-20 mx-auto mb-5 w-[210mm] max-w-full bg-[#e9e6df]/95 px-4 py-2 text-sm text-[#1a1814] backdrop-blur md:px-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={voltar} className="inline-flex h-10 items-center gap-1 rounded-full border border-[#1a1814]/30 bg-white px-4 font-semibold">← Voltar</Link>
          <BaixarPdf arquivo={nomeDoArquivo("Avaliação Física", nome, rel.data)} />
          <CompartilharCardRelatorio card={card} registrar={!doPersonal} rotulo={doPersonal ? "📲 Card para o aluno" : "📲 Compartilhar"} className="inline-flex h-10 items-center rounded-full border border-[#1a1814]/30 bg-white px-4 font-semibold" />
          {doPersonal ? <EnviarRelatorioAvaliacao id={rel.id} nome={nome} telefone={aluno.telefone ?? null} data={rel.data} /> : null}
        </div>
        {evolucao?.evoluiu ? <div className="mt-2"><ParabensAvaliacao e={evolucao} card={card} personal={doPersonal} claro /></div> : null}
      </div>

      <section className="folha">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Avaliação física · 7 dobras</p>
            <h1 className="mt-1 text-[20pt] font-extrabold leading-tight">{nome}</h1>
            <p className="mt-1 text-[10pt] text-[#5c564b]">
              {dataBR(rel.data)}
              {sexoTxt ? ` · ${sexoTxt}` : ""}
              {rel.idade != null ? ` · ${rel.idade} anos` : ""}
              {p.alturaCm ? ` · ${br(p.alturaCm, 0)} cm` : ""}
            </p>
          </div>
          <div className="rounded-lg bg-[#0a0a0a] px-3 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo oficial completo, também no PDF */}
            <img src={BRAND.logo.full} alt={BRAND.fullName} style={{ height: 52, width: "auto" }} />
          </div>
        </div>
        <div className="mt-3 h-[2px] w-14 bg-[#ba9e50]" />

        <Titulo eyebrow="Resultado" titulo="Composição corporal" />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Numero rotulo="% de gordura" valor={p.gorduraPct != null ? `${br(p.gorduraPct)}%` : "—"} detalhe={`margem da equação: ±${br(ERRO_TIPICO_PCT)} pontos`} destaque />
          <Numero rotulo="Massa magra" valor={p.massaMagraKg != null ? `${br(p.massaMagraKg)} kg` : "—"} detalhe="tudo que não é gordura" />
          <Numero rotulo="Massa gorda" valor={p.massaGordaKg != null ? `${br(p.massaGordaKg)} kg` : "—"} />
          <Numero rotulo="Peso" valor={p.pesoKg != null ? `${br(p.pesoKg)} kg` : "—"} detalhe={p.imc != null ? `IMC ${br(p.imc)} kg/m²` : undefined} />
        </div>

        {comAnterior ? (
          <>
            <Titulo eyebrow="Comparação" titulo={`Em relação à avaliação de ${dataBR(rel.anterior!.data)}`} />
            <TabelaComparada linhas={rel.comparacao} comAnterior />
            <p className="mt-1.5 text-[8pt] text-[#8a8273]">Comparação só com a avaliação anterior de 7 dobras (mesmo método). Bioimpedância e outros métodos dão números diferentes e não entram aqui.</p>
          </>
        ) : (
          <p className="mt-4 rounded-lg border border-[#e4dfd3] bg-white px-3 py-2 text-[9.5pt] text-[#5c564b]">
            🏁 Esta é a sua primeira avaliação de 7 dobras no app: ela é o seu ponto de partida. Na próxima, este relatório mostra a comparação lado a lado.
          </p>
        )}

        <Titulo eyebrow="Detalhe" titulo="As 7 dobras (mm)" />
        <TabelaComparada primeira="Dobra" linhas={rel.dobras} comAnterior={comAnterior} />
        <p className="mt-1.5 text-[9pt] text-[#5c564b]">
          Soma das 7 dobras: <strong className="num">{br(p.soma)} mm</strong>
          {p.densidade != null ? <> · Densidade corporal: <strong className="num">{br(p.densidade, 4)} g/mL</strong></> : null}
        </p>

        <div className="rodape">
          <span>{BRAND.fullName} · Avaliação física · {nome}</span>
          <span>{dataBR(rel.data)} · 1 / 2</span>
        </div>
      </section>

      {/* Folha 2: o PDF tem altura fixa de A4, então o resto vai numa folha própria (antes cortava). */}
      <section className="folha">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">Avaliação física · {nome} · {dataBR(rel.data)}</p>
          <div className="rounded-md bg-[#0a0a0a] px-2 py-1">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo oficial completo, também no PDF */}
            <img src={BRAND.logo.full} alt={BRAND.fullName} style={{ height: 32, width: "auto" }} />
          </div>
        </div>
        {rel.circunferencias.length ? (
          <>
            <Titulo eyebrow="Fita métrica" titulo="Circunferências" />
            <TabelaComparada linhas={rel.circunferencias} comAnterior={rel.circunferencias.some((l) => l.anterior != null)} />
          </>
        ) : null}

        {rel.observacao ? (
          <p className="mt-4 rounded-lg border-l-4 border-[#ba9e50] bg-white px-3 py-2 text-[9.5pt]"><strong>Observação do Montinho:</strong> {rel.observacao}</p>
        ) : null}

        <Titulo eyebrow="Como ler" titulo="Como esta avaliação foi feita" />
        <ul className="list-disc space-y-1 pl-5 text-[9pt] leading-snug text-[#3d382f]">
          <li>Dobras cutâneas medidas com adipômetro, no lado direito do corpo, em {PONTOS_7_DOBRAS.length} pontos: {PONTOS_7_DOBRAS.map((x) => x.nome.toLowerCase()).join(", ")}. Cada ponto foi medido mais de uma vez, em rodízio.</li>
          <li>O % de gordura vem da equação de Jackson & Pollock ({rel.sexo === "F" ? "Jackson, Pollock & Ward, 1980, para mulheres" : rel.sexo === "M" ? "1978, para homens" : "1978 para homens e 1980 para mulheres"}) e da fórmula de Siri (1961). Toda estimativa tem margem: cerca de ±{br(ERRO_TIPICO_PCT)} pontos de % de gordura.</li>
          <li>O mais importante é a <strong>tendência</strong> de uma avaliação para a outra, feita com o mesmo método, pelo mesmo avaliador e nas mesmas condições (horário, sem treinar antes, hidratação parecida).</li>
          <li>A soma das dobras, em milímetros, é o número mais direto: mostra a mudança na gordura sob a pele sem depender da equação.</li>
        </ul>

        <div className="rodape">
          <span>{BRAND.fullName} · Avaliação física · {nome}</span>
          <span>{dataBR(rel.data)} · 2 / 2</span>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Relatório de bioimpedância / medidas (qualquer avaliação que não seja de 7 dobras)
// ---------------------------------------------------------------------------
const valorL = (l: Linha) => `${br(l.atual, l.unidade === "" ? 2 : 1)}${l.unidade === "%" ? "%" : l.unidade ? ` ${l.unidade}` : ""}`;

function RelatorioGeral({ r, nome, doPersonal, alunoId, telefone, alturaCm }: { r: ResumoAvaliacao; nome: string; doPersonal: boolean; alunoId: string; telefone: string | null; alturaCm: number | null }) {
  const voltar = doPersonal ? `/treinador/alunos/${alunoId}/medidas` : "/aluno/medidas";
  const comAnterior = !!r.anterior;
  const [p1, p2, ...resto] = r.principais;
  const seg = (k: string) => r.segmentos.find((s) => s.parte === k);
  const todos = [...r.outros, ...r.tecnicos];
  const temFolha2 = r.circunferencias.length > 0 || todos.length > 0 || !!r.observacao;
  const eyebrow = `Avaliação física · ${ROTULO_METODO[r.metodo]}`;
  return (
    <div className="py-4 md:py-8 print:py-0">
      <style>{CSS}</style>
      <div className="so-tela sticky top-safe z-20 mx-auto mb-5 w-[210mm] max-w-full bg-[#e9e6df]/95 px-4 py-2 text-sm text-[#1a1814] backdrop-blur md:px-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={voltar} className="inline-flex h-10 items-center gap-1 rounded-full border border-[#1a1814]/30 bg-white px-4 font-semibold">← Voltar</Link>
          <BaixarPdf arquivo={nomeDoArquivo("Avaliação Física", nome, r.data)} />
          {doPersonal ? <EnviarRelatorioAvaliacao id={r.id} nome={nome} telefone={telefone} data={r.data} metodo={r.metodo} /> : null}
        </div>
      </div>

      <section className="folha">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-1 text-[20pt] font-extrabold leading-tight">{nome}</h1>
            <p className="mt-1 text-[10pt] text-[#5c564b]">{dataBR(r.data)}{alturaCm ? ` · ${br(alturaCm, 0)} cm` : ""}</p>
          </div>
          <div className="rounded-lg bg-[#0a0a0a] px-3 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo oficial completo, também no PDF */}
            <img src={BRAND.logo.full} alt={BRAND.fullName} style={{ height: 52, width: "auto" }} />
          </div>
        </div>
        <div className="mt-3 h-[2px] w-14 bg-[#ba9e50]" />

        <Titulo eyebrow="Resultado" titulo={r.metodo === "medidas" ? "Suas medidas" : "Composição corporal"} />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {p1 ? <Numero rotulo={p1.rotulo} valor={valorL(p1)} detalhe={p1.diferenca != null ? `${textoDiferenca(p1)} desde a anterior` : undefined} destaque /> : null}
          {p2 ? <Numero rotulo={p2.rotulo} valor={valorL(p2)} detalhe={p2.diferenca != null ? `${textoDiferenca(p2)} desde a anterior` : undefined} destaque /> : null}
          {resto.map((l) => <Numero key={l.rotulo} rotulo={l.rotulo} valor={valorL(l)} detalhe={l.diferenca != null ? textoDiferenca(l) : undefined} />)}
        </div>

        {comAnterior ? (
          <>
            <Titulo eyebrow="Comparação" titulo={`Em relação à avaliação de ${dataBR(r.anterior!.data)}`} />
            <TabelaComparada linhas={r.principais} comAnterior />
            <p className="mt-1.5 text-[8pt] text-[#8a8273]">Comparação só com a avaliação anterior do mesmo método ({ROTULO_METODO[r.metodo].toLowerCase()}). Métodos diferentes dão números diferentes e não entram aqui.</p>
          </>
        ) : r.metodo !== "medidas" ? (
          <p className="mt-4 rounded-lg border border-[#e4dfd3] bg-white px-3 py-2 text-[9.5pt] text-[#5c564b]">🏁 Esta é a primeira avaliação de {ROTULO_METODO[r.metodo].toLowerCase()} no app: ela é o ponto de partida. Na próxima, este relatório mostra a comparação lado a lado.</p>
        ) : null}

        {r.segmentos.length ? (
          <>
            <Titulo eyebrow="Segmentar" titulo="Corpo por partes" />
            <table className="tab">
              <thead><tr><th>Parte</th><th style={{ textAlign: "right" }}>Massa magra</th><th style={{ textAlign: "right" }}>Gordura</th></tr></thead>
              <tbody>
                {["braco_d", "braco_e", "tronco", "perna_d", "perna_e"].map((k) => seg(k)).filter(Boolean).map((s) => (
                  <tr key={s!.parte}>
                    <td className="font-semibold">{s!.rotulo}</td>
                    <td className="n font-bold">{s!.magra != null ? `${br(s!.magra, 2)} kg` : "—"}</td>
                    <td className="n">{s!.gordura != null ? `${br(s!.gordura, 2)} kg` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}

        <div className="rodape">
          <span>{BRAND.fullName} · Avaliação física · {nome}</span>
          <span>{dataBR(r.data)}{temFolha2 ? " · 1 / 2" : ""}</span>
        </div>
      </section>

      {temFolha2 ? (
        <section className="folha">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">{eyebrow} · {nome} · {dataBR(r.data)}</p>
            <div className="rounded-md bg-[#0a0a0a] px-2 py-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- logo oficial completo, também no PDF */}
              <img src={BRAND.logo.full} alt={BRAND.fullName} style={{ height: 32, width: "auto" }} />
            </div>
          </div>
          {r.circunferencias.length ? (
            <>
              <Titulo eyebrow="Fita métrica" titulo="Circunferências" />
              <TabelaComparada linhas={r.circunferencias} comAnterior={r.circunferencias.some((l) => l.anterior != null)} />
            </>
          ) : null}
          {todos.length ? (
            <>
              <Titulo eyebrow="Laudo completo" titulo="Todos os dados da avaliação" />
              <table className="tab">
                <tbody>
                  {todos.map((e) => (
                    <tr key={e.nome}>
                      <td>{e.nome}</td>
                      <td className="n font-semibold">{br(e.valor, 2)} {e.unidade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
          {r.observacao ? <p className="mt-4 rounded-lg border-l-4 border-[#ba9e50] bg-white px-3 py-2 text-[9.5pt]"><strong>Observação:</strong> {r.observacao}</p> : null}
          {r.metodo === "bioimpedancia" ? (
            <>
              <Titulo eyebrow="Como ler" titulo="Como esta avaliação funciona" />
              <ul className="list-disc space-y-1 pl-5 text-[9pt] leading-snug text-[#3d382f]">
                <li>A bioimpedância estima a composição do corpo pela passagem de uma corrente elétrica fraca: água, músculo e gordura conduzem de jeitos diferentes.</li>
                <li>O resultado muda com hidratação, refeição, treino e horário. Para comparar, repita no mesmo aparelho e nas mesmas condições (de manhã, em jejum, sem treinar antes, bexiga vazia).</li>
                <li>O mais importante é a <strong>tendência</strong> de uma avaliação para a outra, não um número isolado. Quem interpreta o que é bom para você é o {BRAND.name}.</li>
              </ul>
            </>
          ) : null}
          <div className="rodape">
            <span>{BRAND.fullName} · Avaliação física · {nome}</span>
            <span>{dataBR(r.data)} · 2 / 2</span>
          </div>
        </section>
      ) : null}
    </div>
  );
}
