import { addMonthsToPeriod } from "@openmonetis/domain/transactions";
import type { CashForecastOutput } from "@openmonetis/validators/cash-forecast";
import { FlaskConical, Landmark, TrendingDown, TriangleAlert } from "lucide-react";
import { MoneyValue } from "@/components/money-value";
import { StatCard } from "@/components/stat-card";
import { formatPeriod } from "@/lib/period-presentation";
import { cn } from "@/lib/utils";

export function CashForecastSummary({ forecast }: { forecast: CashForecastOutput }) {
  const last = forecast.months.at(-1);
  const simulationImpact = last ? last.closingBalance - last.baselineClosingBalance : 0;

  return (
    <section aria-label="Resumo da projeção" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        description={`Contas no fim de ${formatPeriod(addMonthsToPeriod(forecast.startPeriod, -1))}`}
        icon={<Landmark />}
        label="Saldo inicial"
        value={<MoneyValue amount={forecast.openingBalance} />}
        valueClassName={cn(forecast.openingBalance < 0 && "text-destructive")}
      />
      <StatCard
        description={
          forecast.lowestBalance ? formatPeriod(forecast.lowestBalance.period) : undefined
        }
        icon={<TrendingDown />}
        label="Menor saldo previsto"
        value={<MoneyValue amount={forecast.lowestBalance?.amount ?? 0} />}
        valueClassName={cn((forecast.lowestBalance?.amount ?? 0) < 0 && "text-destructive")}
      />
      <StatCard
        description={
          forecast.firstNegativePeriod ? "Primeiro mês com saldo negativo" : "No período projetado"
        }
        icon={<TriangleAlert />}
        label="Saldo negativo"
        value={
          forecast.firstNegativePeriod ? formatPeriod(forecast.firstNegativePeriod) : "Nenhum mês"
        }
        valueClassName={cn(forecast.firstNegativePeriod ? "text-destructive" : "text-success")}
      />
      <StatCard
        description={
          forecast.simulationsAmount > 0
            ? "Diferença no saldo final com as simulações ativas"
            : "Ative uma simulação para comparar"
        }
        icon={<FlaskConical />}
        label="Impacto das simulações"
        value={<MoneyValue amount={simulationImpact} />}
        valueClassName={cn(simulationImpact < 0 && "text-destructive")}
      />
    </section>
  );
}
