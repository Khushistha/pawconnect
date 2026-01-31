import { useState } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  Heart, 
  LayoutDashboard, 
  PawPrint, 
  ClipboardList, 
  Users, 
  Settings,
  Menu,
  X,
  LogOut,
  Bell,
  Stethoscope,
  MapPin,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  // NGO Admin
  { icon: LayoutDashboard, label: 'Overview', href: '/dashboard', roles: ['ngo_admin'] },
  { icon: ClipboardList, label: 'Rescue Cases', href: '/dashboard/rescues', roles: ['ngo_admin'] },
  { icon: PawPrint, label: 'Dogs', href: '/dashboard/dogs', roles: ['ngo_admin'] },
  { icon: FileText, label: 'Adoptions', href: '/dashboard/adoptions', roles: ['ngo_admin'] },
  { icon: Users, label: 'Team', href: '/dashboard/team', roles: ['ngo_admin'] },
  
  // Volunteer
  { icon: LayoutDashboard, label: 'My Tasks', href: '/volunteer', roles: ['volunteer'] },
  { icon: MapPin, label: 'Rescue Map', href: '/volunteer/map', roles: ['volunteer'] },
  
  // Veterinarian
  { icon: LayoutDashboard, label: 'Overview', href: '/vet', roles: ['veterinarian'] },
  { icon: PawPrint, label: 'Patients', href: '/vet/patients', roles: ['veterinarian'] },
  { icon: Stethoscope, label: 'Medical Records', href: '/vet/records', roles: ['veterinarian'] },
  
  // Adopter
  { icon: LayoutDashboard, label: 'My Applications', href: '/adopter', roles: ['adopter'] },
  { icon: PawPrint, label: 'Browse Dogs', href: '/adopt', roles: ['adopter'] },
];

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();

  // Redirect if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

  const roleTitle: Record<UserRole, string> = {
    ngo_admin: 'NGO Admin',
    volunteer: 'Volunteer',
    veterinarian: 'Veterinarian',
    adopter: 'Adopter',
    public: 'User',
  };

  return (
    <div className="min-h-screen flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-200 lg:transform-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sidebar-primary to-primary flex items-center justify-center">
                <Heart className="w-4 h-4 text-sidebar-primary-foreground" fill="currentColor" />
              </div>
              <span className="font-display text-lg font-bold text-sidebar-foreground">
                Paw<span className="text-sidebar-primary">Connect</span>
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-sidebar-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-3 border-t border-sidebar-border">
            <Link
              to="/profile"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent/50 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
                <span className="text-sm font-semibold text-sidebar-foreground">
                  {user.name.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user.name}
                </p>
                <p className="text-xs text-sidebar-foreground/60">
                  {roleTitle[user.role]}
                </p>
              </div>
              <Settings className="w-4 h-4 text-sidebar-foreground/60" />
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-card border-b flex items-center justify-between px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-secondary text-secondary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                2
              </span>
            </Button>
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
