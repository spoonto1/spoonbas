import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ServiceCall, SafeUser } from "@shared/schema";
import { ConsoleShell } from "@/components/console-shell";
import { StatusBadge, PriorityBadge, STATUS_OPTIONS } from "@/components/badges";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { Search, Plus, Activity } from "lucide-react";
import { formatTimeAgo } from "@/lib/format";

export default function QueuePage() {
  const callsQ = useQuery<ServiceCall[]>({ queryKey: ["/api/service-calls"] });
  const usersQ = useQuery<SafeUser[]>({ queryKey: ["/api/users"] });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const usersById = useMemo(() => {
    const m = new Map<number, SafeUser>();
    (usersQ.data ?? []).forEach((u) => m.set(u.id, u));
    return m;
  }, [usersQ.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (callsQ.data ?? []).filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (!q) return true;
      return (
        c.ticketNumber.toLowerCase().includes(q) ||
        c.siteName.toLowerCase().includes(q) ||
        c.symptom.toLowerCase().includes(q) ||
        c.systemType.toLowerCase().includes(q)
      );
    });
  }, [callsQ.data, search, status]);

  const stats = useMemo(() => {
    const all = callsQ.data ?? [];
    return {
      open: all.filter((c) => c.status !== "resolved" && c.status !== "closed")
        .length,
      critical: all.filter((c) => c.priority === "critical").length,
      onSite: all.filter((c) => c.status === "on_site").length,
      resolved: all.filter((c) => c.status === "resolved").length,
    };
  }, [callsQ.data]);

  return (
    <ConsoleShell>
      <div className="px-5 md:px-8 pt-6 pb-4 border-b border-border">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              Service Queue
            </div>
            <h1 className="text-xl font-semibold mt-1">Active service calls</h1>
          </div>
          <Link href="/new">
            <Button data-testid="button-new-call">
              <Plus className="h-4 w-4 mr-1" /> New service call
            </Button>
          </Link>
        </div>
        <div className="console-rule mt-4" />
      </div>

      <div className="px-5 md:px-8 py-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI label="Open" value={stats.open} testId="stat-open" />
          <KPI
            label="Critical"
            value={stats.critical}
            testId="stat-critical"
            tone="critical"
          />
          <KPI label="On site" value={stats.onSite} testId="stat-onsite" tone="primary" />
          <KPI label="Resolved" value={stats.resolved} testId="stat-resolved" tone="success" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              data-testid="input-search-calls"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticket, site, symptom"
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger
              className="w-[180px]"
              data-testid="select-status-filter"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Queue list */}
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[110px_1fr_120px_120px_140px] text-[11px] uppercase tracking-widest text-muted-foreground px-4 py-2.5 border-b border-card-border bg-muted/30">
            <div>Ticket</div>
            <div>Site / Symptom</div>
            <div>Status</div>
            <div>Priority</div>
            <div>Updated</div>
          </div>
          {callsQ.isLoading && (
            <div className="p-6 text-sm text-muted-foreground">Loading calls…</div>
          )}
          {!callsQ.isLoading && filtered.length === 0 && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <Activity className="h-6 w-6 mx-auto mb-2 opacity-50" />
              No service calls match the current filter.
            </div>
          )}
          {filtered.map((c) => {
            const tech = c.assignedToId
              ? usersById.get(c.assignedToId)
              : null;
            return (
              <Link key={c.id} href={`/calls/${c.id}`}>
                <div
                  data-testid={`row-call-${c.id}`}
                  className="grid grid-cols-[110px_1fr_120px_120px_140px] items-center px-4 py-3 border-b border-card-border last:border-b-0 hover-elevate cursor-pointer"
                >
                  <div
                    className="font-mono text-xs tabular text-foreground"
                    data-testid={`text-ticket-${c.id}`}
                  >
                    {c.ticketNumber}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {c.siteName}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.systemType} · {c.symptom}
                      {tech ? ` · ${tech.name}` : ""}
                    </div>
                  </div>
                  <div>
                    <StatusBadge value={c.status} testId={`status-${c.id}`} />
                  </div>
                  <div>
                    <PriorityBadge
                      value={c.priority}
                      testId={`priority-${c.id}`}
                    />
                  </div>
                  <div
                    className="text-xs text-muted-foreground tabular"
                    data-testid={`text-updated-${c.id}`}
                  >
                    {formatTimeAgo(c.updatedAt)}
                  </div>
                </div>
              </Link>
            );
          })}
        </Card>
      </div>
    </ConsoleShell>
  );
}

function KPI({
  label,
  value,
  tone,
  testId,
}: {
  label: string;
  value: number;
  tone?: "critical" | "primary" | "success";
  testId?: string;
}) {
  const accent =
    tone === "critical"
      ? "text-[hsl(var(--destructive))]"
      : tone === "primary"
        ? "text-[hsl(var(--primary))]"
        : tone === "success"
          ? "text-[hsl(var(--success))]"
          : "text-foreground";
  return (
    <Card className="p-4">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 text-xl font-semibold tabular ${accent}`}
        data-testid={testId}
      >
        {value}
      </div>
    </Card>
  );
}
