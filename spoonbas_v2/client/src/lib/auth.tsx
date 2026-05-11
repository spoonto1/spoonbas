import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest, queryClient, setAuthToken } from "./queryClient";
import type { SafeUser } from "@shared/schema";

type AuthState = {
  user: SafeUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, try silent /me using existing session cookie. Bearer token is in
  // React memory only and is cleared on hard refresh, so this is effectively a
  // session-cookie-only check on cold start.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/auth/me`, { credentials: "include" });
        if (!cancelled) {
          if (res.ok) {
            setUser(await res.json());
          } else {
            setUser(null);
          }
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      async signIn(email, password) {
        const res = await apiRequest("POST", "/api/auth/login", {
          email,
          password,
        });
        const json = (await res.json()) as { user: SafeUser; token: string };
        setAuthToken(json.token);
        setUser(json.user);
        queryClient.invalidateQueries();
      },
      async signOut() {
        try {
          await apiRequest("POST", "/api/auth/logout", {});
        } catch {
          // ignore
        }
        setAuthToken(null);
        setUser(null);
        queryClient.clear();
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
