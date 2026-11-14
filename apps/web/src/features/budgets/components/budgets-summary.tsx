import type { UsageLevel } from "@openmonetis/domain/usage-levels";
import type { BudgetOverviewOutput } from "@openmonetis/validators/budgets";
import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { MoneyValue } from "@/components/money-value";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { usageLevelBarStyles, usageLevelTextStyles } from "@/lib/usage-level-presentation";
import { cn } from "@/lib/utils";
import {
  formatBudgetAttention,
  formatBudgetPercentage,
  formatDailyAllowanceDays,
} from "../budgets.presentation";

/**
 * Answers the page's main question first (how much of the month's limits is used), then breaks
 * that amount down so the numbers add up: launched + expected = used; used + available − above
 * the limit = total of the limits.
 */
export function BudgetsSummary({ overview }: { overview: BudgetOverviewOutput }) {
  const hasExceeded = overview.exceededAmount > 0;
  const daily = overview.daily;

  return (
    <Card className="gap-0 border py-0 shadow-none">
      <CardContent className="grid gap-5 p-5 sm:p-6">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
            <div className="grid gap-1">
              <h2 className="text-muted-foreground text-sm">Usado dos limites do mês</h2>
              <p className="flex flex-wrap items-baseline gap-x-2">
                <MoneyValue amount={overview.committedAmount} className="kpi-value text-4xl" />
                <span className="text-base text-muted-foreground">
                  de <MoneyValue amount={overview.allocatedAmount} />
                </span>
              </p>
            </div>
            <p
              className={cn(
                "font-medium text-sm tabular-nums",
                overview.level === "healthy"
                  ? "text-muted-foreground"
                  : usageLevelTextStyles[overview.level],
              )}
            >
              {formatBudgetPercentage(overview.usagePercentage)}% usado
            </p>
          </div>
          <Progress
            aria-label={`${formatBudgetPercentage(overview.usagePercentage)}% dos limites do mês usado`}
            indicatorClassName={usageLevelBarStyles[overview.level]}
            value={Math.min(overview.usagePercentage, 100)}
          />
        </div>

        <dl
          className={cn(
            "grid gap-x-6 gap-y-4 border-t pt-4 sm:grid-cols-2",
            daily || hasExceeded ? "lg:grid-cols-4" : "lg:grid-cols-3",
            daily && hasExceeded && "lg:grid-cols-5",
          )}
        >
          <SummaryStat
            description="Despesas já registradas"
            label="Lançado"
            value={<MoneyValue amount={overview.actualSpentAmount} />}
          />
          <SummaryStat
            description="Recorrências que ainda vão cair"
            label="Previsto"
            value={<MoneyValue amount={overview.projectedAmount} />}
          />
          <SummaryStat
            description="O que ainda cabe nos limites"
            label="Disponível"
            value={<MoneyValue amount={overview.availableAmount} />}
          />
          {daily ? (
            <SummaryStat
              description={
                daily.spentTodayAmount > 0 ? (
                  <>
                    Hoje <MoneyValue amount={daily.spentTodayAmount} className="text-xs" /> ·{" "}
                    {formatDailyAllowanceDays(daily.daysRemaining)}
                  </>
                ) : (
                  `Para gastos variáveis · ${formatDailyAllowanceDays(daily.daysRemaining)}`
                )
              }
              label="Disponível por dia"
              tone={daily.spentTodayAmount > 0 ? daily.level : undefined}
              value={<MoneyValue amount={daily.allowanceAmount} />}
            />
          ) : null}
          {hasExceeded ? (
            <SummaryStat
              description="Soma do que passou em cada categoria"
              label="Acima do limite"
              tone="critical"
              value={<MoneyValue amount={overview.exceededAmount} />}
            />
          ) : null}
        </dl>

        {overview.warningCount > 0 ? (
          <p className="-mt-1 flex items-center gap-2 text-sm text-warning">
            <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
            {formatBudgetAttention(overview.warningCount)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SummaryStat({
  description,
  label,
  tone,
  value,
}: {
  description: ReactNode;
  label: string;
  tone?: UsageLevel;
  value: ReactNode;
}) {
  return (
    <div className="grid content-start gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={cn("font-medium text-lg tabular-nums", tone && usageLevelTextStyles[tone])}>
        {value}
      </dd>
      <dd className="text-muted-foreground text-xs">{description}</dd>
    </div>
  );
}
