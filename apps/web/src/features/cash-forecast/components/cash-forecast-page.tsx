import type { CashForecastQuery } from "@openmonetis/validators/cash-forecast";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CalendarRange, Table2 } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { EntityLoadError } from "@/components/entity-load-error";
import { MonthNavigation } from "@/components/month-navigation";
import { Navbar } from "@/components/navigation/navbar";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ForecastSimulationsList } from "@/features/forecast-simulations/components/forecast-simulations-list";
import { usageLevelBarStyles } from "@/lib/usage-level-presentation";
import { cn } from "@/lib/utils";
import {
  type CashForecastView,
  cashForecastLevelLabels,
  cashForecastMonthOptions,
} from "../cash-forecast.presentation";
import { cashForecastQueryOptions } from "../cash-forecast.queries";
import { CashForecastSummary } from "./cash-forecast-summary";
import { CashForecastTable } from "./cash-forecast-table";
import { DailyCashForecast } from "./daily-cash-forecast";

type Props = {
  filters: CashForecastQuery;
  view: CashForecastView;
  onChange: (filters: CashForecastQuery) => void;
  onViewChange: (view: CashForecastView) => void;
};

const legendLevels = ["healthy", "attention", "warning", "critical"] as const;

const legendDescriptions: Record<(typeof legendLevels)[number], string> = {
  healthy: "usa menos de 70% do disponível",
  attention: "de 70% a 90%",
  warning: "de 90% a 100%",
  critical: "saldo final negativo",
};

export function CashForecastPage({ filters, view, onChange, onViewChange }: Props) {
  return (
    <ProtectedRoute>
      <main className="min-h-svh bg-background">
        <Navbar />
        <section className="app-page project-container min-w-0">
          <PageHeader
            title="Projeção de saldo"
            description="Como o saldo fica mês a mês e dia a dia com receitas, compromissos, orçamentos e simulações."
            icon={<CalendarRange aria-hidden="true" className="size-5" />}
            breadcrumbs={[
              { label: "Visão geral", href: "/dashboard" },
              { label: "Relatórios" },
              { label: "Projeção de saldo" },
            ]}
          />
          <Tabs
            className="min-w-0 gap-6"
            onValueChange={(value) => onViewChange(value as CashForecastView)}
            value={view}
          >
            <TabsList aria-label="Visão da projeção" variant="line">
              <TabsTrigger value="monthly">
                <Table2 aria-hidden="true" />
                Mensal
              </TabsTrigger>
              <TabsTrigger value="daily">
                <CalendarDays aria-hidden="true" />
                Diária
              </TabsTrigger>
            </TabsList>
            <TabsContent className="min-w-0" value="monthly">
              {view === "monthly" ? (
                <MonthlyCashForecast filters={filters} onChange={onChange} />
              ) : null}
            </TabsContent>
            <TabsContent className="min-w-0" value="daily">
              {view === "daily" ? (
                <DailyCashForecast
                  onPeriodChange={(startPeriod) => onChange({ ...filters, startPeriod })}
                  period={filters.startPeriod}
                />
              ) : null}
            </TabsContent>
          </Tabs>
          <ForecastSimulationsList defaultPeriod={filters.startPeriod} />
        </section>
      </main>
    </ProtectedRoute>
  );
}

function MonthlyCashForecast({
  filters,
  onChange,
}: {
  filters: CashForecastQuery;
  onChange: (filters: CashForecastQuery) => void;
}) {
  const forecastQuery = useQuery(cashForecastQueryOptions(filters));
  const forecast = forecastQuery.data;

  return (
    <div className="grid min-w-0 gap-6">
      <section
        aria-label="Filtros da projeção"
        className="flex min-w-0 flex-wrap items-center justify-between gap-3"
      >
        <MonthNavigation
          onPeriodChange={(startPeriod) => onChange({ ...filters, startPeriod })}
          period={filters.startPeriod}
        />
        <ToggleGroup
          aria-label="Quantidade de meses projetados"
          className="flex rounded-md bg-muted p-0.5"
          onValueChange={(value) => {
            const months = Number(value[0]);
            if (months && months !== filters.months) onChange({ ...filters, months });
          }}
          size="sm"
          spacing={0.5}
          value={[String(filters.months)]}
        >
          {cashForecastMonthOptions.map((months) => (
            <ToggleGroupItem
              className="h-8 rounded-[5px] px-2.5 text-muted-foreground text-xs hover:text-foreground data-pressed:bg-background data-pressed:font-medium data-pressed:text-foreground data-pressed:shadow-xs"
              key={months}
              value={String(months)}
            >
              {months} meses
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </section>

      {forecastQuery.isError ? (
        <EntityLoadError
          entity="a projeção de saldo"
          error={forecastQuery.error}
          onRetry={() => void forecastQuery.refetch()}
        >
          {null}
        </EntityLoadError>
      ) : forecast ? (
        <>
          <CashForecastSummary forecast={forecast} />
          <div className="grid min-w-0 gap-2">
            <CashForecastTable forecast={forecast} />
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
                  {cashForecastLevelLabels[level]}: {legendDescriptions[level]}
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground text-xs">
              Comprometido inclui parcelas, recorrências e contas lançadas. Orçamento a gastar é o
              que ainda resta dos limites do mês, tratado como gasto previsto.
            </p>
          </div>
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
