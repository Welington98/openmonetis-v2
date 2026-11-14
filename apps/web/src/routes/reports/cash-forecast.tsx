import { createFileRoute } from "@tanstack/react-router";
import {
  resolveCashForecastSearch,
  validateCashForecastSearch,
} from "@/features/cash-forecast/cash-forecast.presentation";
import { CashForecastPage } from "@/features/cash-forecast/components/cash-forecast-page";

export const Route = createFileRoute("/reports/cash-forecast")({
  head: () => ({ meta: [{ title: "Projeção de saldo · OpenMonetis" }] }),
  validateSearch: validateCashForecastSearch,
  component: CashForecastRoute,
});

function CashForecastRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const filters = resolveCashForecastSearch(search);
  const view = search.view ?? "monthly";
  return (
    <CashForecastPage
      filters={filters}
      onChange={(next) => {
        void navigate({
          search: { view, period: next.startPeriod, months: next.months },
          replace: true,
        });
      }}
      onViewChange={(nextView) => {
        void navigate({
          search: { view: nextView, period: filters.startPeriod, months: filters.months },
          replace: true,
        });
      }}
      view={view}
    />
  );
}
