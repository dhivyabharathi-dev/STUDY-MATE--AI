import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { BookOpen, Brain, CalendarDays, LineChart, LogOut, MessageCircleHeart } from "lucide-react";

import { Button } from "@/components/ui-kit";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app")({
  component: AppShell,
});

const nav = [
  { to: "/chat", label: "Tutor", icon: MessageCircleHeart },
  { to: "/notes", label: "Notes", icon: BookOpen },
  { to: "/quiz", label: "Quiz", icon: Brain },
  { to: "/planner", label: "Planner", icon: CalendarDays },
  { to: "/progress", label: "Progress", icon: LineChart },
] as const;

function AppShell() {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft-gradient text-sm text-muted-foreground">
        Loading your study space...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soft-gradient pb-20 md:pb-0">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/chat" className="font-display text-lg font-bold">
            AI <span className="text-primary">StudyMate</span>
          </Link>

          <nav className="hidden gap-1 md:flex">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                  pathname === item.to ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {profile?.full_name ?? "Student"} · Class {profile?.class_level ?? "-"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-background/95 backdrop-blur md:hidden">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${
              pathname === item.to ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
