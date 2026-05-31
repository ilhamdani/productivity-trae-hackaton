import { type ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { setApiKey } from "../api/storage";
import Button from "./Button";

function Icon({ children }: { children: ReactNode }) {
  return <span className="grid h-9 w-9 place-items-center rounded-none bg-slate-50 text-slate-700">{children}</span>;
}

export default function AppShell() {
  const location = useLocation();
  const nav = useNavigate();
  const title = location.pathname.startsWith("/admin/dashboard")
    ? "Dashboard"
    : location.pathname.startsWith("/admin/billing")
      ? "Billing"
    : location.pathname.startsWith("/admin/usage")
      ? "Usage"
      : location.pathname.startsWith("/admin/teams")
        ? "Teams"
    : location.pathname.startsWith("/admin/pricing-plans")
      ? "Pricing Plans"
      : location.pathname.startsWith("/admin/users")
        ? "Admin Users"
        : "Admin";

  return (
    <div className="min-h-dvh">
      <div className="flex min-h-dvh w-full max-w-none gap-0 p-0">
        <aside className="flex w-[88px] shrink-0 flex-col items-center gap-2 border border-slate-200/70 bg-white p-3 shadow-card">
          <div className="grid h-12 w-12 place-items-center rounded-none bg-gradient-to-br from-ink-900 to-ink-800 text-white shadow-card">
            <span className="font-display text-lg leading-none">AA</span>
          </div>

          <div className="mt-1 text-center">
            <div className="text-[11px] font-semibold tracking-tight text-slate-800">Admin</div>
            <div className="text-[10px] text-slate-500">Console</div>
          </div>

          <div className="mt-2 h-px w-full bg-slate-100" />

          <nav className="flex w-full flex-1 flex-col items-center gap-2">
            <NavLink
              to="/admin/dashboard"
              className={({ isActive }) =>
                [
                  "group grid h-11 w-11 place-items-center rounded-none transition",
                  isActive ? "bg-leaf-50 text-leaf-700" : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                ].join(" ")
              }
            >
              <Icon>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 13h6v7H4z" />
                  <path d="M14 4h6v16h-6z" />
                  <path d="M4 4h6v7H4z" />
                </svg>
              </Icon>
            </NavLink>

            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                [
                  "group grid h-11 w-11 place-items-center rounded-none transition",
                  isActive ? "bg-leaf-50 text-leaf-700" : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                ].join(" ")
              }
            >
              <Icon>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z" />
                  <path d="M4 20a8 8 0 0 1 16 0" />
                </svg>
              </Icon>
            </NavLink>

            <NavLink
              to="/admin/usage"
              className={({ isActive }) =>
                [
                  "group grid h-11 w-11 place-items-center rounded-none transition",
                  isActive ? "bg-leaf-50 text-leaf-700" : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                ].join(" ")
              }
            >
              <Icon>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 19V5" />
                  <path d="M4 19h16" />
                  <path d="M7 15l3-3 3 2 4-6" />
                </svg>
              </Icon>
            </NavLink>

            <NavLink
              to="/admin/teams"
              className={({ isActive }) =>
                [
                  "group grid h-11 w-11 place-items-center rounded-none transition",
                  isActive ? "bg-leaf-50 text-leaf-700" : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                ].join(" ")
              }
            >
              <Icon>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z" />
                  <path d="M2.5 20a9.5 9.5 0 0 1 19 0" />
                </svg>
              </Icon>
            </NavLink>

            <NavLink
              to="/admin/pricing-plans"
              className={({ isActive }) =>
                [
                  "group grid h-11 w-11 place-items-center rounded-none transition",
                  isActive ? "bg-leaf-50 text-leaf-700" : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                ].join(" ")
              }
            >
              <Icon>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 2v20" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </Icon>
            </NavLink>

            <NavLink
              to="/admin/billing"
              className={({ isActive }) =>
                [
                  "group grid h-11 w-11 place-items-center rounded-none transition",
                  isActive ? "bg-leaf-50 text-leaf-700" : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                ].join(" ")
              }
            >
              <Icon>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M6 7h12" />
                  <path d="M6 11h12" />
                  <path d="M6 15h8" />
                  <path d="M5 3h14v18H5z" />
                </svg>
              </Icon>
            </NavLink>
          </nav>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-200/70 bg-white px-4 py-3 shadow-card">
            <div className="flex min-w-[220px] flex-1 items-center gap-3">
              <div className="text-sm font-semibold text-slate-900">{title}</div>
              <div className="hidden h-5 w-px bg-slate-200 sm:block" />
              <div className="hidden text-xs text-slate-500 sm:block">AI Growth Copilot Admin</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setApiKey("");
                nav("/login", { replace: true });
              }}
            >
              Logout
            </Button>
          </div>

          <div className="min-w-0 p-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
