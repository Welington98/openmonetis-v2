import type { UsageLevel } from "@openmonetis/domain/usage-levels";

/** Same four colors everywhere a usage level appears: green, yellow, orange and red. */
export const usageLevelTextStyles: Record<UsageLevel, string> = {
  healthy: "text-success",
  attention: "text-attention",
  warning: "text-caution",
  critical: "text-destructive",
};

export const usageLevelBarStyles: Record<UsageLevel, string> = {
  healthy: "bg-success",
  attention: "bg-attention",
  warning: "bg-caution",
  critical: "bg-destructive",
};

export const usageLevelTrackStyles: Record<UsageLevel, string> = {
  healthy: "bg-success/20",
  attention: "bg-attention/20",
  warning: "bg-caution/20",
  critical: "bg-destructive/20",
};

export const usageLevelBadgeStyles: Record<UsageLevel, string> = {
  healthy: "bg-success/10 text-success",
  attention: "bg-attention/15 text-attention",
  warning: "bg-caution/10 text-caution",
  critical: "bg-destructive/10 text-destructive",
};

export const usageLevelCellStyles: Record<UsageLevel, string> = {
  healthy: "bg-success/10",
  attention: "bg-attention/15",
  warning: "bg-caution/15",
  critical: "bg-destructive/15",
};
