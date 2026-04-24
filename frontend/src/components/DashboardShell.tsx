import { useEffect, useState } from "react";
import { Outlet, Link, useNavigate } from "react-router";
import { Calendar, LogOut } from "lucide-react";
import { api, clearToken } from "@/lib/api";

type Role = "EMPLOYER" | "EMPLOYEE";

export default function DashboardShell() {
  const navigate = useNavigate();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const me = await api.get<{ user: { sub: number; role: Role } }>(
          "/auth/me",
        );
        if (me.user.role === "EMPLOYEE") {
          const emp = await api.get<{ employee: { firstName: string } }>(
            "/employees/me",
          );
          setName(emp.employee.firstName);
        } else {
          setName("Admin");
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

  const initial = name ? name.charAt(0).toUpperCase() : "?";

  return (
    <div className="h-screen flex">
      <aside className="w-16 flex flex-col items-center py-4 bg-slate-900 text-slate-100">
        <div className="h-9 w-9 rounded-md bg-white/10 flex items-center justify-center font-bold">
          S
        </div>
        <nav className="flex flex-col gap-1 items-center flex-1 pt-8">
          <Link
            to="/dashboard"
            className="relative p-2.5 rounded-md bg-white/10 text-white"
            title="Schedule"
          >
            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-white rounded-r"></span>
            <Calendar className="h-5 w-5" />
          </Link>
        </nav>
        <button
          onClick={handleLogout}
          title="Log out"
          className="p-2.5 rounded-md text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-muted/30">
        <header className="h-14 border-b bg-background flex items-center justify-between px-6">
          <h1 className="text-lg font-semibold">Schedule</h1>
          {name && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Welcome, {name}
              </span>
              <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-medium">
                {initial}
              </div>
            </div>
          )}
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
