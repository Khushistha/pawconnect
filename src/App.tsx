import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Layouts
import { PublicLayout } from "@/components/layout/PublicLayout";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Public Pages
import LandingPage from "@/pages/LandingPage";
import AdoptionGallery from "@/pages/AdoptionGallery";
import DogProfilePage from "@/pages/DogProfilePage";
import ReportDogPage from "@/pages/ReportDogPage";
import AboutPage from "@/pages/AboutPage";

// Auth Pages
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";

// Dashboard Pages
import NGODashboard from "@/pages/dashboard/NGODashboard";
import VolunteerDashboard from "@/pages/dashboard/VolunteerDashboard";
import VetDashboard from "@/pages/dashboard/VetDashboard";
import AdopterDashboard from "@/pages/dashboard/AdopterDashboard";

// Components
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/adopt" element={<AdoptionGallery />} />
              <Route path="/dogs/:id" element={<DogProfilePage />} />
              <Route path="/report" element={<ReportDogPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Route>

            {/* Auth Routes (No Layout) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* NGO Admin Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ngo_admin']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<NGODashboard />} />
              <Route path="rescues" element={<NGODashboard />} />
              <Route path="dogs" element={<NGODashboard />} />
              <Route path="adoptions" element={<NGODashboard />} />
              <Route path="team" element={<NGODashboard />} />
            </Route>

            {/* Volunteer Dashboard */}
            <Route
              path="/volunteer"
              element={
                <ProtectedRoute allowedRoles={['volunteer']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<VolunteerDashboard />} />
              <Route path="map" element={<VolunteerDashboard />} />
            </Route>

            {/* Veterinarian Dashboard */}
            <Route
              path="/vet"
              element={
                <ProtectedRoute allowedRoles={['veterinarian']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<VetDashboard />} />
              <Route path="patients" element={<VetDashboard />} />
              <Route path="records" element={<VetDashboard />} />
            </Route>

            {/* Adopter Dashboard */}
            <Route
              path="/adopter"
              element={
                <ProtectedRoute allowedRoles={['adopter']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdopterDashboard />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
