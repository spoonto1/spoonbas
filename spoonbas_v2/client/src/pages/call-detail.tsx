import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { ConsoleShell } from "@/components/console-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  StatusBadge,
  PriorityBadge,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from "@/components/badges";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  ServiceCall,
  CallMessage,
  ChecklistItem,
  SafeUser,
} from "@shared/schema";
import {
  ArrowLeft,
  Send,
  Plus,
  Trash2,
  MapPin,
  Phone,
  User,
  Clock,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

export default function CallDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const callQ = useQuery<ServiceCall>({
    queryKey: ["/api/service-calls", id],
    enabled: Number.isFinite(id),
  });
  const usersQ = useQuery<SafeUser[]>({ queryKey: ["/api/users"] });
  const msgsQ = useQuery<CallMessage[]>({
    queryKey: ["/api/service-calls", id, "messages"],
    enabled: Number.isFinite(id),
  });
  const checklistQ = useQuery<ChecklistItem[]>({
    queryKey: ["/api/service-calls", id, "checklist"],
    enabled: Number.isFinite(id),
  });

  const usersById = useMemo(() => {
    const m = new Map<number, SafeUser>();
    (usersQ.data ?? []).forEach((u) => m.set(u.id, u));
    return m;
  }, [usersQ.data]);

  const updateCall = useMutation({
    mutationFn: async (patch: Partial<ServiceCall>) => {
      const res = await apiRequest("PATCH", `/api/service-calls/${id}`, patch);
      return (await res.json()) as ServiceCall;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-calls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/service-calls", id] });
    },
  });

  const [msg, setMsg] = useState("");
  const sendMsg = useMutation({
    mutationFn: async (body: string) => {
      const res = await apiRequest(
        "POST",
        `/api/service-calls/${id}/messages`,
        { body },
      );
      return (await res.json()) as CallMessage;
    },
    onSuccess: () => {
      setMsg("");
      queryClient.invalidateQueries({
        queryKey: ["/api/service-calls", id, "messages"],
      });
    },
  });

  const [newItem, setNewItem] = useState("");
  const addItem = useMutation({
    mutationFn: async (label: string) => {
      const res = await apiRequest(
        "POST",
        `/api/service-calls/${id}/checklist`,
        { label, position: (checklistQ.data ?? []).length },
      );
      return (await res.json()) as ChecklistItem;
    },
    onSuccess: () => {
      setNewItem("");
      queryClient.invalidateQueries({
        queryKey: ["/api/service-calls", id, "checklist"],
      });
    },
  });

  const toggleItem = useMutation({
    mutationFn: async ({ itemId, done }: { itemId: number; done: boolean }) => {
      const res = await apiRequest("PATCH", `/api/checklist/${itemId}`, { done });
      return (await res.json()) as ChecklistItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/service-calls", id, "checklist"],
      });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (itemId: number) => {
      await apiRequest("DELETE", `/api/checklist/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/service-calls", id, "checklist"],
      });
    },
  });

  if (!Number.isFinite(id)) {
    return (
      <ConsoleShell>
        <div className="p-8">Invalid call id.</div>
      </ConsoleShell>
    );
  }

  if (callQ.isLoading) {
    return (
      <ConsoleShell>
        <div className="p-8 text-muted-foreground">Loading call…</div>
      </ConsoleShell>
    );
  }

  if (callQ.error || !callQ.data) {
    return (
      <ConsoleShell>
        <div className="p-8">
          <div className="text-sm text-muted-foreground">
            Could not load this service call.
          </div>
          <Link href="/">
            <Button variant="outline" className="mt-3" data-testid="link-back-queue">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to queue
            </Button>
          </Link>
        </div>
      </ConsoleShell>
    );
  }

  const call = callQ.data;
  const tech = call.assignedToId ? usersById.get(call.assignedToId) : null;
  const technicians = (usersQ.data ?? []).filter(
    (u) => u.role === "technician" || u.role === "admin",
  );

  return (
    <ConsoleShell>
      <div className="px-5 md:px-8 pt-6 pb-4 border-b border-border">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <Link href="/">
              <button
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center"
                data-testid="link-back-queue"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Service queue
              </button>
            </Link>
            <div className="mt-1 flex items-center gap-3 flex-wrap">
              <span
                className="font-mono text-xs tabular text-muted-foreground"
                data-testid="text-call-ticket"
              >
                {call.ticketNumber}
              </span>
              <h1 className="text-xl font-semibold" data-testid="text-call-site">
                {call.siteName}
              </h1>
              <StatusBadge value={call.status} testId="badge-call-status" />
              <PriorityBadge value={call.priority} testId="badge-call-priority" />
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {call.systemType} · {call.symptom}
            </div>
          </div>
          {(user?.role === "admin" || user?.role === "dispatcher") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!confirm("Delete this service call?")) return;
                apiRequest("DELETE", `/api/service-calls/${id}`)
                  .then(() => {
                    queryClient.invalidateQueries({
                      queryKey: ["/api/service-calls"],
                    });
                    navigate("/");
                  })
                  .catch((e: any) =>
                    toast({
                      title: "Delete failed",
                      description: e?.message ?? "",
                      variant: "destructive",
                    }),
                  );
              }}
              data-testid="button-delete-call"
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          )}
        </div>
        <div className="console-rule mt-4" />
      </div>

      <div className="px-5 md:px-8 py-6 grid lg:grid-cols-3 gap-5">
        {/* Left: details + checklist */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-5">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
              Call detail
            </div>
            <p
              className="text-sm leading-relaxed whitespace-pre-wrap"
              data-testid="text-call-description"
            >
              {call.description}
            </p>
            <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
              <Info icon={MapPin} label="Site address" value={call.siteAddress} />
              <Info icon={User} label="Site contact" value={call.contactName} />
              <Info icon={Phone} label="Phone" value={call.contactPhone} />
              <Info
                icon={Clock}
                label="Updated"
                value={formatDateTime(call.updatedAt)}
              />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Triage / Troubleshooting
              </div>
              <span
                className="text-xs text-muted-foreground tabular"
                data-testid="text-checklist-count"
              >
                {(checklistQ.data ?? []).filter((i) => i.done).length}/
                {(checklistQ.data ?? []).length} complete
              </span>
            </div>
            <div className="space-y-1.5">
              {(checklistQ.data ?? []).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 group p-2 rounded hover-elevate"
                  data-testid={`row-checklist-${item.id}`}
                >
                  <Checkbox
                    checked={item.done}
                    onCheckedChange={(v) =>
                      toggleItem.mutate({ itemId: item.id, done: !!v })
                    }
                    data-testid={`checkbox-checklist-${item.id}`}
                    className="mt-0.5"
                  />
                  <div
                    className={`flex-1 text-sm ${
                      item.done ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {item.label}
                  </div>
                  <button
                    onClick={() => deleteItem.mutate(item.id)}
                    className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
                    data-testid={`button-delete-checklist-${item.id}`}
                    aria-label="Delete checklist item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {(checklistQ.data ?? []).length === 0 && (
                <div className="text-sm text-muted-foreground py-2">
                  No checklist items yet.
                </div>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newItem.trim()) addItem.mutate(newItem.trim());
              }}
              className="mt-3 flex items-center gap-2"
            >
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Add a troubleshooting step…"
                data-testid="input-new-checklist-item"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!newItem.trim() || addItem.isPending}
                data-testid="button-add-checklist-item"
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </form>
          </Card>
        </div>

        {/* Right column: assignment + chat */}
        <div className="space-y-5">
          <Card className="p-5">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
              Assignment
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <Select
                  value={call.status}
                  onValueChange={(v) => updateCall.mutate({ status: v as any })}
                >
                  <SelectTrigger
                    className="mt-1"
                    data-testid="select-update-status"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Priority</label>
                <Select
                  value={call.priority}
                  onValueChange={(v) =>
                    updateCall.mutate({ priority: v as any })
                  }
                >
                  <SelectTrigger
                    className="mt-1"
                    data-testid="select-update-priority"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Assigned to
                </label>
                <Select
                  value={tech ? String(tech.id) : "none"}
                  onValueChange={(v) =>
                    updateCall.mutate({
                      assignedToId: v === "none" ? null : (Number(v) as any),
                    })
                  }
                >
                  <SelectTrigger
                    className="mt-1"
                    data-testid="select-update-assignee"
                  >
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {technicians.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name} · {t.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="p-5 flex flex-col h-[520px]">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
              Call thread
            </div>
            <div
              className="flex-1 overflow-y-auto space-y-3 pr-1"
              data-testid="list-messages"
            >
              {(msgsQ.data ?? []).length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No messages yet.
                </div>
              )}
              {(msgsQ.data ?? []).map((m) => {
                const author = usersById.get(m.authorId);
                const isMe = m.authorId === user?.id;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      isMe ? "items-end" : "items-start"
                    }`}
                    data-testid={`row-message-${m.id}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-lg px-3 py-2 text-sm ${
                        isMe
                          ? "bg-[hsl(var(--primary)/0.15)] border border-[hsl(var(--primary)/0.4)]"
                          : "bg-muted/60 border border-card-border"
                      }`}
                    >
                      <div className="text-[11px] text-muted-foreground mb-0.5">
                        {author?.name ?? `User #${m.authorId}`} ·{" "}
                        {formatDateTime(m.createdAt)}
                      </div>
                      <div className="whitespace-pre-wrap">{m.body}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (msg.trim()) sendMsg.mutate(msg.trim());
              }}
              className="mt-3 flex items-end gap-2"
            >
              <Textarea
                rows={2}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Reply to the team…"
                data-testid="input-new-message"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (msg.trim()) sendMsg.mutate(msg.trim());
                  }
                }}
              />
              <Button
                type="submit"
                disabled={!msg.trim() || sendMsg.isPending}
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </ConsoleShell>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  );
}
