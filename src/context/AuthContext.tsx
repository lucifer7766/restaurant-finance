"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string, rememberMe: boolean) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();

    void supabase.auth.getUser().then(
      (result: Awaited<ReturnType<typeof supabase.auth.getUser>>) => {
        const loggedIn = !!result.data.user;
        const noRemember = localStorage.getItem("plu-no-remember") === "1";
        const sessionActive = sessionStorage.getItem("plu-session-active") === "1";
        if (loggedIn && noRemember && !sessionActive) {
          supabase.auth.signOut();
          setUser(null);
        } else {
          setUser(result.data.user);
        }
        setIsLoading(false);
      }
    );

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(
    async (email: string, password: string, rememberMe: boolean): Promise<string | null> => {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) {
        if (rememberMe) {
          localStorage.removeItem("plu-no-remember");
        } else {
          localStorage.setItem("plu-no-remember", "1");
        }
        sessionStorage.setItem("plu-session-active", "1");
      }
      return error ? error.message : null;
    },
    []
  );

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
