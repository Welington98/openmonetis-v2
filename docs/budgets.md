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

## Despesas fixas e variáveis

Cada despesa de uma categoria com orçamento é **fixa** ou **variável**
(`packages/domain/src/expense-natures.ts`):

1. Se a categoria tem uma exceção em **Ajustes → Orçamento diário → Categorias**, ela vale:
   **Sempre fixa** (ex.: Moradia, em que até um boleto único é compromisso) ou **Sempre variável**.
2. Senão, vale a regra por tipo de lançamento: **parceladas** e **recorrentes** são fixas (cada
   regra pode ser desligada nos Ajustes) e **únicas** são variáveis.

Fixas e variáveis consomem igualmente o limite da categoria. A diferença está no diário: as fixas
ficam reservadas no mês inteiro e nunca contam como gasto do dia; só as variáveis compradas hoje
entram em "Hoje". O card de cada orçamento mostra quanto do uso é fixo e quanto é variável
(`fixedAmount` e `variableAmount` na API).

As exceções por categoria ficam em `GET/PUT /expense-natures` (o `PUT` substitui a lista inteira e
recusa categorias de outro usuário ou de receita); as regras por tipo, em `/preferences`
(`installmentsAreFixed`, `recurringAreFixed`).

## Orçamento diário

O orçamento diário é derivado do limite mensal, sem cadastro próprio. Para cada categoria a API
devolve `daily`:

- **Mês atual:** `allowanceAmount` = o que restava no início do dia (limite − lançado antes de
  hoje − recorrências previstas) ÷ dias restantes, contando hoje. As recorrências ficam reservadas,
  então o valor diário é o espaço para **gastos variáveis**. O valor não muda durante o dia: gastar
  hoje só reduz `remainingTodayAmount`.
- **Meses futuros:** o que resta do limite ÷ dias do mês.
- **Meses passados:** `null`.

`spentTodayAmount` soma as despesas **variáveis** da categoria com data de compra igual a hoje (horário de
Brasília) dentro do período do orçamento; uma compra no cartão que cai na fatura seguinte conta no
orçamento daquele mês, como no restante da tela. O nível diário compara o gasto de hoje com o valor
permitido usando as mesmas faixas. `idealDailyAmount` é o ritmo uniforme (limite ÷ dias do mês). O
resumo do mês soma os valores diários de todas as categorias.
