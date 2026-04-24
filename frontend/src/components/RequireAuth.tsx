import { Navigate, Outlet } from "react-router";
import { getToken } from "@/lib/api";

export default function RequireAuth() {
  const token = getToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
