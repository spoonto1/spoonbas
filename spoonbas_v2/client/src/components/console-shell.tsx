import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { ShieldLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/badges";
import {
  LayoutDashboard,
  ClipboardList,
  Plus,
  LogOut,
  Sun,
  Moon,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const [location] = useLocation();

  if (!user) return null;

  const nav = [
    { href: "/", label: "Queue", icon: LayoutDashboard, testId: "link-queue" },
    {
      href: "/new",
      label: "New Call",
      icon: Plus,
      testId: "link-new-call",
    },
    {
      href: "/team",
      label: "Team",
      icon: Users,
      testId: "link-team",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="px-4 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <ShieldLogo size={28} />
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-sidebar-foreground/60">
                Spoon BAS
              </div>
              <div className="text-sm font-semibold">Service Console</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {nav.map((n) => {
            const active = n.href === "/" ? location === "/" : location.startsWith(n.href);
            const Icon = n.icon;
            return (
              <Link key={n.href} href={n.href} data-testid={n.testId}>
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm hover-elevate cursor-pointer",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/85",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{n.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-sidebar-accent/40">
            <div className="h-7 w-7 rounded-full bg-[hsl(var(--primary)/0.25)] grid place-items-center text-[11px] font-semibold text-[hsl(var(--primary))]">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="text-xs font-medium truncate"
                data-testid="text-user-name"
              >
                {user.name}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60">
                <RoleBadge role={user.role} />
              </div>
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start"
              onClick={toggle}
              data-testid="button-toggle-theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 mr-1" />
              ) : (
                <Moon className="h-4 w-4 mr-1" />
              )}
              {theme === "dark" ? "Light" : "Dark"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              data-testid="button-signout"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <ShieldLogo size={22} />
          <div className="text-sm font-semibold">Spoon BAS</div>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/new">
            <Button size="sm" variant="outline" data-testid="link-new-call-mobile">
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => signOut()}
            data-testid="button-signout-mobile"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 pt-12 md:pt-0">{children}</main>
    </div>
  );
}
