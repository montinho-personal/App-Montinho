# A Jornada do Chalalá — auditoria, direção criativa e protótipo

Estado em 21/10/2026. Protótipo **para aprovação**, isolado da tela usada pelos alunos.

> “Não é só sobre começar. É sobre conseguir continuar.”

## Como abrir o protótipo

- Rota: `/prototipo/jornada-chalala`.
- Só existe com `NEXT_PUBLIC_JORNADA_CHALALA_PROTOTIPO=true` (flag em `src/lib/env.ts#FEATURES.jornadaChalalaPrototipo`). Sem a flag, a rota responde 404. Ligada **apenas** no projeto de demonstração (`app-montinho-demo`); em produção fica desligada.
- Não precisa de login, não lê banco e não grava nada. A aluna “Joana” e o histórico são fictícios e identificados na tela.
- Controles da demonstração: cenário (rotina regular / com pausa e retorno), movimento (automático / reduzido = versão estática), “Simular nova medalha”, abas Mapa · Minha História · Personagens.

## Etapa A — Auditoria da jornada atual

| Peça | Onde | Situação |
|---|---|---|
| Motor de conquistas (32 medalhas + recorde e “Eu voltei”) | `src/lib/conquistas/regras.ts`, `criterios.ts` | Preservado. O protótipo só consome. |
| Vitrine (estado, progresso, “o que falta”) | `src/lib/conquistas/vitrine.ts` | Preservado. |
| Capítulos, posição, ciclos, linha do tempo, caminho semanal | `src/lib/conquistas/jornada.ts` (`CAPITULO_DA_MEDALHA`, `montarJornada`, `linhaDoTempo`, `caminhoDaJornada`) | Preservado. Os cinco capítulos do Chalalá mapeiam 1:1 nos cinco capítulos existentes. |
| Fases do protocolo (adaptação, intensificação, consolidação) | `src/lib/treino/fases.ts`, `programas.fase`, `snapshot.fase` | Preservado; o caminho semanal usa a cor e o ícone da fase. |
| Dados da tela | `src/lib/data/conquistas.ts#dadosDaJornada` | Preservado. A integração definitiva troca só o componente de apresentação. |
| Tela atual | `src/components/jornada/JornadaClient.tsx`, `Cenario.tsx`, `CaminhoSemanas.tsx` | Intocada. |
| Identidade visual | `src/config/brand.ts` (dourado #ba9e50, DM Sans, fundo escuro), `globals.css` | Reaproveitada. |
| Dependências de animação/SVG | nenhuma biblioteca; SVG inline + CSS (`@keyframes`) | Mantido: zero dependências novas. |
| Reaproveitados no protótipo | `MedalhaIcone`, `DetalheMedalha`, `CONTEUDO`, `FASE_INFO` | — |

Restrições técnicas encontradas: o `proxy.ts` exige login fora de uma lista de rotas públicas (adicionado o prefixo `/prototipo/`); a página pública não tem a barra de abas do aluno (desejável: a integração definitiva fica dentro de `/aluno/jornada`, com as abas).

## Etapa B — Direção criativa

### Universo
Montanhas, trilhas, florestas, pontes, mirantes e horizontes. Começa num pequeno monte (o “Montinho”) e abre paisagens cada vez mais amplas. Não é vencer a montanha: é descobrir novos caminhos.

### Capítulos (`src/lib/jornada-chalala/universo.ts`)
1. **Bora começar!** — Bosque dos Primeiros Passos (amanhecer, tenda, fogueira, vaga-lumes).
2. **Um passo de cada vez** — Ponte da Constância (vale, rio, ponte de madeira com lanternas; a ponte nunca quebra).
3. **Olha até onde você chegou!** — Mirante das Conquistas (deque elevado, bandeira, nuvens abaixo, o caminho percorrido lá embaixo).
4. **A vida acontece. A gente continua.** — Montanhas da Vida Real (neve, frente de chuva suave, trilhas alternativas, abrigo de descanso).
5. **O Chalalá continua!** — Horizonte das Novas Aventuras (sol baixo dourado, caminhos que se abrem, bandeiras; marcos de 6 meses, 1 ano…).

Capítulos são narrativa, não bloqueio (regra já existente). O caminho dourado segue a posição real do motor (`jornada.posicao`), sem sugerir medalhas não conquistadas.

### Direção de arte (2.5D)
- Quatro camadas por região — céu/luz, longe, meio, perto — ancoradas em alturas diferentes e com deslocamento diferente ao rolar (`--p`, calculado por `requestAnimationFrame`). Com movimento reduzido, nada se mexe.
- Vetores originais (`src/components/jornada-chalala/Cenarios2D.tsx`): montanhas estilizadas com neve, névoa com desfoque, água com reflexos, lanternas que acendem, tenda e fogueira, vegetação sem excesso.
- Paleta: grafite `#171B21`, dourado `#BA9E50` (progresso e pontos de interesse), verde floresta `#436657`, azul montanha `#54768A`, terracota `#C18B61`. DM Sans.
- Estados nunca só por cor: medalha conquistada tem anel dourado + data; aberta tem progresso em arco + “n/alvo”; no caminho semanal cada estado tem símbolo (número, ◐, ○, ⏸, ↺) e cada fase tem ícone.

### Personagens (`src/components/jornada-chalala/Personagens.tsx`; nomes e papéis aprovados pelo Montinho em 21/10/2026)
- **Montinho — O Guia**: aparece em momentos especiais, como o Mestre dos Magos, trazendo conselhos, humor e motivação. Silhueta provisória de guia de trilha com o halter “M” no peito, sem rosto; a aparência real só entra com referência aprovada. Abertura dos capítulos 1 e 5 e diário.
- **Colombo — O Explorador**: curioso, aventureiro e divertido. Representa a descoberta de novos caminhos e celebra as conquistas do aluno. Companheiro redondo com cachecol e lanterna. “Próxima conquista”, revelação de medalha e capítulo 3.
- **Mestre Oogway — O Guardião do Ritmo**: a tartaruga sábia que ensina sobre paciência, constância e respeito ao próprio tempo. Tartaruga exploradora com mochila e bússola. Fases e capítulo 2.
- **Fênix — O Símbolo do Recomeço**: representa a capacidade de voltar depois de uma pausa, sem perder a história construída. Ave em azul-montanha com cauda e asas em chamas douradas. Retorno depois de pausa e capítulo 4.
- No mapa, cada personagem aparece com o **nome em cima do bonequinho** (`PersonagemBotao`); **tocar abre uma explicação curta** (papel, resumo, fala e quando aparece), no mesmo painel inferior das medalhas.
- Regra: no máximo um personagem por tela; o aluno é o protagonista.

### Interações
- Medalha: toque abre o detalhe (mesmo `DetalheMedalha` do app). Revelação com `chalala-revelar` + balão do Colombo (“Olha só! Mais uma conquista pra sua história!”).
- Retorno: selo “↺ voltei” no caminho semanal + mensagem da Fênix (“Que bom te ver por aqui! Seu caminho estava esperando por você.”).
- Pausa combinada: ⏸ e trecho pontilhado, sem cor de erro.
- Ambiente: lanternas, vaga-lumes, nuvens, água e bandeiras com animação discreta; tudo desligado em `prefers-reduced-motion` ou pelo controle “Reduzido”.

### Psicologia comportamental
Mesmas regras editoriais já testadas (sem prazo de hábito, sem culpa, sem promessa). Nada é perdido com pausa; sem sequência obrigatória; sem ranking; mensagens do personal diferenciadas das automáticas.

## Etapa C — Protótipo (o que tem)
1. Visão geral com lema, números e controles. 2. Mapa com os cinco capítulos e cenários em camadas. 3. Transição por rolagem com parallax. 4. Medalhas conquistadas/abertas vindas do motor. 5. “Você está aqui”. 6. Simulação de conquista com animação. 7. Cenário com pausa e retorno. 8. Caminho semana a semana redesenhado. 9. “Minha História” (diário de expedição por mês, com origem de cada registro). 10. Propostas dos quatro personagens e paleta. 11. Formato mobile (max 28 rem). 12. Versão estática (movimento reduzido).

## Etapa D — Limitações e dependências
- **Ilustrações definitivas**: os cenários são vetores originais feitos em código, bons para aprovação de composição e clima. Para o acabamento “premium” (texturas, luz volumétrica, vegetação detalhada) recomenda-se produção por ilustrador a partir desta especificação (5 regiões × 4 camadas, 360 px de largura, camadas em SVG ou WebP leve, ≤ 120 KB por região).
- **Montinho**: representação simbólica até haver referência visual aprovada por ele.
- **Capítulos altos** (muitas medalhas) têm um trecho central com menos detalhe; na arte definitiva, a camada “meio” ganha elementos repetíveis.
- **Aniversário de acompanhamento** e **lembrança especial**: os marcos de 6 meses/1 ano já existem; a “lembrança” (resumo dos melhores momentos) é proposta para a integração.
- Performance: SVG inline, sem bibliotecas; animações em CSS; parallax via `transform` com `requestAnimationFrame`.

## Etapa E/F — Aprovação e integração (feita em 21/10/2026)
Aprovado pelo Montinho em 21/10/2026 (“Aprovado” + “Pode publicar”). O que foi feito:
1. `/aluno/jornada` e `/treinador/alunos/[id]/jornada` agora usam `JornadaChalala` (`src/components/jornada-chalala/JornadaChalala.tsx`), alimentado pelos mesmos dados reais de `dadosDaJornada`. Abas: Mapa · Minha História · Personagens. Introdução com “Entendi” no primeiro acesso do aparelho; compartilhar medalha e reconhecimentos do personal mantidos.
2. Medalha nova (conquistada há até 7 dias) é revelada uma vez por aparelho (Colombo comemora); nada é gravado no banco.
3. Movimento: segue `prefers-reduced-motion`; o aluno pode também “Reduzir movimento do mapa” (preferência local).
4. Protótipo removido: rota `/prototipo/jornada-chalala`, bandeira `NEXT_PUBLIC_JORNADA_CHALALA_PROTOTIPO`, dados fictícios e componentes antigos da jornada (`src/components/jornada/`). A variável de ambiente antiga no projeto demo da Vercel ficou sem efeito.

Pendências de arte: aparência real do Montinho (hoje silhueta simbólica) e ilustrações definitivas das cinco regiões, se o Montinho quiser um acabamento premium com ilustrador.
