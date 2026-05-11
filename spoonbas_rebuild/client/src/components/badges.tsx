import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  triaged: "Triaged",
  dispatched: "Dispatched",
  on_site: "On Site",
  resolved: "Resolved",
  closed: "Closed",
};

const STATUS_CLASSES: Record<string, string> = {
  new: "bg-[hsl(var(--info)/0.15)] text-[hsl(var(--info))] border-[hsl(var(--info)/0.4)]",
  triaged:
    "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.4)]",
  dispatched:
    "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.4)]",
  on_site:
    "bg-[hsl(var(--primary)/0.25)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.6)]",
  resolved:
    "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.4)]",
  closed:
    "bg-muted text-muted-foreground border-border",
};

const PRIORITY_LABEL: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  critical: "Critical",
};

const PRIORITY_CLASSES: Record<string, string> = {
  low: "bg-muted text-muted-foreground border-border",
  normal:
    "bg-[hsl(var(--info)/0.12)] text-[hsl(var(--info))] border-[hsl(var(--info)/0.35)]",
  high:
    "bg-[hsl(var(--warning)/0.18)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.45)]",
  critical:
    "bg-[hsl(var(--destructive)/0.18)] text-[hsl(var(--destructive))] border-[hsl(var(--destructive)/0.5)]",
};

export function StatusBadge({
  value,
  className,
  testId,
}: {
  value: string;
  className?: string;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide border rounded",
        STATUS_CLASSES[value] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      {STATUS_LABEL[value] ?? value}
    </span>
  );
}

export function PriorityBadge({
  value,
  className,
  testId,
}: {
  value: string;
  className?: string;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide border rounded",
        PRIORITY_CLASSES[value] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          value === "critical"
            ? "bg-[hsl(var(--destructive))] animate-pulse"
            : value === "high"
              ? "bg-[hsl(var(--warning))]"
              : value === "normal"
                ? "bg-[hsl(var(--info))]"
                : "bg-muted-foreground",
        )}
      />
      {PRIORITY_LABEL[value] ?? value}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const tone =
    role === "admin"
      ? "bg-[hsl(var(--primary)/0.18)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.4)]"
      : role === "dispatcher"
        ? "bg-[hsl(var(--info)/0.15)] text-[hsl(var(--info))] border-[hsl(var(--info)/0.4)]"
        : "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest border rounded",
        tone,
      )}
    >
      {role}
    </span>
  );
}

export const STATUS_OPTIONS = Object.keys(STATUS_LABEL);
export const PRIORITY_OPTIONS = Object.keys(PRIORITY_LABEL);
export { STATUS_LABEL, PRIORITY_LABEL };
