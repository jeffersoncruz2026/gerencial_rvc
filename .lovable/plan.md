

## Dashboard - Corrigir Comparativo de Faturamento

### Problema Identificado

Os cards comparativos de faturamento estao comparando valores **acumulados** (saldoAtual) em vez de valores **mensais** (saldoAtual - anterior). Isso causa distorcao, pois Janeiro acumulado (97.733) e comparado com Dezembro acumulado (1.286.008), gerando uma variacao de -92% que nao reflete a realidade.

### Solucao

Alterar a funcao auxiliar `getVal` ou criar uma nova funcao para extrair o **movimento mensal** (saldoAtual - anterior) e usar esse valor nos cards comparativos.

### Alteracoes Tecnicas

**Arquivo: `src/pages/Dashboard.tsx`**

1. Criar funcao auxiliar `getMovimento` que retorna `saldoAtual - anterior` (movimento do mes) para uma conta.
2. Nos comparativos de faturamento:
   - "Mes Atual vs Anterior": usar `getMovimento` para ambos os periodos (conta 3.1, com inversao de sinal).
   - "Ano Atual vs Anterior": usar `getMovimento` para o mes atual e o mesmo mes do ano anterior.
3. Nos MetricCards (Receita Bruta, Impostos, Receita Liquida), tambem usar o movimento mensal para que os valores sejam consistentes com os comparativos.
4. Manter Ativo Total e Resultado com `saldoAtual` (acumulado), pois sao saldos patrimoniais/acumulados por natureza.
5. O grafico de Evolucao do Resultado tambem sera ajustado para usar movimento mensal, mostrando o resultado de cada mes individualmente.

### Resumo do Impacto

- Cards comparativos de faturamento mostrarao valores mensais comparaveis.
- Receita Bruta, Impostos e Receita Liquida refletirao o movimento do periodo selecionado.
- Ativo Total permanece como saldo acumulado (correto por ser conta patrimonial).

