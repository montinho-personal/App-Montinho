# Técnicas avançadas no volume semanal

Como o app conta drop set, rest-pause, myo-reps e as demais técnicas na Tabela de Volume, e de onde vêm esses números.

**Resumo honesto:** não existe um padrão científico fechado. Os estudos medem se a técnica dá resultado *parecido* com séries comuns; nenhum define "quantas séries vale um drop". Os grandes apps também **não publicam** como contam. Por isso o app usa uma regra **declarada e trocável** (Clássica / Moderada / Alta), e a tabela mostra com `*` quanto do número veio de técnicas.

## Onde fica no app

- **Montador → campos avançados → Técnica.** Para *Drop set*, *Rest-pause* e *Myo-reps* aparecem dois campos: quantos **drops/mini-séries** e **em quantas séries**. Em branco = valor padrão (aparece em cinza).
- **Tabela de volume → "Técnicas: …"** escolhe a regra; **"ajustar por RIR"** (desligado por padrão) reduz séries longe da falha. A escolha fica salva neste navegador.
- **Aluno:** vê a explicação da técnica e o detalhe ("Hoje: 2 drops na última série.").
- Trocar a regra **não altera** a prescrição salva nem o histórico: só a forma de somar.

## Regras

| Técnica | Clássica | **Moderada (padrão)** | Alta |
|---|---|---|---|
| Série comum, superset, bi-set, pirâmide, cluster, isometria, unilateral | 1 por série | 1 por série | 1 por série |
| Drop set | 1 | 1 + 0,5 por drop (máx. 2 por série) | 1 + 1 por drop (máx. 4) |
| Rest-pause | 1 | 1 + 0,5 por mini-série (máx. 2) | 1 + 1 por mini (máx. 4) |
| Myo-reps | 1 | 1 + ⅓ por mini-série (máx. 2,5) | 1 + 1 por mini (máx. 4) |
| Aquecimento | 0 | 0 | 0 |

**Padrões quando o treinador não informa:**
- Drop set: 1 drop na última série.
- Rest-pause: 2 mini-séries na última série (formato clássico do DC Training).
- Myo-reps: 3 mini-séries em todas as séries.

**Ajuste por RIR (opcional):**
- RIR 0–3 vale 1.
- RIR 4–5 vale 0,5.
- RIR acima de 5 vale 0.

Os cortes são convenção do app; o estudo de base mostra só a tendência.

**Exemplo:** Tríceps corda 3×12 com 2 drops na última série.
- Clássica: 3.
- Moderada: 3 + 1 = **4**.
- Alta: 3 + 2 = 5.

## O que a pesquisa encontrou (outubro/2026)

Força da evidência: ●●● boa · ●● moderada · ● fraca/opinião.

### Estudos

- **Drop set**
  - Coleman et al. 2022 (meta-análise) ●●●: hipertrofia semelhante às séries tradicionais, em menos tempo.
  - Sødal et al. 2023 (Sports Med Open, 5 estudos) ●●: sem diferença entre os grupos.
  - Fink et al. 2018 ●: 1 drop set teve resultado próximo de 3 séries comuns no tríceps. A amostra era pequena (n=16).
  - <https://vuir.vu.edu.au/46296/> · <https://doaj.org/article/21e0b210caf1433594359186eee617b9> · <https://pubmed.ncbi.nlm.nih.gov/28474868/>
- **Rest-pause**
  - Prestes et al. 2019 ●●: espessura muscular da coxa maior no rest-pause, força igual.
  - Enes et al. 2021 ●●: rest-pause, drop set e tradicional semelhantes com volume igualado.
  - <https://pmc.ncbi.nlm.nih.gov/articles/PMC6529514> · <https://www.mdpi.com/2075-4663/9/9/119>
- **Myo-reps**
  - Bradshaw et al. 2026 (JSCR) ●●: ativação + cerca de 5 mini-séries teve resultado igual a 3 séries até a falha no peitoral, com cerca de 29% menos repetições.
  - Menno Henselmans comenta que o resultado "merece escrutínio".
  - <https://mennohenselmans.com/3-epic-new-studies-to-build-more-muscle/>
