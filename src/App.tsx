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
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";

// Dashboard Pages
import SuperadminDashboard from "@/pages/dashboard/SuperadminDashboard";
import NGODashboard from "@/pages/dashboard/NGODashboard";
import VolunteerDashboard from "@/pages/dashboard/VolunteerDashboard";
import VetDashboard from "@/pages/dashboard/VetDashboard";
import AdopterDashboard from "@/pages/dashboard/AdopterDashboard";
import VolunteersManagement from "@/pages/dashboard/VolunteersManagement";
import VerificationManagement from "@/pages/dashboard/VerificationManagement";
import RescueCasesManagement from "@/pages/dashboard/RescueCasesManagement";
import DogsManagement from "@/pages/dashboard/DogsManagement";
import NGOManagement from "@/pages/dashboard/NGOManagement";
import ConditionalDashboard from "@/components/dashboard/ConditionalDashboard";
import AdoptionsManagement from "@/pages/dashboard/AdoptionsManagement";
import ProfilePage from "@/pages/ProfilePage";

// Components
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthRedirect } from "@/components/auth/AuthRedirect";
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
              <Route element={<AuthRedirect />}>
                <Route path="/" element={<LandingPage />} />
              </Route>
              <Route path="/adopt" element={<AdoptionGallery />} />
              <Route path="/dogs/:id" element={<DogProfilePage />} />
              <Route path="/report" element={<ReportDogPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Route>

            {/* Auth Routes (No Layout) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Superadmin & NGO Admin Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'ngo_admin']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ConditionalDashboard />} />
              {/* Superadmin only routes */}
              <Route 
                path="volunteers" 
                element={
                  <ProtectedRoute allowedRoles={['superadmin']}>
                    <VolunteersManagement />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="verifications" 
                element={
                  <ProtectedRoute allowedRoles={['superadmin']}>
                    <VerificationManagement />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="ngos" 
                element={
                  <ProtectedRoute allowedRoles={['superadmin']}>
                    <NGOManagement />
                  </ProtectedRoute>
                } 
              />
              {/* Shared routes */}
              <Route path="rescues" element={<RescueCasesManagement />} />
              <Route path="dogs" element={<DogsManagement />} />
              <Route path="adoptions" element={<AdoptionsManagement />} />
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

            {/* Profile Page - Accessible to all authenticated users */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'ngo_admin', 'volunteer', 'veterinarian', 'adopter']}>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
