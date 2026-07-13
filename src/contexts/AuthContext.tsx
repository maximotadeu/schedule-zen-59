import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AuthUser {
  id: string;
  email: string;
  user_metadata: Record<string, unknown>;
}

interface AuthState {
  user: AuthUser | null;
  isPro: boolean;
  isDevMode: boolean;
  avatarUrl: string | null;
  displayName: string;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

function isDevModeActive(): boolean {
  return import.meta.env.DEV && localStorage.getItem("dev_mode") === "true";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const devMode = isDevModeActive();
    setIsDevMode(devMode);

    if (devMode) {
      setUser({ id: "dev-user", email: "dev@local.com", user_metadata: {} });
      setIsPro(localStorage.getItem("dev_is_pro") === "true");
      setAvatarUrl(localStorage.getItem("dev_avatar"));
      setDisplayName(localStorage.getItem("dev_display_name") || "");
      setLoading(false);
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        setUser({
          id: userData.user.id,
          email: userData.user.email ?? "",
          user_metadata: (userData.user.user_metadata as Record<string, unknown>) ?? {},
        });
        setIsPro(!!userData.user.user_metadata?.is_pro);
        setAvatarUrl((userData.user.user_metadata?.avatar_url as string | null) || null);
        setDisplayName((userData.user.user_metadata?.display_name as string) || "");
      } else {
        setUser(null);
        setIsPro(false);
        setAvatarUrl(null);
        setDisplayName("");
      }
    } catch (e) {
      console.error("Auth refresh error:", e);
      setUser(null);
      setIsPro(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider
      value={{ user, isPro, isDevMode, avatarUrl, displayName, loading, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
