"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { translate, type Language } from "@/lib/i18n";
import type { User } from "@/lib/types";

type Context = { lang: Language; setLang: (lang: Language) => void; t: (key: string) => string; user: User | null; setUser: (user: User | null) => void; authLoading: boolean; authError: string | null; reloadAuth: () => void };
const PortalContext = createContext<Context | null>(null);
export function Providers({ children }: { children: ReactNode }) {
  const [lang, updateLang] = useState<Language>("en");
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => { const stored = localStorage.getItem("sih-language"); if (stored === "hi") updateLang("hi"); }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  // Keeps the portal openable on a dropped connection; it caches build assets only, never portal records.
  useEffect(() => { if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {}); }, []);
  useEffect(() => {
    let active = true;
    setAuthLoading(true); setAuthError(null);
    api<User | null>("/auth/me").then(value => { if (active) setUser(value); }).catch(error => { if (active) setAuthError(error.code || "network_error"); }).finally(() => { if (active) setAuthLoading(false); });
    return () => { active = false; };
  }, [version]);
  function setLang(value: Language) { updateLang(value); localStorage.setItem("sih-language", value); }
  return <PortalContext.Provider value={{ lang, setLang, t: key => translate(key, lang), user, setUser, authLoading, authError, reloadAuth: () => setVersion(v => v + 1) }}>{children}</PortalContext.Provider>;
}
export function usePortal() { const context = useContext(PortalContext); if (!context) throw new Error("Missing portal provider"); return context; }
