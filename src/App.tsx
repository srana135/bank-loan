import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import LoanManagement from "./pages/LoanManagement";
import LoanMap from "./pages/LoanMap";
import AdminDashboard from "./pages/AdminDashboard";
import EMICalculator from "./pages/EMICalculator";
import DPSCalculator from "./pages/DPSCalculator";
import FDRCalculator from "./pages/FDRCalculator";
import LoanEligibility from "./pages/LoanEligibility";
import CurrencyConverter from "./pages/CurrencyConverter";
import ServiceProductList from "./pages/ServiceProductList";
import ConnectUs from "./pages/ConnectUs";
import UserProfile from "./pages/UserProfile";
import Converter from "./pages/Converter";
import LegalManagement from "./pages/LegalManagement";
import ReportGenerator from "./pages/ReportGenerator";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/loan-management" element={<ProtectedRoute><LoanManagement /></ProtectedRoute>} />
              <Route path="/loan-map" element={<ProtectedRoute><LoanMap /></ProtectedRoute>} />
              <Route path="/legal" element={<ProtectedRoute><LegalManagement /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/emi-calculator" element={<EMICalculator />} />
              <Route path="/emi-calculator/dps" element={<DPSCalculator />} />
              <Route path="/emi-calculator/fdr" element={<FDRCalculator />} />
              <Route path="/emi-calculator/eligibility" element={<LoanEligibility />} />
              <Route path="/emi-calculator/currency" element={<CurrencyConverter />} />
              <Route path="/converter" element={<Converter />} />
              <Route path="/reports" element={<ProtectedRoute><ReportGenerator /></ProtectedRoute>} />
              <Route path="/services" element={<ServiceProductList />} />
              <Route path="/connect" element={<ConnectUs />} />
              <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
