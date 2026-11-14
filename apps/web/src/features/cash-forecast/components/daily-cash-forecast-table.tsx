import type { CashForecastDayOutput } from "@openmonetis/validators/cash-forecast";
import { Check, ChevronDown } from "lucide-react";
import { Fragment, useState } from "react";
import { MoneyValue } from "@/components/money-value";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usageLevelCellStyles, usageLevelTextStyles } from "@/lib/usage-level-presentation";
import { cn } from "@/lib/utils";
import { dailyBalanceLevelLabels, formatForecastDay } from "../cash-forecast.presentation";

/**
 * One row per day: the expected variable spending, the money that enters and leaves and the
 * balance at the end of the day, painted with its level. Past days show what really happened.
 */
export function DailyCashForecastTable({ days }: { days: CashForecastDayOutput[] }) {
  const [openDate, setOpenDate] = useState<string | null>(null);

  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-none">
      <Table aria-label="Saldo projetado por dia">
        <TableHeader>
          <TableRow>
            <TableHead className="w-20 font-mono">Dia</TableHead>
            <TableHead className="font-mono text-right">Diários</TableHead>
            <TableHead className="font-mono text-right">Movimento</TableHead>
            <TableHead className="font-mono text-right">Saldo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {days.map((day) => {
            const { day: dayNumber, weekday } = formatForecastDay(day.date);
            const outflow = day.expenseAmount + day.simulationAmount;
            const expandable = day.events.length > 0 || (day.dailyAmount ?? 0) > 0;
            const open = openDate === day.date;
            const detailsId = `forecast-day-${day.date}`;
            const dayLabel = (
              <span className="flex items-center gap-2">
                <span className="grid w-6 justify-items-center">
                  <span className="font-medium text-sm tabular-nums">{dayNumber}</span>
                  <span className="text-[0.65rem] uppercase opacity-75">{weekday}</span>
                </span>
                {day.status === "past" ? (
                  <Check aria-label="Dia realizado" className="size-3.5 text-success" />
                ) : null}
                {expandable ? (
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      "size-3.5 opacity-60 transition-transform motion-reduce:transition-none",
                      open && "rotate-180",
                    )}
                  />
                ) : null}
              </span>
            );

            return (
              <Fragment key={day.date}>
                <TableRow
                  aria-current={day.status === "today" ? "date" : undefined}
                  className={cn(day.status === "past" && "text-muted-foreground")}
                >
                  <TableHead
                    className={cn(
                      "py-1.5",
                      day.status === "today" && "bg-foreground text-background",
                    )}
                    scope="row"
                  >
                    {expandable ? (
                      <button
                        aria-controls={open ? detailsId : undefined}
                        aria-expanded={open}
                        aria-label={`Detalhes do dia ${dayNumber}`}
                        className="-mx-1 rounded-sm px-1 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        onClick={() => setOpenDate(open ? null : day.date)}
                        type="button"
                      >
                        {dayLabel}
                      </button>
                    ) : (
                      dayLabel
                    )}
                  </TableHead>
                  <TableCell className="text-right">
                    {day.dailyAmount === null ? (
                      <>
                        <span className="sr-only">Realizado</span>
                        <span aria-hidden="true">—</span>
                      </>
                    ) : (
                      <MoneyValue amount={day.dailyAmount} />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="grid justify-items-end text-xs">
                      {day.incomeAmount > 0 ? (
                        <MoneyValue
                          amount={day.incomeAmount}
                          className="text-success text-xs"
                          showPositiveSign
                        />
                      ) : null}
                      {outflow > 0 ? (
                        <MoneyValue amount={-outflow} className="text-destructive text-xs" />
                      ) : null}
                      {day.incomeAmount === 0 && outflow === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell
                    className={cn("text-right font-medium", usageLevelCellStyles[day.level])}
                    title={dailyBalanceLevelLabels[day.level]}
                  >
                    <MoneyValue
                      amount={day.closingBalance}
                      className={usageLevelTextStyles[day.level]}
                    />
                  </TableCell>
                </TableRow>
                {open ? (
                  <TableRow className="bg-muted/40 hover:bg-muted/40" id={detailsId}>
                    <TableCell className="whitespace-normal py-2" colSpan={4}>
                      <ul className="grid gap-1 text-xs">
                        {withEventKeys(day.events).map(({ event, key }) => (
                          <li className="flex items-center justify-between gap-3" key={key}>
                            <span className="min-w-0 truncate">
                              {event.kind === "simulation" ? "Simulação: " : null}
                              {event.label}
                            </span>
                            <MoneyValue
                              amount={event.amount}
                              className={cn(
                                "text-xs",
                                event.amount >= 0 ? "text-success" : "text-destructive",
                              )}
                              showPositiveSign
                            />
                          </li>
                        ))}
                        {(day.dailyAmount ?? 0) > 0 ? (
                          <li className="flex items-center justify-between gap-3 text-muted-foreground">
                            <span>Gastos variáveis previstos (orçamento)</span>
                            <MoneyValue amount={-(day.dailyAmount ?? 0)} className="text-xs" />
                          </li>
                        ) : null}
                      </ul>
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

/** Stable keys for a day's events, which may repeat the same label and amount. */
function withEventKeys(events: CashForecastDayOutput["events"]) {
  const seen = new Map<string, number>();
  return events.map((event) => {
    const base = `${event.kind}:${event.label}:${event.amount}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return { event, key: `${base}:${count}` };
  });
}