- **Superset**
  - Zhang, Weakley et al. 2025 (Sports Med, meta-análise) ●●●: adaptações crônicas semelhantes às séries tradicionais. Agonista-antagonista preserva melhor a carga.
  - <https://eprints.leedsbeckett.ac.uk/id/eprint/11908/>
- **Cluster** ●●: com volume igualado, força e hipertrofia semelhantes. É uma revisão de 2021 citada por fonte secundária; não confirmei os autores.
- **Músculo secundário** ●●●: Pelland et al. 2025 (meta-regressão). Contar a série indireta como 0,5 explicou melhor a hipertrofia do que contá-la como série inteira. É a base do "volume ponderado" do app.
  - <https://sportrxiv.org/index.php/server/preprint/download/537/1148/1071>
- **Proximidade da falha** ●●: Robinson et al. 2024 (Sports Med). A hipertrofia cresce quanto mais perto da falha. A força quase não muda. Os RIR dos estudos foram estimados.
  - <https://osf.io/7knsj/>

### Treinadores

- **Renaissance Periodization (Mike Israetel)** ●
  - Nos artigos, recomenda contar drop sets como séries normais porque são quase tão cansativos. Não fica claro se é "cada drop" ou "o drop set inteiro"; a regra **Alta** representa a leitura mais generosa.
  - Para "giant sets" (completar muitas reps com pausas curtas), sugere contar ⅔ de série.
  - <https://rpstrength.com/blogs/articles/calves-hypertrophy-training-tips>
- **Dante Trudel (DC Training)** ●: o rest-pause (1 série + 2 mini) é tratado como **uma** série de trabalho, com volume baixo de propósito. A regra **Clássica** reflete isso.
- **Eric Helms (3DMJ), Greg Nuckols, Jeff Nippard, Borge Fagerli:** não encontrei regra escrita de quanto contam drops ou mini-séries. A frase "1 série de myo-reps ≈ 3 séries" circula em blogs, mas **não verifiquei** que seja do Fagerli.

### Apps

- **Hevy:** marca o tipo de série (aquecimento, drop, falha) e mostra séries por músculo. Não documenta se o drop entra na soma.
- **MacroFactor:** registra o drop set como **uma** série com várias cargas.
- **StrengthLog:** trata o drop set como um tipo próprio de série.
- **Alpha Progression:** suporta myo-reps, rest-pause e drop set; a regra de volume não é publicada.
- **RP Hypertrophy:** trabalha com MEV/MRV por músculo; a contagem de drops e minis não é documentada.
- **Strong, Fitbod, JuggernautAI, Boostcamp, Trainerize, TrueCoach:** não encontrei documentação.

## Por que "Moderada" é o padrão

- Os estudos dizem que essas técnicas rendem **parecido com mais séries em menos tempo**. Então contar só 1 (Clássica) subestima, e contar cada drop como série inteira (Alta) provavelmente superestima.
- O meio-termo de **0,5 por drop/mini** usa o mesmo raciocínio da série indireta valendo 0,5 (Pelland 2025).
- O teto por série evita que "10 drops" virem 11 séries.
- **É uma convenção, não uma verdade:** o treinador escolhe a regra que usa no dia a dia.

## Limitações

- O registro do aluno ainda não tem "drop" ou "mini-série" como tipo de série. O **realizado** conta as séries válidas registradas, sem bônus de técnica.
- Fontes lidas em parte por resumo de busca (alguns sites bloquearam a leitura direta). Itens marcados "não verifiquei" não foram atribuídos a ninguém.

## Métodos adicionados em 21/10/2026 (0033)

Contam como **séries normais** (1 série válida por série prescrita, sem bônus):
pirâmide decrescente, tri-set, combinado, pré-exaustão (cada exercício do bloco
conta as próprias séries, como no bi-set), 3/7, super slow e negativo. São
métodos de execução/organização; não há base para somar volume extra. O tempo
estimado considera: super slow ≈ 10 s por repetição, negativo ≈ +3 s por
repetição e 3/7 = 25 repetições com 4 pausas de 15 s por série.
