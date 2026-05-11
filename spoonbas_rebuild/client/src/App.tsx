import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider, useAuth } from "@/lib/auth";
import LoginPage from "@/pages/login";
import QueuePage from "@/pages/queue";
import NewCallPage from "@/pages/new-call";
import CallDetailPage from "@/pages/call-detail";
import TeamPage from "@/pages/team";
import NotFound from "@/pages/not-found";

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-muted-foreground text-sm">
        Loading Spoon BAS…
      </div>
    );
  }
  if (!user) return <LoginPage />;
  return (
    <Switch>
      <Route path="/" component={QueuePage} />
      <Route path="/new" component={NewCallPage} />
      <Route path="/calls/:id" component={CallDetailPage} />
      <Route path="/team" component={TeamPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router hook={useHashLocation}>
              <ProtectedRoutes />
            </Router>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
