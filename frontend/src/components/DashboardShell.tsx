import { useEffect, useState } from "react";
import { Outlet, Link, useNavigate } from "react-router";
import {
  Calendar,
  MessageSquare,
  Clock,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { api, clearToken } from "@/lib/api";

export default function DashboardShell() {
  const navigate = useNavigate();
  const [welcome, setWelcome] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const me = await api.get<{ user: { sub: number; role: string } }>(
          "/auth/me",
        );
        if (me.user.role === "EMPLOYEE") {
          const emp = await api.get<{ employee: { firstName: string } }>(
            "/employees/me",
          );
          setWelcome(emp.employee.firstName);
        }
      } catch {
        // header just won't show welcome
      }
    }
    loadUser();
  }, []);

  function handleLogout() {
    clearToken();
    navigate("/login");
  }

  return (
    <div className="h-screen flex">
      <aside className="w-16 flex flex-col items-center py-4 bg-slate-900 text-slate-100">
        <div className="h-9 w-9 rounded-md bg-white/10 flex items-center justify-center font-bold">
          S
        </div>
        <nav className="flex flex-col gap-1 items-center flex-1 pt-8">
          <Link
            to="/dashboard"
            className="p-2.5 rounded-md bg-white/10 text-white"
            title="Schedule"
          >
            <Calendar className="h-5 w-5" />
          </Link>
          <div className="p-2.5 text-slate-500">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="p-2.5 text-slate-500">
            <Clock className="h-5 w-5" />
          </div>
          <div className="p-2.5 text-slate-500">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="p-2.5 text-slate-500">
            <Settings className="h-5 w-5" />
          </div>
        </nav>
        <button
          onClick={handleLogout}
          title="Log out"
          className="p-2.5 rounded-md text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b flex items-center justify-between px-6">
          <h1 className="text-lg font-semibold">Schedule</h1>
          {welcome && (
            <span className="text-sm text-muted-foreground">
              Welcome, {welcome}
            </span>
          )}
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
