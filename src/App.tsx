import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useFinanceStore } from "@/store/financeStore";
import Dashboard from "@/pages/Dashboard";
import PlanoContasPage from "@/pages/PlanoContasPage";
import DeParaPage from "@/pages/DeParaPage";
import UploadBalancetePage from "@/pages/UploadBalancetePage";
import BalancoPage from "@/pages/BalancoPage";
import DREPage from "@/pages/DREPage";
import FaturamentoPage from "@/pages/FaturamentoPage";
import UploadCustosPage from "@/pages/UploadCustosPage";
import AnaliseCustosPage from "@/pages/AnaliseCustosPage";
import UploadClassificacaoPage from "@/pages/UploadClassificacaoPage";
import LoginPage from "@/pages/LoginPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const AppRoutes = () => {
  const fetchAll = useFinanceStore((s) => s.fetchAll);
  const loading = useFinanceStore((s) => s.loading);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Carregando dados...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/balanco" element={<BalancoPage />} />
        <Route path="/dre" element={<DREPage />} />
        <Route path="/faturamento" element={<FaturamentoPage />} />
        <Route path="/analise-custos" element={<AnaliseCustosPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/plano-contas" element={<AdminRoute><PlanoContasPage /></AdminRoute>} />
        <Route path="/de-para" element={<AdminRoute><DeParaPage /></AdminRoute>} />
        <Route path="/upload-balancete" element={<AdminRoute><UploadBalancetePage /></AdminRoute>} />
        <Route path="/upload-custos" element={<AdminRoute><UploadCustosPage /></AdminRoute>} />
        <Route path="/upload-classificacao" element={<AdminRoute><UploadClassificacaoPage /></AdminRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
