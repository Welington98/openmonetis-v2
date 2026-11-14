# Orçamentos

Em **Finanças → Orçamentos** cada categoria de despesa pode ter um limite por mês (`YYYY-MM`). O
uso do limite soma as despesas já lançadas no mês (pela fatura, quando no cartão), descontando
estornos, mais as ocorrências de despesas recorrentes ativas que ainda vão cair no mês.

## Faixas de cor

As faixas são fixas e compartilhadas com a [projeção de saldo](cash-forecast.md)
(`packages/domain/src/usage-levels.ts`):

| Nível (`level`) | Cor      | Uso do limite        |
| --------------- | -------- | -------------------- |
| `healthy`       | verde    | abaixo de 70%        |
| `attention`     | amarelo  | de 70% até 90%       |
| `warning`       | laranja  | de 90% até 100%      |
| `critical`      | vermelho | acima de 100%        |

O campo `status` (`onTrack`, `warning`, `reached`, `exceeded`) continua no contrato para alertas
e notificações; `warning` passa a valer a partir de 90%, alinhado à faixa laranja.

## Orçamento diário

O orçamento diário é derivado do limite mensal, sem cadastro próprio. Para cada categoria a API
devolve `daily`:

- **Mês atual:** `allowanceAmount` = o que restava no início do dia (limite − lançado antes de
  hoje − recorrências previstas) ÷ dias restantes, contando hoje. As recorrências ficam reservadas,
  então o valor diário é o espaço para **gastos variáveis**. O valor não muda durante o dia: gastar
  hoje só reduz `remainingTodayAmount`.
- **Meses futuros:** o que resta do limite ÷ dias do mês.
- **Meses passados:** `null`.

`spentTodayAmount` soma as despesas da categoria com data de compra igual a hoje (horário de
Brasília) dentro do período do orçamento; uma compra no cartão que cai na fatura seguinte conta no
orçamento daquele mês, como no restante da tela. O nível diário compara o gasto de hoje com o valor
permitido usando as mesmas faixas. `idealDailyAmount` é o ritmo uniforme (limite ÷ dias do mês). O
resumo do mês soma os valores diários de todas as categorias.
