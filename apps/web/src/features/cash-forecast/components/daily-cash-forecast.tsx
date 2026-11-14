import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Landmark, ShieldCheck, TrendingDown } from "lucide-react";
import { useState } from "react";
import { EntityLoadError } from "@/components/entity-load-error";
import { MoneyValue } from "@/components/money-value";
import { MonthNavigation } from "@/components/month-navigation";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPeriod } from "@/lib/period-presentation";
import { usageLevelBarStyles } from "@/lib/usage-level-presentation";
import { cn } from "@/lib/utils";
import {
  dailyBalanceLevelLabels,
  formatForecastDate,
  resolveDailyCashForecastPeriod,
} from "../cash-forecast.presentation";
import { dailyCashForecastQueryOptions } from "../cash-forecast.queries";
import { DailyCashForecastTable } from "./daily-cash-forecast-table";
import { MinimumBalanceDialog } from "./minimum-balance-dialog";

const legendLevels = ["healthy", "attention", "warning", "critical"] as const;

/** Balance at the end of every day of a month, from the current month on. */
export function DailyCashForecast({
  period,
  onPeriodChange,
}: {
  period: string;
  onPeriodChange: (period: string) => void;
}) {
  const visiblePeriod = resolveDailyCashForecastPeriod(period);
  const query = useQuery(dailyCashForecastQueryOptions(visiblePeriod));
  const forecast = query.data;
  const [minimumOpen, setMinimumOpen] = useState(false);

  return (
    <div className="grid min-w-0 gap-6">
      <MonthNavigation
        onPeriodChange={(next) => onPeriodChange(resolveDailyCashForecastPeriod(next))}
        period={visiblePeriod}
      />
      {query.isError ? (
        <EntityLoadError
          entity="a projeção diária"
          error={query.error}
          onRetry={() => void query.refetch()}
        >
          {null}
        </EntityLoadError>
      ) : forecast ? (
        <>
          <section aria-label="Resumo do mês" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              description={`No início de ${formatPeriod(forecast.period)}`}
              icon={<Landmark />}
              label="Saldo inicial"
              value={<MoneyValue amount={forecast.openingBalance} />}
              valueClassName={cn(forecast.openingBalance < 0 && "text-destructive")}
            />
            <StatCard
              description={
                forecast.lowestBalance ? formatForecastDate(forecast.lowestBalance.date) : undefined
              }
              icon={<TrendingDown />}
              label="Menor saldo do mês"
              value={<MoneyValue amount={forecast.lowestBalance?.amount ?? 0} />}
              valueClassName={cn((forecast.lowestBalance?.amount ?? 0) < 0 && "text-destructive")}
            />
            <StatCard
              description={
                forecast.firstNegativeDate ? "Primeiro dia com saldo negativo" : "No mês inteiro"
              }
              icon={<CalendarCheck />}
              label="Saldo negativo"
              value={
                forecast.firstNegativeDate
                  ? formatForecastDate(forecast.firstNegativeDate)
                  : "Nenhum dia"
              }
              valueClassName={forecast.firstNegativeDate ? "text-destructive" : "text-success"}
            />
            <StatCard
              description={
                <span className="flex flex-wrap items-center gap-x-2">
                  {forecast.minimumBalanceSource === "automatic"
                    ? "Automático: limites de orçamento"
                    : "Definido por você"}
                  <Button
                    className="h-auto p-0 text-brand-strong"
                    onClick={() => setMinimumOpen(true)}
                    size="sm"
                    type="button"
                    variant="link"
                  >
                    Alterar
                  </Button>
                </span>
              }
              icon={<ShieldCheck />}
              label="Saldo mínimo"
              value={<MoneyValue amount={forecast.minimumBalance} />}
            />
          </section>

          <div className="grid min-w-0 gap-2">
            <DailyCashForecastTable days={forecast.days} />
            <ul
              aria-label="Legenda das cores"
              className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs"
            >
              {legendLevels.map((level) => (
                <li className="flex items-center gap-1.5" key={level}>
                  <span
                    aria-hidden="true"
                    className={cn("size-2.5 rounded-full", usageLevelBarStyles[level])}
                  />
                  {dailyBalanceLevelLabels[level]}
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground text-xs">
              Dias com ✓ mostram o saldo real. Diários são os gastos variáveis previstos pelo
              orçamento
              {forecast.budgetEstimated
                ? " (estimado com os limites do último mês com orçamento)"
                : ""}
              . Contas, receitas e faturas entram no dia do vencimento; atrasadas, hoje. Simulações
              entram no dia 1 de cada mês.
            </p>
          </div>

          <MinimumBalanceDialog
            automatic={forecast.minimumBalanceSource === "automatic"}
            key={`${minimumOpen}-${forecast.minimumBalance}-${forecast.minimumBalanceSource}`}
            minimumBalance={forecast.minimumBalance}
            onOpenChange={setMinimumOpen}
            open={minimumOpen}
          />
        </>
      ) : (
        <div aria-busy="true" className="grid gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      )}
    </div>
  );
}
