# Projeção de saldo

Em **Relatórios → Projeção de saldo** a tela mostra, como uma planilha, como o saldo das contas
evolui mês a mês (6, 12, 18 ou 24 meses; padrão 12). Cada linha começa com o saldo final da
anterior:

```
saldo final = saldo inicial + receitas − comprometido − orçamento a gastar − simulações
```

- **Saldo inicial do primeiro mês:** soma dos saldos das contas ativas que entram no saldo total,
  fechados no mês anterior ao início (mesma regra do saldo das contas, por liquidação).
- **Receitas e comprometido:** vêm do relatório de [compromissos futuros](commitments.md)
  (parcelas, recorrências e contas lançadas, com estornos abatidos), sem recálculo.
- **Orçamento a gastar:** o que ainda resta dos limites de [orçamento](budgets.md) do mês, tratado
  como gasto variável previsto. Meses sem orçamento herdam os limites do último mês que tem
  orçamento e aparecem como estimados.
- **Simulações:** compras salvas em **Simulações de compra** e marcadas como ativas, divididas em
  parcelas como uma série real (centavos na primeira parcela). Desativar uma simulação mantém o
  rascunho e a remove da conta. A coluna **Sem simulações** mostra o saldo final sem elas.

O nível de cada mês usa as mesmas faixas dos orçamentos sobre `saídas ÷ (saldo inicial + receitas)`:
verde abaixo de 70%, amarelo até 90%, laranja até 100% e vermelho quando o saldo final fica
negativo. A API também devolve o menor saldo previsto e o primeiro mês negativo.

## Visão diária

A aba **Diária** mostra o saldo ao fim de cada dia de um mês, do mês atual até 23 meses à frente,
encadeando os dias desde o 1º dia do mês atual:

- **Saldo inicial:** o mesmo da visão mensal (contas no fim do mês anterior ao atual).
- **Dias passados (✓):** lançamentos liquidados das contas que entram no saldo total, no dia da
  liquidação. A coluna Diários fica vazia: o gasto real já está no movimento.
- **Hoje e dias seguintes:** lançamentos pendentes nas contas no dia do pagamento agendado do
  boleto, senão no vencimento, senão na data da compra; ocorrências recorrentes no vencimento;
  faturas de cartão pelo valor em aberto no vencimento. O que já venceu e não foi pago cai em
  hoje. Pendências de meses anteriores ao atual ficam de fora, como na visão mensal.
- **Diários:** hoje recebe o "Por dia" que ainda resta do orçamento; o restante do que sobra dos
  limites é dividido igualmente pelos dias seguintes (centavos restantes no último dia). Meses
  futuros dividem a sobra do orçamento pelos dias do mês, herdando os limites do último mês com
  orçamento quando o mês não tem os seus.
- **Simulações ativas:** cada parcela entra no dia 1 do mês (hoje, no mês atual), uma suposição
  conservadora.

As cores comparam o saldo do dia com o **saldo mínimo**: verde a partir do mínimo, amarelo abaixo
dele, laranja abaixo da metade e vermelho quando negativo. O mínimo é uma preferência
(`forecastMinimumBalance` em `/preferences`); vazio, usa automaticamente a soma dos limites de
orçamento do mês atual. Sem orçamento e sem mínimo, só os dias negativos se destacam.

Sem pendências atrasadas, o saldo do último dia de cada mês coincide com o saldo final da visão
mensal.

## API

- `GET /reports/cash-forecast?startPeriod=YYYY-MM&months=12`
- `GET /reports/cash-forecast/daily?period=YYYY-MM`: dias do mês com diários, entradas, saídas,
  simulações, saldo, nível e os eventos de cada dia. Meses anteriores ao atual devolvem
  `cash_forecast_period_in_past`; além de 23 meses, `cash_forecast_period_too_far`.
- `GET|POST /forecast-simulations`, `PATCH|DELETE /forecast-simulations/{id}`: descrição, valor
  total, parcelas (1 a 60), primeiro mês (`firstPeriod`, no cartão o mês da primeira fatura) e
  `isActive`. Limite de 100 simulações por usuário. Simulações nunca viram lançamentos.

## Limitações

- Pendências de meses anteriores ao início não entram no saldo inicial nem nos meses projetados.
- Lançamentos liquidados no próprio mês inicial não alteram o saldo inicial; entram pelos
  compromissos e receitas do mês.
