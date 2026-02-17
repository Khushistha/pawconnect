import { useState, useEffect, ReactNode } from 'react';
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
  FileText,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  // Superadmin
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', roles: ['superadmin'] },
  { icon: Users, label: 'Volunteers', href: '/dashboard/volunteers', roles: ['superadmin'] },
  { icon: FileText, label: 'Verifications', href: '/dashboard/verifications', roles: ['superadmin'] },
  { icon: Building2, label: 'NGOs', href: '/dashboard/ngos', roles: ['superadmin'] },
  
  // NGO Admin
  { icon: LayoutDashboard, label: 'Overview', href: '/dashboard', roles: ['ngo_admin'] },
  { icon: ClipboardList, label: 'Rescue Cases', href: '/dashboard/rescues', roles: ['ngo_admin'] },
  { icon: PawPrint, label: 'Dogs', href: '/dashboard/dogs', roles: ['ngo_admin'] },
  { icon: FileText, label: 'Adoptions', href: '/dashboard/adoptions', roles: ['ngo_admin'] },
  
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

interface DashboardLayoutProps {
  children?: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    message: string;
    timestamp: Date;
    type: 'info' | 'success' | 'warning' | 'error';
  }>>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const { user, logout, isAuthenticated, token } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (token && (user?.role === 'ngo_admin' || user?.role === 'superadmin')) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [token, user]);

  const fetchNotifications = async () => {
    if (!token) return;
    setLoadingNotifications(true);
    try {
      const response = await fetch(`${API_URL}/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const newNotifications = (data.items || [])
          .slice(0, 20)
          .map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            timestamp: new Date(n.createdAt),
            type: n.type,
          }));

        setNotifications(newNotifications);
      }
    } catch (error) {
      // Silently fail
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Redirect if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

  const roleTitle: Record<UserRole, string> = {
    superadmin: 'Super Admin',
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
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-9 h-9 rounded-full object-cover border border-sidebar-border"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
                  <span className="text-sm font-semibold text-sidebar-foreground">
                    {user.name.charAt(0)}
                  </span>
                </div>
              )}
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
            {(user?.role === 'ngo_admin' || user?.role === 'superadmin') && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    {notifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                        {notifications.length > 9 ? '9+' : notifications.length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="p-4 border-b">
                    <h4 className="font-semibold text-sm">Notifications</h4>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {loadingNotifications ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        Loading...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        No new notifications
                      </div>
                    ) : (
                      <div className="divide-y">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                                notification.type === 'error' && 'bg-destructive',
                                notification.type === 'warning' && 'bg-yellow-500',
                                notification.type === 'success' && 'bg-green-500',
                                notification.type === 'info' && 'bg-blue-500'
                              )} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{notification.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {notification.timestamp.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setNotifications([])}
                      >
                        Clear all
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            )}
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto bg-background">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
