import type { CategoryOutput } from "@openmonetis/validators/categories";
import type { ExpenseCategoryNaturesOutput } from "@openmonetis/validators/expense-natures";
import {
  UpdateUserPreferencesInputSchema,
  type UserPreferencesOutput,
} from "@openmonetis/validators/preferences";
import { useForm, useStore } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, LoaderCircle, ShieldCheck, Tags } from "lucide-react";
import { useId } from "react";
import { toast } from "sonner";
import { UnsavedChangesGuard } from "@/components/forms/unsaved-changes-guard";
import { SettingsPanel, SettingsSection } from "@/components/settings-panel";
import { SettingsQueryError } from "@/components/settings-query-error";
import { SettingsRow } from "@/components/settings-row";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  getCategoryLabel,
  sortCategoryOptions,
} from "@/features/categories/categories.presentation";
import { categoriesQueryOptions } from "@/features/categories/categories.queries";
import { CategoryIcon } from "@/features/categories/category-icons";
import { useUpdateUserPreferencesMutation } from "@/features/preferences/preferences.mutations";
import { userPreferencesQueryOptions } from "@/features/preferences/preferences.queries";
import { useReplaceExpenseCategoryNaturesMutation } from "../expense-natures.mutations";
import {
  type CategoryNatureChoice,
  categoryNatureChoiceLabels,
  categoryNatureChoices,
  toCategoryNatureChoices,
  toCategoryNatureItems,
} from "../expense-natures.presentation";
import { expenseCategoryNaturesQueryOptions } from "../expense-natures.queries";

/**
 * Settings of the daily budget logic: what counts as fixed (reserved for the month) and what is
 * variable (uses up the daily allowance), plus the minimum balance of the daily forecast.
 */
