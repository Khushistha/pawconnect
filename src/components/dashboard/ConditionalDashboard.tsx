import { useAuth } from '@/contexts/AuthContext';
import SuperadminDashboard from '@/pages/dashboard/SuperadminDashboard';
import NGODashboard from '@/pages/dashboard/NGODashboard';

/**
 * Conditionally renders the correct dashboard based on user role
 */
export default function ConditionalDashboard() {
  const { user } = useAuth();

  if (user?.role === 'superadmin') {
    return <SuperadminDashboard />;
  }

  if (user?.role === 'ngo_admin') {
    return <NGODashboard />;
  }

  // Fallback (shouldn't reach here due to ProtectedRoute)
  return <NGODashboard />;
}
