import { cn } from "@/lib/utils";
import {
  AlarmClock,
  Info,
  LayoutDashboard,
  Mail,
  Plus,
  Settings,
} from "lucide-react";
import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/alarm/new", label: "Add Alarm", icon: Plus },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/about", label: "About", icon: Info },
  { to: "/contact", label: "Contact", icon: Mail },
];

const bottomNavItems = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/alarm/new", label: "Add", icon: Plus },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isFullScreen =
    location.pathname === "/alarm-trigger" ||
    location.pathname === "/verify" ||
    location.pathname === "/";

  if (isFullScreen) {
    return <>{children}</>;
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "#0a0a0f" }}
    >
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-60 flex-shrink-0 border-r"
        style={{
          backgroundColor: "#0c0c14",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        {/* Logo */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                boxShadow: "0 0 16px rgba(124, 58, 237, 0.4)",
              }}
            >
              <AlarmClock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight text-white">
                Smart Selfie
              </p>
              <p className="text-xs" style={{ color: "#7c3aed" }}>
                Alarm
              </p>
            </div>
          </div>
        </div>

        <div className="px-3 flex-1 overflow-y-auto">
          <nav className="space-y-0.5">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to}>
                {({ isActive }) => (
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group",
                      isActive
                        ? "text-white"
                        : "text-slate-400 hover:text-white hover:bg-white/5",
                    )}
                    style={
                      isActive
                        ? {
                            background:
                              "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(99,102,241,0.15))",
                            border: "1px solid rgba(124,58,237,0.2)",
                          }
                        : {}
                    }
                    data-ocid={`nav.${label.toLowerCase().replace(" ", "_")}.link`}
                  >
                    <Icon
                      className="w-4.5 h-4.5 flex-shrink-0"
                      style={{
                        color: isActive ? "#a78bfa" : undefined,
                        width: "18px",
                        height: "18px",
                      }}
                    />
                    <span className="text-sm font-medium">{label}</span>
                    {to === "/alarm/new" && (
                      <div
                        className="ml-auto w-5 h-5 rounded-md flex items-center justify-center"
                        style={{
                          background:
                            "linear-gradient(135deg, #7c3aed, #6366f1)",
                          boxShadow: "0 0 8px rgba(124,58,237,0.3)",
                        }}
                      >
                        <Plus className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer branding */}
        <div
          className="p-4 border-t"
          style={{ borderColor: "rgba(255,255,255,0.05)" }}
        >
          <p className="text-xs text-center" style={{ color: "#334155" }}>
            © {new Date().getFullYear()}{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#7c3aed" }}
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 inset-x-0 md:hidden z-40 px-4 py-2"
        style={{
          backgroundColor: "rgba(10, 10, 15, 0.95)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center justify-around">
          {bottomNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="flex-1">
              {({ isActive }) => (
                <div className="flex flex-col items-center gap-1 py-1">
                  {to === "/alarm/new" ? (
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center -mt-6"
                      style={{
                        background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                        boxShadow: "0 0 20px rgba(124, 58, 237, 0.5)",
                        border: "3px solid #0a0a0f",
                      }}
                      data-ocid="nav.add.button"
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  ) : (
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{
                        background: isActive
                          ? "rgba(124,58,237,0.2)"
                          : "transparent",
                      }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: isActive ? "#a78bfa" : "#64748b" }}
                      />
                    </div>
                  )}
                  {to !== "/alarm/new" && (
                    <span
                      className="text-xs font-medium"
                      style={{ color: isActive ? "#a78bfa" : "#64748b" }}
                    >
                      {label}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
