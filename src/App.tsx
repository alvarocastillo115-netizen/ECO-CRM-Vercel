import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Loader2 } from "lucide-react";

const Auth = lazy(() => import("@/pages/Auth"));
const KanbanPage = lazy(() => import("@/pages/KanbanPage"));
const CalendarPage = lazy(() => import("@/pages/CalendarPage"));
const ClientsPage = lazy(() => import("@/pages/ClientsPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const CommissionsPage = lazy(() => import("@/pages/CommissionsPage"));
const SalesHistoryPage = lazy(() => import("@/pages/SalesHistoryPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isAdmin, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<KanbanPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route
                  path="/clients"
                  element={
                    <ProtectedRoute>
                      <ClientsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute adminOnly>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute adminOnly>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/commissions"
                  element={
                    <ProtectedRoute adminOnly>
                      <CommissionsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sales-history"
                  element={
                    <ProtectedRoute>
                      <SalesHistoryPage />
                    </ProtectedRoute>
                  }
                />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