export function DailyBudgetSettings() {
  const preferencesQuery = useQuery(userPreferencesQueryOptions());
  const naturesQuery = useQuery(expenseCategoryNaturesQueryOptions());
  const categoriesQuery = useQuery(categoriesQueryOptions());

  if (preferencesQuery.isPending || naturesQuery.isPending || categoriesQuery.isPending) {
    return (
      <div aria-label="Carregando ajustes do orçamento diário" className="grid gap-4" role="status">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }
  if (!preferencesQuery.data || !naturesQuery.data || !categoriesQuery.data) {
    return (
      <SettingsQueryError
        isRetrying={
          preferencesQuery.isFetching || naturesQuery.isFetching || categoriesQuery.isFetching
        }
        message="Não foi possível carregar os ajustes do orçamento diário."
        onRetry={() => {
          void preferencesQuery.refetch();
          void naturesQuery.refetch();
          void categoriesQuery.refetch();
        }}
      />
    );
  }

  return (
    <DailyBudgetSettingsEditor
      categories={sortCategoryOptions(
        categoriesQuery.data.filter(
          (category) => category.type === "expense" && !category.isSystem,
        ),
      )}
      key={`${preferencesQuery.dataUpdatedAt}-${naturesQuery.dataUpdatedAt}`}
      natures={naturesQuery.data}
      preferences={preferencesQuery.data}
    />
  );
}

function DailyBudgetSettingsEditor({
  categories,
  natures,
  preferences,
}: {
  categories: CategoryOutput[];
  natures: ExpenseCategoryNaturesOutput;
  preferences: UserPreferencesOutput;
}) {
  const id = useId();
  const updatePreferences = useUpdateUserPreferencesMutation();
  const replaceNatures = useReplaceExpenseCategoryNaturesMutation();
  const savedChoices = toCategoryNatureChoices(natures.items);
  const defaultValues = {
    installmentsAreFixed: preferences.installmentsAreFixed,
    recurringAreFixed: preferences.recurringAreFixed,
    minimumAutomatic: preferences.forecastMinimumBalance === null,
    minimumAmount:
      preferences.forecastMinimumBalance === null ? "" : String(preferences.forecastMinimumBalance),
    choices: Object.fromEntries(
      categories.map((category) => [category.id, savedChoices[category.id] ?? "auto"]),
    ) as Record<string, CategoryNatureChoice>,
  };
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const preferencesInput = UpdateUserPreferencesInputSchema.safeParse({
        installmentsAreFixed: value.installmentsAreFixed,
        recurringAreFixed: value.recurringAreFixed,
        forecastMinimumBalance: value.minimumAutomatic ? null : Number(value.minimumAmount || 0),
      });
      if (!preferencesInput.success) {
        toast.error("Revise o saldo mínimo informado.");
        return;
      }
      try {
        await Promise.all([
          updatePreferences.mutateAsync(preferencesInput.data),
          replaceNatures.mutateAsync({ items: toCategoryNatureItems(value.choices) }),
        ]);
        toast.success("Ajustes do orçamento diário salvos");
      } catch {
        toast.error("Não foi possível salvar os ajustes. Tente novamente.");
      }
    },
  });
  const hasChanges = useStore(form.store, (state) => !state.isDefaultValue);
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

  return (
    <form
      className="grid gap-4"
      data-mobile-page-form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <SettingsPanel>
        <SettingsSection
          description="Despesas fixas ficam reservadas no mês inteiro e não contam como gasto do dia. Despesas únicas são variáveis e consomem o valor diário."
          icon={CalendarClock}
          title="Regra por tipo de lançamento"
        >
          <form.Field name="installmentsAreFixed">
            {(field) => (
              <SettingsRow
                description="Cada parcela é reservada no mês da fatura ou do vencimento."
                id={`${id}-installments`}
                label="Parceladas são fixas"
              >
                <Switch
                  aria-describedby={`${id}-installments-description`}
                  checked={field.state.value}
                  disabled={isSubmitting}
                  id={`${id}-installments`}
                  onCheckedChange={(checked) => field.handleChange(checked)}
                />
              </SettingsRow>
            )}
          </form.Field>
          <form.Field name="recurringAreFixed">
            {(field) => (
              <SettingsRow
                description="Aluguel, assinaturas e contas recorrentes ficam reservados desde o dia 1."
                id={`${id}-recurring`}
                label="Recorrentes são fixas"
              >
                <Switch
                  aria-describedby={`${id}-recurring-description`}
                  checked={field.state.value}
                  disabled={isSubmitting}
                  id={`${id}-recurring`}
                  onCheckedChange={(checked) => field.handleChange(checked)}
                />
              </SettingsRow>
            )}
          </form.Field>
        </SettingsSection>

        <SettingsSection
          contentClassName="lg:py-4"
          description="Exceções à regra: em uma categoria sempre fixa até despesas únicas ficam reservadas (ex.: Moradia); em uma sempre variável, até parcelas consomem o diário."
          icon={Tags}
          title="Categorias"
        >
          {categories.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhuma categoria de despesa cadastrada.
            </p>
          ) : (
            <ul className="divide-y">
              {categories.map((category) => (
                <li
                  className="flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  key={category.id}
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <CategoryIcon
                      className="size-4 shrink-0 text-muted-foreground"
                      name={category.icon}
                    />
                    <span className="truncate">{getCategoryLabel(category)}</span>
                  </span>
                  <form.Field name={`choices.${category.id}`}>
                    {(field) => (
                      <ToggleGroup
                        aria-label={`Natureza das despesas de ${getCategoryLabel(category)}`}
                        className="grid w-full grid-cols-3 rounded-md bg-muted p-0.5 sm:flex sm:w-fit"
                        disabled={isSubmitting}
                        onValueChange={(value) => {
                          const choice = value[0] as CategoryNatureChoice | undefined;
                          if (choice) field.handleChange(choice);
                        }}
                        size="sm"
                        spacing={0.5}
                        value={[field.state.value ?? "auto"]}
                      >
                        {categoryNatureChoices.map((choice) => (
                          <ToggleGroupItem
                            className="h-8 rounded-[5px] px-2.5 text-muted-foreground text-xs hover:text-foreground data-pressed:bg-background data-pressed:font-medium data-pressed:text-foreground data-pressed:shadow-xs"
                            key={choice}
                            value={choice}
                          >
                            {categoryNatureChoiceLabels[choice]}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    )}
                  </form.Field>
                </li>
              ))}
            </ul>
          )}
        </SettingsSection>

        <SettingsSection
          description="Na projeção diária, dias abaixo desse valor ficam amarelos, abaixo da metade laranja e negativos vermelhos."
          icon={ShieldCheck}
          title="Saldo mínimo"
        >
          <form.Field name="minimumAutomatic">
            {(field) => (
              <SettingsRow
                description="Usa a soma dos limites de orçamento do mês atual."
                id={`${id}-minimum-automatic`}
                label="Valor automático"
              >
                <Switch
                  aria-describedby={`${id}-minimum-automatic-description`}
                  checked={field.state.value}
                  disabled={isSubmitting}
                  id={`${id}-minimum-automatic`}
                  onCheckedChange={(checked) => field.handleChange(checked)}
                />
              </SettingsRow>
            )}
          </form.Field>
          <form.Subscribe selector={(state) => state.values.minimumAutomatic}>
            {(automatic) =>
              automatic ? null : (
                <form.Field name="minimumAmount">
                  {(field) => (
                    <SettingsRow
                      description="Quanto quer manter nas contas em qualquer dia."
                      id={`${id}-minimum-amount`}
                      label="Saldo mínimo"
                    >
                      <CurrencyInput
                        aria-describedby={`${id}-minimum-amount-description`}
                        disabled={isSubmitting}
                        id={`${id}-minimum-amount`}
                        onValueChange={field.handleChange}
                        placeholder="R$ 0,00"
                        value={field.state.value}
                      />
                    </SettingsRow>
                  )}
                </form.Field>
              )
            }
          </form.Subscribe>
        </SettingsSection>
      </SettingsPanel>

      {hasChanges || isSubmitting ? (
        <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
          <p aria-live="polite" className="font-medium text-sm">
            {isSubmitting ? "Salvando ajustes…" : "Alterações não salvas"}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button
              disabled={isSubmitting}
              onClick={() => form.reset()}
              type="button"
              variant="outline"
            >
              Descartar
            </Button>
            <Button disabled={isSubmitting || !hasChanges} type="submit">
              {isSubmitting ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
              Salvar alterações
            </Button>
          </div>
        </div>
      ) : null}
      <UnsavedChangesGuard
        busyDescription="Os ajustes estão sendo salvos. Aguarde antes de sair."
        dirtyDescription="Você tem ajustes não salvos. Continue editando ou descarte para sair."
        hasChanges={hasChanges}
        isBusy={isSubmitting}
        onDiscard={() => form.reset()}
      />
    </form>
  );
}
