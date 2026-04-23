import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api, clearToken, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <main className="min-h-screen flex items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {me ? (
            <div className="text-sm space-y-1">
              <p>User id: {me.sub}</p>
              <p>Role: {me.role}</p>
            </div>
          ) : (
            !error && <p className="text-sm text-muted-foreground">Loading...</p>
          )}
          <Button variant="outline" onClick={handleLogout} className="w-full">
            Log out
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
