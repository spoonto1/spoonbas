import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ConsoleShell } from "@/components/console-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { RoleBadge } from "@/components/badges";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type { SafeUser } from "@shared/schema";

export default function TeamPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const usersQ = useQuery<SafeUser[]>({ queryKey: ["/api/users"] });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "dispatcher" | "technician">(
    "technician",
  );

  const createUser = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/users", {
        name,
        email,
        password,
        role,
      });
      return (await res.json()) as SafeUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setName("");
      setEmail("");
      setPassword("");
      setRole("technician");
      toast({ title: "User added" });
    },
    onError: (e: any) =>
      toast({
        title: "Could not add user",
        description: e?.message ?? "",
        variant: "destructive",
      }),
  });

  return (
    <ConsoleShell>
      <div className="px-5 md:px-8 pt-6 pb-4 border-b border-border">
        <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          Team
        </div>
        <h1 className="text-xl font-semibold mt-1">People</h1>
        <div className="console-rule mt-4" />
      </div>

      <div className="px-5 md:px-8 py-6 grid lg:grid-cols-[1fr_360px] gap-5">
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_120px] text-[11px] uppercase tracking-widest text-muted-foreground px-4 py-2.5 border-b border-card-border bg-muted/30">
            <div>Name</div>
            <div>Email</div>
            <div>Role</div>
          </div>
          {(usersQ.data ?? []).map((u) => (
            <div
              key={u.id}
              data-testid={`row-user-${u.id}`}
              className="grid grid-cols-[1fr_1fr_120px] items-center px-4 py-3 border-b border-card-border last:border-b-0"
            >
              <div className="text-sm font-medium">{u.name}</div>
              <div className="text-xs text-muted-foreground tabular truncate">
                {u.email}
              </div>
              <div>
                <RoleBadge role={u.role} />
              </div>
            </div>
          ))}
        </Card>

        {user?.role === "admin" ? (
          <Card className="p-5">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
              Add user
            </div>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                createUser.mutate();
              }}
            >
              <div>
                <Label htmlFor="user-name">Name</Label>
                <Input
                  id="user-name"
                  data-testid="input-new-user-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="user-email">Email</Label>
                <Input
                  id="user-email"
                  data-testid="input-new-user-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="user-password">Initial password</Label>
                <Input
                  id="user-password"
                  data-testid="input-new-user-password"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Role</Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as any)}
                >
                  <SelectTrigger data-testid="select-new-user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">admin</SelectItem>
                    <SelectItem value="dispatcher">dispatcher</SelectItem>
                    <SelectItem value="technician">technician</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                disabled={createUser.isPending}
                data-testid="button-create-user"
              >
                {createUser.isPending ? "Adding…" : "Add user"}
              </Button>
            </form>
          </Card>
        ) : (
          <Card className="p-5 text-sm text-muted-foreground">
            Only admins can add users.
          </Card>
        )}
      </div>
    </ConsoleShell>
  );
}
