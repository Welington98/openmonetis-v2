import type { BudgetOutput } from "@openmonetis/validators/budgets";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { CardActionsMenu } from "@/components/card-actions-menu";
import { MoneyValue } from "@/components/money-value";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { CategoryIcon } from "@/features/categories/category-icons";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  usageLevelBadgeStyles,
  usageLevelBarStyles,
  usageLevelTextStyles,
} from "@/lib/usage-level-presentation";
import { cn } from "@/lib/utils";
import {
  formatBudgetPercentage,
  formatDailyAllowanceDays,
  getBudgetLevelLabel,
} from "../budgets.presentation";

type BudgetCardProps = {
  budget: BudgetOutput;
  categorySlug?: string;
  onEdit: (budget: BudgetOutput) => void;
  onRemove: (budget: BudgetOutput) => Promise<void>;
  pending?: boolean;
};

export function BudgetCard({
  budget,
  categorySlug,
  onEdit,
  onRemove,
  pending = false,
}: BudgetCardProps) {
  const [removeOpen, setRemoveOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isMobile = useIsMobile();
  // Phones list several budgets at once, so the launched/expected breakdown folds there.
  const showDetails = isMobile !== true || detailsOpen;
  const detailsId = `budget-${budget.id}-details`;
  const exceeded = budget.status === "exceeded";

  return (
    <Card className="gap-4 border max-md:gap-3 max-md:py-4">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
              <CategoryIcon className="size-5" name={budget.categoryIcon} />
            </span>
            <CardTitle className="truncate">{budget.categoryName}</CardTitle>
          </div>
          {/* Only states that ask for attention get a badge; the bar already shows "on track". */}
          {budget.level !== "healthy" ? (
            <Badge
              className={cn("shrink-0 border-transparent", usageLevelBadgeStyles[budget.level])}
              variant="outline"
            >
              {getBudgetLevelLabel(budget)}
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="flex flex-wrap items-baseline gap-x-1.5">
            <MoneyValue
              amount={budget.committedAmount}
              className="font-medium text-2xl max-md:text-lg"
            />
            <span className="text-muted-foreground text-sm">
              de <MoneyValue amount={budget.amount} />
            </span>
          </p>
          <span
            className={cn(
              "font-medium text-sm tabular-nums",
              budget.level === "healthy"
                ? "text-muted-foreground"
                : usageLevelTextStyles[budget.level],
            )}
          >
            {formatBudgetPercentage(budget.usagePercentage)}%
          </span>
        </div>
        <Progress
          aria-label={`${formatBudgetPercentage(budget.usagePercentage)}% do limite de ${budget.categoryName} usado`}
          indicatorClassName={usageLevelBarStyles[budget.level]}
          value={Math.min(budget.usagePercentage, 100)}
        />
        <p className={cn("font-medium text-sm", exceeded && "text-destructive")}>
          {exceeded ? (
            <>
              <MoneyValue amount={budget.exceededAmount} /> acima do limite
            </>
          ) : (
            <>
              Restam <MoneyValue amount={budget.remainingAmount} />
            </>
          )}
        </p>
        {budget.daily ? <BudgetDailyAllowanceLine daily={budget.daily} /> : null}
        {showDetails ? (
          <p className="text-muted-foreground text-xs" id={detailsId}>
            <MoneyValue amount={budget.actualSpentAmount} /> lançado
            {budget.projectedAmount > 0 ? (
              <>
                {" "}
                + <MoneyValue amount={budget.projectedAmount} /> previsto em recorrências
              </>
            ) : null}
          </p>
        ) : null}
      </CardContent>

      <CardFooter className="flex flex-wrap items-center gap-3 border-t pt-3">
        {isMobile === true ? (
          <button
            aria-controls={detailsOpen ? detailsId : undefined}
            aria-expanded={detailsOpen}
            className="-mx-1 inline-flex h-8 items-center gap-1.5 rounded-md px-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring"
            onClick={() => setDetailsOpen((open) => !open)}
            type="button"
          >
            Detalhes
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "size-3.5 transition-transform motion-reduce:transition-none",
                detailsOpen && "rotate-180",
              )}
            />
          </button>
        ) : null}
        <button
          className="-mx-1 inline-flex h-8 items-center gap-1.5 rounded-md px-2 font-medium text-brand-strong text-sm transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring"
          onClick={() => onEdit(budget)}
          type="button"
        >
          <Pencil aria-hidden="true" className="size-3.5" />
          Editar
        </button>
        {categorySlug ? (
          <Link
            className="-mx-1 inline-flex h-8 items-center gap-1.5 rounded-md px-2 font-medium text-brand-strong text-sm transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring"
            search={{ categories: categorySlug, period: budget.period, type: "expense" }}
            to="/transactions"
          >
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
            Lançamentos
          </Link>
        ) : null}
        <CardActionsMenu disabled={pending} label={`Mais ações para ${budget.categoryName}`}>
          <DropdownMenuItem onClick={() => setRemoveOpen(true)} variant="destructive">
            <Trash2 aria-hidden="true" /> Remover orçamento
          </DropdownMenuItem>
        </CardActionsMenu>
      </CardFooter>

      <AlertDialog onOpenChange={setRemoveOpen} open={removeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover orçamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O limite de &quot;{budget.categoryName}&quot; será removido apenas deste mês. Os
              lançamentos da categoria não serão alterados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() => {
                void (async () => {
                  try {
                    await onRemove(budget);
                    setRemoveOpen(false);
                  } catch {
                    // The page keeps the confirmation open and presents the error in a toast.
                  }
                })();
              }}
              variant="destructive"
            >
              {pending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/** Today's share of what is left after the month's recurring expenses: room for variable spending. */
function BudgetDailyAllowanceLine({ daily }: { daily: NonNullable<BudgetOutput["daily"]> }) {
  const spentToday = daily.spentTodayAmount > 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md bg-muted/60 px-3 py-2 text-sm">
      <p className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-muted-foreground">Por dia</span>
        <MoneyValue
          amount={daily.allowanceAmount}
          className={cn("font-medium", spentToday && usageLevelTextStyles[daily.level])}
        />
      </p>
      <p className="text-muted-foreground text-xs">
        {spentToday ? (
          <>
            Hoje <MoneyValue amount={daily.spentTodayAmount} className="text-xs" />
            <span aria-hidden="true"> · </span>
          </>
        ) : null}
        {formatDailyAllowanceDays(daily.daysRemaining)}
      </p>
    </div>
  );
}
