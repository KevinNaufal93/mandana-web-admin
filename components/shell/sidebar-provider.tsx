"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  type SidebarState,
  sidebarCookieString,
} from "@/lib/ui/sidebar-cookie";

interface SidebarContextValue {
  state: SidebarState;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar() must be used inside <SidebarProvider>.");
  return ctx;
}

/**
 * Holds the collapse state for the whole (app) group.
 *
 * Two layers of persistence, and both are needed:
 *
 *  - Across client-side navigation, this provider simply never unmounts.
 *    It sits in app/(app)/layout.tsx, and layouts are preserved across
 *    route changes, so React state alone carries the toggle from page to
 *    page with no storage round-trip at all.
 *  - Across full loads (hard refresh, new tab, a link from outside), the
 *    cookie carries it. The layout reads it on the server and passes it in
 *    as `defaultState`, so the server-rendered markup already has the
 *    right width — no post-hydration snap.
 *
 * The cookie is written on every change rather than in an effect keyed on
 * `state`: an effect would also fire on mount and rewrite the value we
 * just read, which is harmless but makes the data flow harder to follow.
 */
export function SidebarProvider({
  defaultState,
  children,
}: {
  defaultState: SidebarState;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<SidebarState>(defaultState);

  const setCollapsed = useCallback((collapsed: boolean) => {
    const next: SidebarState = collapsed ? "collapsed" : "expanded";
    setState(next);
    document.cookie = sidebarCookieString(next, {
      secure: window.location.protocol === "https:",
    });
  }, []);

  const toggle = useCallback(
    () => setCollapsed(state === "expanded"),
    [state, setCollapsed],
  );

  // Ctrl/Cmd+B, the convention every editor-shaped app shares.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "b" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      toggle();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  const value = useMemo<SidebarContextValue>(
    () => ({ state, collapsed: state === "collapsed", setCollapsed, toggle }),
    [state, setCollapsed, toggle],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}
