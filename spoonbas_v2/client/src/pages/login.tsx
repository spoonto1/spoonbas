import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ShieldLogo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { RoleBadge } from "@/components/badges";

type DemoUser = { email: string; name: string; role: string };

export default function LoginPage() {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [demo, setDemo] = useState<DemoUser[]>([]);

  useEffect(() => {
    fetch("/api/auth/demo-users")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => Array.isArray(d) && setDemo(d))
      .catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (err: any) {
      toast({
        title: "Sign-in failed",
        description: err?.message ?? "Invalid email or password.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(d: DemoUser) {
    setEmail(d.email);
    setPassword("demo");
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background console-grid p-6">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-stretch">
        {/* Left brand panel */}
        <div className="hidden md:flex flex-col justify-between p-8 rounded-lg border border-card-border bg-card/60 backdrop-blur">
          <div className="flex items-center gap-3">
            <ShieldLogo size={36} />
            <div>
              <div className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                Spoon BAS
              </div>
              <div className="text-base font-semibold">
                Service Operations Console
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-tight">
              Triage. Dispatch. Resolve.
            </h1>
            <p className="mt-3 text-sm text-muted-foreground max-w-sm">
              A controls-room console for HVAC and BAS service work. Track every
              call from intake through technician hand-off, with a structured
              troubleshooting checklist and team chat per ticket.
            </p>
            <div className="console-rule mt-6" />
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs uppercase tracking-widest text-muted-foreground tabular">
              <div>
                <div className="text-foreground text-base font-semibold">24/7</div>
                Intake
              </div>
              <div>
                <div className="text-foreground text-base font-semibold">5</div>
                Systems tracked
              </div>
              <div>
                <div className="text-foreground text-base font-semibold">3</div>
                Roles
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Local authentication. No external SSO.
          </div>
        </div>

        {/* Right login form */}
        <Card className="p-7 md:p-9">
          <div className="flex items-center gap-3 md:hidden mb-6">
            <ShieldLogo size={28} />
            <div className="text-base font-semibold">Spoon BAS</div>
          </div>
          <h2 className="text-xl font-semibold">Sign in</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Use your Spoon BAS account.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                data-testid="input-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@spoonbas.io"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                data-testid="input-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
              data-testid="button-signin"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          {demo.length > 0 && (
            <div className="mt-7">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                Demo accounts (password: demo)
              </div>
              <div className="grid gap-2">
                {demo.map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    onClick={() => fillDemo(d)}
                    data-testid={`button-demo-${d.role}`}
                    className="text-left flex items-center justify-between gap-3 p-2.5 rounded border border-card-border hover-elevate"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{d.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {d.email}
                      </div>
                    </div>
                    <RoleBadge role={d.role} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
