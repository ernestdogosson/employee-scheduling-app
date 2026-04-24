import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api, ApiError } from "@/lib/api";
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!me && !error && (
        <p className="text-sm text-muted-foreground">Loading...</p>
      )}
      {me?.role === "EMPLOYER" && <EmployerView />}
      {me?.role === "EMPLOYEE" && <EmployeeView />}
    </div>
  );
}
