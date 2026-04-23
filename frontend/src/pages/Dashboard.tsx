import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api, clearToken, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import EmployerView from "@/components/EmployerView";
import EmployeeView from "@/components/EmployeeView";

type MeResponse = {
  user: {
    sub: number;
    role: "EMPLOYER" | "EMPLOYEE";
  };
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<MeResponse>("/auth/me")
      .then((data) => setMe(data.user))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        setError(err instanceof Error ? err.message : "Something went wrong");
      });
  }, [navigate]);

  function handleLogout() {
    clearToken();
    navigate("/login");
  }

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>
            Log out
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {!me && !error && (
          <p className="text-sm text-muted-foreground">Loading...</p>
        )}

        {me?.role === "EMPLOYER" && <EmployerView />}

        {me?.role === "EMPLOYEE" && <EmployeeView />}
      </div>
    </main>
  );
}
