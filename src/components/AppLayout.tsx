import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  KanbanSquare,
  Settings,
  LogOut,
  Leaf,
  ChevronLeft,
  ChevronRight,
  User,
  CalendarDays,
  Contact,
  DollarSign,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { path: "/", label: "Servicios", icon: KanbanSquare, adminOnly: false },
  { path: "/calendar", label: "Calendario", icon: CalendarDays, adminOnly: false },
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: true },
  { path: "/sales-history", label: "Historial de Ventas", icon: History, adminOnly: false },
  { path: "/commissions", label: "Comisiones", icon: DollarSign, adminOnly: true },
  { path: "/clients", label: "Clientes", icon: Contact, adminOnly: false },
  { path: "/settings", label: "Configuración", icon: Settings, adminOnly: true },
];

export function AppLayout() {
  const { profile, role, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col bg-secondary transition-all duration-200 flex-shrink-0",
          collapsed ? "w-16" : "w-56"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border min-h-[73px]">
          <Link to="/" className="flex items-center gap-3 overflow-hidden">
            <img 
              src="https://ecosolutionssv.com/wp-content/uploads/2025/03/logo-de-eco-solutions-tranparente-letras-blancas-300x300.png" 
              alt="logo-de-eco-solutions-tranparente-letras-blancas" 
              className={cn("h-8 object-contain transition-all duration-200", collapsed ? "w-8" : "w-8")} 
            />
            {!collapsed && (
              <span className="text-sm font-bold text-secondary-foreground truncate">
                EcoSolutions
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-1">
          {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="px-2 py-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-2 rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* User info + logout */}
        <div className="border-t border-sidebar-border px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sidebar-accent flex-shrink-0">
              <User className="h-4 w-4 text-sidebar-accent-foreground" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-secondary-foreground truncate">
                  {profile?.full_name || "Usuario"}
                </p>
                <p className="text-2xs text-sidebar-foreground/50 truncate capitalize">
                  {role || "sin rol"}
                </p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="h-8 w-8 text-sidebar-foreground/50 hover:text-sidebar-foreground flex-shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
