import type { CashForecastOutput } from "@openmonetis/validators/cash-forecast";
import { MoneyValue } from "@/components/money-value";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatPeriod } from "@/lib/period-presentation";
import {
  usageLevelBadgeStyles,
  usageLevelCellStyles,
  usageLevelTextStyles,
} from "@/lib/usage-level-presentation";
import { cn } from "@/lib/utils";
import {
  asOutflow,
  cashForecastLevelLabels,
  formatCashForecastPercentage,
} from "../cash-forecast.presentation";

/**
 * Spreadsheet view: one row per month, money flowing left to right from the opening balance to
 * the closing balance, which carries into the next row. The closing cell is painted with the
 * month's level so a glance down the column shows where money gets tight.
 */
export function CashForecastTable({ forecast }: { forecast: CashForecastOutput }) {
  const hasSimulations = forecast.months.some((month) => month.simulationAmount > 0);

  return (
    <Card className="gap-0 overflow-x-auto py-0 shadow-none">
      <Table aria-label="Projeção de saldo por mês">
        <TableHeader>
          <TableRow>
            <TableHead className="font-mono">Mês</TableHead>
            <TableHead className="font-mono text-right">Saldo inicial</TableHead>
            <TableHead className="font-mono text-right">Receitas</TableHead>
            <TableHead className="font-mono text-right">Comprometido</TableHead>
            <TableHead className="font-mono text-right">Orçamento a gastar</TableHead>
            {hasSimulations ? (
              <TableHead className="font-mono text-right">Simulações</TableHead>
            ) : null}
            <TableHead className="font-mono text-right">Resultado</TableHead>
            <TableHead className="font-mono text-right">Saldo final</TableHead>
            {hasSimulations ? (
              <TableHead className="font-mono text-right">Sem simulações</TableHead>
            ) : null}
            <TableHead className="font-mono text-right">Uso</TableHead>
            <TableHead className="font-mono">Situação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {forecast.months.map((month) => (
            <TableRow key={month.period}>
              <TableHead scope="row">{formatPeriod(month.period)}</TableHead>
              <TableCell className="text-right">
                <MoneyValue
                  amount={month.openingBalance}
                  className={cn(month.openingBalance < 0 && "text-destructive")}
                />
              </TableCell>
              <TableCell className="text-right">
                <MoneyValue amount={month.incomeAmount} />
              </TableCell>
              <TableCell className="text-right">
                <MoneyValue amount={asOutflow(month.committedAmount)} />
              </TableCell>
              <TableCell className="text-right">
                {month.budgetReserveEstimated && month.budgetReserveAmount > 0 ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          className="cursor-help underline decoration-dotted underline-offset-4"
                          type="button"
                        />
                      }
                    >
                      <MoneyValue amount={asOutflow(month.budgetReserveAmount)} />
                    </TooltipTrigger>
                    <TooltipContent>
                      Estimado com os limites do último mês com orçamento
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <MoneyValue amount={asOutflow(month.budgetReserveAmount)} />
                )}
              </TableCell>
              {hasSimulations ? (
                <TableCell className="text-right">
                  <MoneyValue amount={asOutflow(month.simulationAmount)} />
                </TableCell>
              ) : null}
              <TableCell className="text-right">
                <MoneyValue
                  amount={month.netAmount}
                  className={cn(month.netAmount < 0 ? "text-destructive" : "text-success")}
                  showPositiveSign
                />
              </TableCell>
              <TableCell
                className={cn("text-right font-medium", usageLevelCellStyles[month.level])}
              >
                <MoneyValue
                  amount={month.closingBalance}
                  className={usageLevelTextStyles[month.level]}
                />
              </TableCell>
              {hasSimulations ? (
                <TableCell className="text-right text-muted-foreground">
                  <MoneyValue amount={month.baselineClosingBalance} />
                </TableCell>
              ) : null}
              <TableCell className="text-right tabular-nums">
                {formatCashForecastPercentage(month.usagePercentage)}
              </TableCell>
              <TableCell>
                <Badge
                  className={cn("border-transparent", usageLevelBadgeStyles[month.level])}
                  variant="outline"
                >
                  {cashForecastLevelLabels[month.level]}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
