import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Wrapper that redirects authenticated users to their dashboard.
 * Unauthenticated users can access child routes (landing page, etc).
 */
export function AuthRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    // Redirect to appropriate dashboard based on role
    // Volunteers and adopters can access landing page, others go to dashboard
    switch (user.role) {
      case 'superadmin':
      case 'ngo_admin':
        return <Navigate to="/dashboard" replace />;
      case 'veterinarian':
        return <Navigate to="/vet" replace />;
      case 'volunteer':
      case 'adopter':
        // Volunteers and adopters can see landing page, dashboard accessible via profile menu
        break;
      default:
        // Public users can see landing page
        break;
    }
  }

  // Unauthenticated or public users see child routes
  return <Outlet />;
}
