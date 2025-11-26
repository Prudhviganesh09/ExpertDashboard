import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Clients from "./pages/Clients";
import AdminClients from "./pages/AdminClients";
import AgentAnalytics from "./pages/AgentAnalytics";
import ClientDetail from "./pages/ClientDetail";
import Calendar from "./pages/Calendar";
import About from "./pages/About";
import ExpertDashboard from "./pages/ExpertDashboard";
import ExpertViewDashboard from "./pages/ExpertViewDashboard";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import NotFound from "./pages/NotFound";
import ApiResponseDisplay from "./pages/ApiResponseDisplay";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route index element={<Navigate to="/signin" replace />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/api-response" element={<ApiResponseDisplay />} />
          <Route
            path="/pre-sale-dashboard"
            element={
              <ProtectedRoute>
                <ExpertDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expert-dashboard"
            element={
              <ProtectedRoute>
                <ExpertViewDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="clients" element={<Clients />} />
            <Route path="admin-clients" element={<AdminClients />} />
            <Route path="agent-analytics" element={<AgentAnalytics />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="about" element={<About />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;