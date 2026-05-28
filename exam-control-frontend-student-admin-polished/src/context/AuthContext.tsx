import { createContext, useContext, useMemo, useState } from "react";

type Role = "admin" | "student" | null;

interface AuthContextValue {
  role: Role;
  setRole: (role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => {
    if (localStorage.getItem("adminToken")) return "admin";
    if (localStorage.getItem("studentToken")) return "student";
    return null;
  });

  const value = useMemo<AuthContextValue>(() => ({
    role,
    setRole: setRoleState,
    logout: () => {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("studentToken");
      localStorage.removeItem("currentSessionId");
      setRoleState(null);
    }
  }), [role]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
