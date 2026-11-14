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

## API

- `GET /reports/cash-forecast?startPeriod=YYYY-MM&months=12`
- `GET|POST /forecast-simulations`, `PATCH|DELETE /forecast-simulations/{id}`: descrição, valor
  total, parcelas (1 a 60), primeiro mês (`firstPeriod`, no cartão o mês da primeira fatura) e
  `isActive`. Limite de 100 simulações por usuário. Simulações nunca viram lançamentos.

## Limitações

- Pendências de meses anteriores ao início não entram no saldo inicial nem nos meses projetados.
- Lançamentos liquidados no próprio mês inicial não alteram o saldo inicial; entram pelos
  compromissos e receitas do mês.
