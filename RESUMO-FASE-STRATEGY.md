# Resumo da fase → Montinho Strategy (“Colar do app”)

Botão **“📋 Copiar resumo da fase”** na ficha do aluno (painel do personal). Escolhe o período (as fases do protocolo aparecem como atalhos) e copia um JSON. O Strategy reconhece pelo `formato` e pela `versao`.

Regras: datas em dias de Brasília (AAAA-MM-DD); o que não tem dado vem `null` (listas vazias quando não há itens).

```json
{
  "formato": "montinho-resumo-fase",
  "versao": 1,
  "geradoEm": "2026-11-14T13:30:00.000Z",
  "aluno": { "nome": "Carol Zorzi", "objetivo": "hipertrofia", "nivel": "intermediario" },
  "periodo": { "inicio": "2026-10-13", "fim": "2026-11-12", "semanas": 5 },
  "protocolo": { "nome": "Missão Musa do Green Valley", "fase": "intensificacao" },

  "treinosFeitos": 14,
  "treinosPrevistos": 15,
  "aderenciaPct": 93,
  "treinosParciais": 1,
  "treinosExtras": 2,
  "semanasCompletas": 4,

  "exercicios": [
    {
      "nome": "Leg press 45°", "grupo": "quadriceps", "vezes": 5,
      "inicio": { "data": "2026-10-14", "cargaKg": 80, "reps": 12 },
      "fim":    { "data": "2026-11-11", "cargaKg": 100, "reps": 10 },
      "variacaoKg": 20, "variacaoPct": 25
    }
  ],

  "seriesPorGrupoSemana": [
    { "semana": "2026-10-13", "grupos": { "quadriceps": 16, "gluteo": 12 } }
  ],

  "corpo": {
    "inicio": { "data": "2026-10-10", "pesoKg": 62.4, "gorduraPct": 27.1, "massaMagraKg": null, "massaMuscularKg": null,
                "cinturaCm": 71, "quadrilCm": 99, "abdomenCm": null, "bracoCm": null, "coxaCm": 58, "peitoCm": null, "panturrilhaCm": null },
    "fim": null
  },

  "fotos": { "quantidade": 3, "datas": ["2026-10-10", "2026-11-10"] },

  "checkins": [
    { "data": "2026-10-20", "energia": "normal", "recuperacao": "um_pouco_cansado", "motivacao": "muita", "sono": null,
      "dificuldades": ["falta_tempo"], "escala1a10": null }
  ]
}
```

## Como cada número é calculado
- **treinosFeitos**: treinos da ficha concluídos no período (mesma regra da Consistência: metade das séries ou mais). Parciais e extras (extra, livre, WOD) vêm à parte. Histórico importado nunca conta.
- **treinosPrevistos / aderenciaPct**: soma das metas das semanas (segunda a domingo) que caem no período, sem semanas pausadas; a aderência é a mesma da Consistência (parcial = meio treino, limitado à meta). Semanas cortadas no começo/fim do período entram inteiras.
- **semanasCompletas**: semanas do período com 100% da meta.
- **exercicios**: exercícios da ficha ativa feitos 2+ vezes no período (até 10, os mais feitos primeiro; sem ficha, todos). `inicio`/`fim` = melhor série da 1ª e da última vez (maior carga; empate → mais repetições; aquecimento fora). Peso do corpo: `cargaKg` null e só `reps`. `variacaoPct` com 1 casa.
- **seriesPorGrupoSemana**: séries válidas FEITAS (sem aquecimento) em qualquer treino (ficha, extra, livre, aula presencial), pelo músculo principal, uma linha por semana (data da segunda-feira).
- **corpo**: `inicio` = último registro de medidas até a data inicial (senão o 1º do período); `fim` = último registro do período (diferente do de início).
- **fotos**: só a quantidade e as datas do período (as imagens ficam no app).
- **checkins** (Montinho Pulso; “pulou” fica fora):
  - `energia`: muito_baixa | baixa | normal | alta | muito_alta
  - `recuperacao`: bem | um_pouco_cansado | muito_cansado | desconforto
  - `motivacao`: nenhuma | pouca | normal | muita
  - `sono`: muito_mal | mal | razoavel | bem | muito_bem
  - `dificuldades`: falta_tempo | cansaco | desmotivacao | exercicios | rotina_corrida | nada
  - `escala1a10`: check-ins antigos (energia, sono, dor, motivação, estresse de 1 a 10) ou null.

Código: regras puras em `src/lib/relatorios/resumo-fase.ts`, dados em `src/lib/data/resumo-fase.ts`, API `GET /api/alunos/[id]/resumo-fase?inicio=&fim=` (só o personal; sem datas devolve os períodos das fases), botão `CopiarResumoFase` na ficha.
