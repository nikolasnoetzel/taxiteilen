import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import TermsGate from "@/components/TermsGate";
import Index from "./pages/Index.tsx";
import SearchResults from "./pages/SearchResults.tsx";
import CreateRide from "./pages/CreateRide.tsx";
import RideDetail from "./pages/RideDetail.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Admin from "./pages/Admin.tsx";
import Datenschutz from "./pages/Datenschutz.tsx";
import Impressum from "./pages/Impressum.tsx";
import AGB from "./pages/AGB.tsx";
import Auth from "./pages/Auth.tsx";
import StripeOnboarding from "./pages/StripeOnboarding.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner position="top-center" />
      <BrowserRouter>
        <AuthProvider>
          <TermsGate />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/suche" element={<SearchResults />} />
            <Route path="/search" element={<Navigate to="/suche" replace />} />
            <Route path="/fahrt-erstellen" element={<CreateRide />} />
            <Route path="/fahrt/:id" element={<RideDetail />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/datenschutz" element={<Datenschutz />} />
            <Route path="/agb" element={<AGB />} />
            <Route path="/impressum" element={<Impressum />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/stripe-onboarding" element={<StripeOnboarding />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
