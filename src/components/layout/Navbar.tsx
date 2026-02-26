import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Heart, User, LogOut, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { RescueReport } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const publicLinks = [
  { href: '/', label: 'Home' },
  { href: '/adopt', label: 'Adopt' },
  { href: '/report', label: 'Report a Dog' },
  { href: '/donate', label: 'Donate' },
  { href: '/about', label: 'About' },
];

const roleLabels: Record<string, string> = {
  ngo_admin: 'NGO Dashboard',
  volunteer: 'Volunteer Dashboard',
  veterinarian: 'Vet Dashboard',
  adopter: 'My Applications',
};

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    message: string;
    timestamp: Date;
    type: 'info' | 'success' | 'warning' | 'error';
  }>>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const { user, isAuthenticated, logout, token } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (token && (user?.role === 'ngo_admin' || user?.role === 'superadmin')) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [token, user]);

  const fetchNotifications = async () => {
    if (!token) return;
    setLoadingNotifications(true);
    try {
      const response = await fetch(`${API_URL}/reports/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const reports: RescueReport[] = data.items || [];
        const newNotifications = reports
          .filter(r => {
            const reportDate = new Date(r.reportedAt);
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return reportDate > oneDayAgo;
          })
          .slice(0, 10)
          .map((report) => ({
            id: `report-${report.id}`,
            title: report.urgency === 'critical' ? '🚨 Critical Report' : 'New Rescue Report',
            message: `${report.reportedBy} reported a dog at ${report.location.address}`,
            timestamp: new Date(report.reportedAt),
            type: report.urgency === 'critical' ? 'error' as const : 
                  report.urgency === 'high' ? 'warning' as const : 'info' as const,
          }));
        setNotifications(newNotifications);
      }
    } catch (error) {
      // Silently fail
    } finally {
      setLoadingNotifications(false);
    }
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'ngo_admin': return '/dashboard';
      case 'volunteer': return '/volunteer';
      case 'veterinarian': return '/vet';
      case 'adopter': return '/adopter';
      default: return '/';
    }
  };

  return (
    <header className="sticky top-0 z-50 glass border-b">
      <nav className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary-foreground" fill="currentColor" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            Paw<span className="text-primary">Connect</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {publicLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                location.pathname === link.href
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated && user ? (
            <>
              {(user.role === 'ngo_admin' || user.role === 'superadmin') && (
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 hover:bg-primary/10">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-9 h-9 rounded-full object-cover border-2 border-primary/30"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center transition-all hover:bg-primary/30">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <span className="font-medium hidden sm:inline">{user.name.split(' ')[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">{user.role.replace('_', ' ')}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={getDashboardLink()} className="cursor-pointer flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      {roleLabels[user.role] || 'Dashboard'}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      Profile Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild className="btn-hero-primary">
                <Link to="/register">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background animate-fade-in">
          <div className="container py-4 space-y-2">
            {publicLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'block px-4 py-3 rounded-lg font-medium transition-colors',
                  location.pathname === link.href
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t space-y-2">
              {isAuthenticated && user ? (
                <>
                  <div className="px-4 py-3 mb-2">
                    <div className="flex items-center gap-3 mb-2">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-primary/30"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        <p className="text-xs text-muted-foreground capitalize">{user.role.replace('_', ' ')}</p>
                      </div>
                    </div>
                  </div>
                  <Link
                    to={getDashboardLink()}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium hover:bg-muted"
                  >
                    <User className="w-4 h-4" />
                    {roleLabels[user.role] || 'Dashboard'}
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 rounded-lg font-medium hover:bg-muted"
                  >
                    Profile Settings
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 w-full text-left px-4 py-3 rounded-lg font-medium text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 rounded-lg font-medium hover:bg-muted"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 rounded-lg font-medium bg-primary text-primary-foreground text-center"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
