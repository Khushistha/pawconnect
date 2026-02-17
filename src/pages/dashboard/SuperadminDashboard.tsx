import { useState, useEffect } from 'react';
import { 
  Users, 
  PawPrint, 
  ClipboardList, 
  TrendingUp,
  Shield,
  FileCheck,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { RescueReport } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function SuperadminDashboard() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [totalVolunteers, setTotalVolunteers] = useState(0);
  const [reports, setReports] = useState<RescueReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  useEffect(() => {
    if (token) {
      fetchPendingCount();
      fetchVolunteerCount();
      fetchReports();
    }
  }, [token]);

  const fetchPendingCount = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/verifications/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setPendingVerifications(data.users?.length || 0);
      }
    } catch {
      // Ignore errors
    }
  };

  const fetchVolunteerCount = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/volunteers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTotalVolunteers(data.volunteers?.length || 0);
      } else {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch volunteers' }));
        // eslint-disable-next-line no-console
        console.error('Failed to fetch volunteers:', error);
        toast({
          title: 'Warning',
          description: 'Could not load volunteer count',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error fetching volunteers:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch volunteer count',
        variant: 'destructive',
      });
    }
  };

  const fetchReports = async () => {
    if (!token) return;

    try {
      setLoadingReports(true);
      const response = await fetch(`${API_URL}/reports/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const data = await response.json();
      setReports(data.items || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load reports',
        variant: 'destructive',
      });
    } finally {
      setLoadingReports(false);
    }
  };

  const pendingReports = reports.filter(r => r.status === 'pending');
  const criticalReports = reports.filter(r => r.urgency === 'critical' && r.status !== 'completed');

  const stats = [
    { 
      label: 'Total Volunteers', 
      value: totalVolunteers, 
      icon: Users, 
      change: 'Active volunteers',
      color: 'text-primary',
      href: '/dashboard/volunteers'
    },
    { 
      label: 'Pending Verifications', 
      value: pendingVerifications, 
      icon: FileCheck, 
      change: 'Needs review',
      color: 'text-status-reported',
      href: '/dashboard/verifications'
    },
    { 
      label: 'Total Reports', 
      value: reports.length, 
      icon: ClipboardList, 
      change: `${pendingReports.length} pending`,
      color: 'text-status-treated',
      href: '/dashboard'
    },
    { 
      label: 'Critical Reports', 
      value: criticalReports.length, 
      icon: AlertCircle, 
      change: 'Urgent attention',
      color: 'text-destructive',
      href: '/dashboard'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage volunteers and oversee platform operations.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            fetchPendingCount();
            fetchVolunteerCount();
            fetchReports();
          }}
          disabled={loadingReports}
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loadingReports ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold mb-1">{stat.value.toLocaleString()}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="w-3 h-3 text-status-treated" />
                {stat.change}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Recent Rescue Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingReports ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <PawPrint className="w-12 h-12 mx-auto mb-3" />
              <p className="font-medium">No reports yet</p>
              <p className="text-sm">Reports will appear here when they are submitted.</p>
            </div>
          ) : (
            reports.slice(0, 5).map((report) => (
              <div 
                key={report.id} 
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  report.urgency === 'critical' ? 'bg-destructive/10 text-destructive' :
                  report.urgency === 'high' ? 'bg-status-reported/10 text-status-reported' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {report.urgency === 'critical' && <AlertCircle className="w-5 h-5" />}
                  {report.urgency !== 'critical' && <PawPrint className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={report.status} />
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      report.urgency === 'critical' ? 'bg-destructive/10 text-destructive' :
                      report.urgency === 'high' ? 'bg-status-reported/10 text-status-reported' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {report.urgency.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm font-medium truncate">{report.location.address}</p>
                  <p className="text-xs text-muted-foreground truncate mb-2">{report.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Reported by: {report.reportedBy}</span>
                    <span>{new Date(report.reportedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {report.photos[0] && (
                  <img 
                    src={report.photos[0]} 
                    alt="Report" 
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Volunteer Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Manage volunteers, create new accounts, and update volunteer information.
            </p>
            <Button asChild className="w-full">
              <Link to="/dashboard/volunteers">Manage Volunteers</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verification Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Review and approve pending veterinarian and NGO admin registrations.
            </p>
            <Button asChild className="w-full">
              <Link to="/dashboard/verifications">
                {pendingVerifications > 0 
                  ? `Review ${pendingVerifications} Pending`
                  : 'View Verifications'}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
