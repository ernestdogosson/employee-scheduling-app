import { Outlet, Link, useNavigate } from "react-router";
import {
  Calendar,
  MessageSquare,
  Clock,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { clearToken } from "@/lib/api";

export default function DashboardShell() {
  const navigate = useNavigate();

  function handleLogout() {
    clearToken();
    navigate("/login");
  }

  return (
    <div className="h-screen flex">
      <aside className="w-16 border-r flex flex-col items-center py-4 bg-background">
        <div className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold">
          S
        </div>
        <nav className="flex flex-col gap-1 items-center flex-1 pt-8">
          <Link
            to="/dashboard"
            className="p-2.5 rounded-md bg-accent text-foreground"
            title="Schedule"
          >
            <Calendar className="h-5 w-5" />
          </Link>
          <div className="p-2.5 text-muted-foreground/50">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="p-2.5 text-muted-foreground/50">
            <Clock className="h-5 w-5" />
          </div>
          <div className="p-2.5 text-muted-foreground/50">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="p-2.5 text-muted-foreground/50">
            <Settings className="h-5 w-5" />
          </div>
        </nav>
        <button
          onClick={handleLogout}
          title="Log out"
          className="p-2.5 rounded-md hover:bg-accent text-muted-foreground"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b flex items-center px-6">
          <h1 className="text-lg font-semibold">Schedule</h1>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
