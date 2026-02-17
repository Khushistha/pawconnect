import { useState, useEffect } from 'react';
import { 
  PawPrint, 
  ClipboardList, 
  FileCheck, 
  Users, 
  TrendingUp,
  AlertCircle,
  RefreshCw,
  MapPin,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Spinner, ButtonSpinner } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { NotificationList, type Notification } from '@/components/ui/notifications';
import type { RescueReport, RescueStatus } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function NGODashboard() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<RescueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (token) {
      fetchReports();
    }
  }, [token]);

  const fetchReports = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/reports/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const data = await response.json();
      const newReports = data.items || [];
      
      // Check for new reports
      if (reports.length > 0 && newReports.length > reports.length) {
        const newCount = newReports.length - reports.length;
        setNotifications(prev => [
          {
            id: `new-report-${Date.now()}`,
            title: 'New Report Received',
            message: `${newCount} new rescue report${newCount > 1 ? 's' : ''} has been submitted.`,
            type: 'info',
            timestamp: new Date(),
          },
          ...prev,
        ]);
      }
      
      setReports(newReports);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load reports',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (reportId: string, newStatus: RescueStatus) => {
    if (!token) return;

    setUpdatingStatus(reportId);
    try {
      const response = await fetch(`${API_URL}/reports/${reportId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update status');
      }

      // Update local state
      setReports(prev => prev.map(r => 
        r.id === reportId ? { ...r, status: newStatus } : r
      ));

      // Add notification
      setNotifications(prev => [
        {
          id: `status-update-${Date.now()}`,
          title: 'Status Updated',
          message: `Report status changed to ${newStatus.replace('_', ' ')}.`,
          type: 'success',
          timestamp: new Date(),
        },
        ...prev,
      ]);

      toast({
        title: 'Success',
        description: 'Report status updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const pendingReports = reports.filter(r => r.status === 'pending');
  const inProgressReports = reports.filter(r => r.status === 'in_progress');
  const completedReports = reports.filter(r => r.status === 'completed');
  const criticalReports = reports.filter(r => r.urgency === 'critical' && r.status !== 'completed');

  const stats = [
    { 
      label: 'Total Reports', 
      value: reports.length, 
      icon: ClipboardList, 
      change: `${reports.length} total`,
      color: 'text-primary' 
    },
    { 
      label: 'Pending Reports', 
      value: pendingReports.length, 
      icon: AlertCircle, 
      change: `${criticalReports.length} critical`,
      color: 'text-status-reported' 
    },
    { 
      label: 'In Progress', 
      value: inProgressReports.length, 
      icon: Clock, 
      change: 'Active rescues',
      color: 'text-status-progress' 
    },
    { 
      label: 'Completed', 
      value: completedReports.length, 
      icon: CheckCircle2, 
      change: 'Resolved',
      color: 'text-status-adopted' 
    },
  ];

  const recentReports = reports.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
        </div>
        <Button
          variant="outline"
          onClick={fetchReports}
          disabled={loading}
          title="Refresh reports"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <NotificationList
          notifications={notifications}
          onDismiss={(id) => setNotifications(prev => prev.filter(n => n.id !== id))}
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
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

      {/* Recent Rescue Reports */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Recent Rescue Reports</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <a href="/dashboard/rescues">View All</a>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : recentReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <PawPrint className="w-12 h-12 mx-auto mb-3" />
              <p className="font-medium">No reports yet</p>
              <p className="text-sm">Reports will appear here when they are submitted.</p>
            </div>
          ) : (
            recentReports.map((report) => (
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
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {report.location.district || 'Unknown'}
                    </span>
                    <span>Reported: {new Date(report.reportedAt).toLocaleDateString()}</span>
                    {report.contactPhone && (
                      <span>📞 {report.contactPhone}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Select
                      value={report.status}
                      onValueChange={(value) => updateReportStatus(report.id, value as RescueStatus)}
                      disabled={updatingStatus === report.id}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        {updatingStatus === report.id ? (
                          <ButtonSpinner />
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
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
    </div>
  );
}
