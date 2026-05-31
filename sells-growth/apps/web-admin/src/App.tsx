import { useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { apiFetch } from "./api/client";
import { getApiKey, setApiKey } from "./api/storage";
import AppShell from "./components/AppShell";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminUserDetailPage from "./pages/AdminUserDetailPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import BillingPage from "./pages/BillingPage";
import LoginPage from "./pages/LoginPage";
import PricingPlansPage from "./pages/PricingPlansPage";
import TeamDetailPage from "./pages/TeamDetailPage";
import TeamsPage from "./pages/TeamsPage";
import UsagePage from "./pages/UsagePage";

function RequireAuth() {
  const location = useLocation();
  const key = getApiKey();
  if (!key) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <Outlet />;
}

function RequireSuperAdmin() {
  const [status, setStatus] = useState<"checking" | "ok" | "forbidden">("checking");
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    apiFetch("/api/v1/admin/ping")
      .then(() => {
        if (mounted) setStatus("ok");
      })
      .catch(() => {
        if (!mounted) return;
        setApiKey("");
        setStatus("forbidden");
      });
    return () => {
      mounted = false;
    };
  }, [location.pathname]);

  if (status === "checking") {
    return (
      <div className="min-h-dvh p-4">
        <div className="border border-slate-200/70 bg-white p-4 text-sm text-slate-700 shadow-card">Checking admin access…</div>
      </div>
    );
  }

  if (status === "forbidden") {
    return <Navigate to="/login" replace />;
  }

  return <AppShell />;
}

export default function App() {
  return (
    <>
      <div className="noise" />
      <Routes>
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<RequireSuperAdmin />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} />
            <Route path="/admin/usage" element={<UsagePage />} />
            <Route path="/admin/teams" element={<TeamsPage />} />
            <Route path="/admin/teams/:teamId" element={<TeamDetailPage />} />
            <Route path="/admin/pricing-plans" element={<PricingPlansPage />} />
            <Route path="/admin/billing" element={<BillingPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </>
  );
}
