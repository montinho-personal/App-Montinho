// Gera supabase/migrations/0013_catalogo_exercicios_v1.sql a partir de
// src/lib/biblioteca/catalogo.ts (fonte única). Uso:
//   node --experimental-strip-types scripts/gerar-sql-catalogo.mts
//
// Regras do SQL gerado:
//  • Upsert por `slug` (id estável). Só atualiza linhas de origem 'catalogo'
//    com versão menor — cadastros e edições do treinador nunca são sobrescritos.
//  • Não insere um item do catálogo se já existir outro exercício com o mesmo
//    nome normalizado (evita duplicata com cadastros antigos).
//  • Equivalências curadas entram como 'sugerida' (o treinador aprova/rejeita);
//    nunca altera uma revisão já feita.
//  • Não toca em prescrições (tabela exercicios) nem em mídia.
import { writeFileSync } from "node:fs";
import { CATALOGO, CATALOGO_VERSAO } from "../src/lib/biblioteca/catalogo.ts";

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const arr = (xs: string[], tipo = "text") => (xs.length ? `array[${xs.map(q).join(", ")}]::${tipo}[]` : `'{}'::${tipo}[]`);

const linhas = CATALOGO.map((e) => {
  const sec = Object.keys(e.pesosSecundarios);
  return `  (${[
    q(e.slug),
    q(e.nome),
    `${q(e.grupo)}::grupo_muscular`,
    arr(sec, "grupo_muscular"),
    arr(e.equipamento, "equipamento"),
    arr(e.sinonimos),
    arr(e.execucao),
    arr(e.erros),
    q(e.padrao),
    arr(e.articulacoes),
    q(e.tipo),
    arr(e.registro),
    `${q(JSON.stringify(e.pesosSecundarios))}::jsonb`,
    arr(e.estresse),
    q(e.nivel),
    e.contaVolume ? "true" : "false",
  ].join(", ")})`;
});

const equivalencias = CATALOGO.flatMap((e) => e.substituicoes.map((s) => `  (${q(e.slug)}, ${q(s)})`));

const sql = `-- ============================================================================
-- Montinho — Catálogo de exercícios v${CATALOGO_VERSAO} (Migration 0013)
-- ARQUIVO GERADO por scripts/gerar-sql-catalogo.mts a partir de
-- src/lib/biblioteca/catalogo.ts. Não edite à mão: edite o catálogo e gere de novo.
-- ${CATALOGO.length} exercícios · ${equivalencias.length} equivalências sugeridas.
-- ============================================================================

create temp table _catalogo (
  slug text, nome text, grupo grupo_muscular, secundarios grupo_muscular[], equipamento equipamento[],
  sinonimos text[], execucao text[], erros text[], padrao text, articulacoes text[], tipo text,
  registro text[], pesos jsonb, estresse text[], nivel text, conta_volume boolean
) on commit drop;

insert into _catalogo values
${linhas.join(",\n")};

-- Atualiza itens do catálogo já existentes (somente se ainda forem do catálogo e de versão anterior).
update exercicios_biblioteca b set
  nome = c.nome, grupo_muscular = c.grupo, grupos_secundarios = c.secundarios, equipamento = c.equipamento,
  sinonimos = c.sinonimos, instrucoes = c.execucao, erros_comuns = c.erros, padrao_movimento = c.padrao,
  articulacoes = c.articulacoes, tipo_movimento = c.tipo, campos_registro = c.registro,
  pesos_secundarios = c.pesos, estresse_articular = c.estresse, nivel_minimo = c.nivel,
  conta_volume = c.conta_volume, catalogo_versao = ${CATALOGO_VERSAO}
from _catalogo c
where b.slug = c.slug and b.origem = 'catalogo' and coalesce(b.catalogo_versao, 0) < ${CATALOGO_VERSAO};

-- Insere os que faltam, sem duplicar nomes já cadastrados.
insert into exercicios_biblioteca (slug, nome, grupo_muscular, grupos_secundarios, equipamento, sinonimos,
  instrucoes, erros_comuns, padrao_movimento, articulacoes, tipo_movimento, campos_registro, pesos_secundarios,
  estresse_articular, nivel_minimo, conta_volume, origem, catalogo_versao, fonte_classificacao, video_validado, arquivado)
select c.slug, c.nome, c.grupo, c.secundarios, c.equipamento, c.sinonimos, c.execucao, c.erros, c.padrao,
  c.articulacoes, c.tipo, c.registro, c.pesos, c.estresse, c.nivel, c.conta_volume, 'catalogo', ${CATALOGO_VERSAO},
  'manual', false, false
from _catalogo c
where not exists (select 1 from exercicios_biblioteca b where b.slug = c.slug)
  and not exists (select 1 from exercicios_biblioteca b where b.nome_normalizado = public.normalizar_nome(c.nome));

-- Equivalências curadas (sugestões; o treinador revisa).
insert into exercicio_equivalencias (exercicio_id, alternativa_id, origem, status)
select a.id, b.id, 'catalogo', 'sugerida'
from (values
${equivalencias.join(",\n")}
) as v(origem_slug, alternativa_slug)
join exercicios_biblioteca a on a.slug = v.origem_slug
join exercicios_biblioteca b on b.slug = v.alternativa_slug
on conflict (exercicio_id, alternativa_id) do nothing;
`;

writeFileSync(new URL("../supabase/migrations/0013_catalogo_exercicios_v1.sql", import.meta.url), sql);
console.log(`OK: ${CATALOGO.length} exercícios, ${equivalencias.length} equivalências`);
