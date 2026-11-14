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
  return (
    <CashForecastPage
      filters={resolveCashForecastSearch(search)}
      onChange={(filters) => {
        void navigate({
          search: { period: filters.startPeriod, months: filters.months },
          replace: true,
        });
      }}
    />
  );
}
