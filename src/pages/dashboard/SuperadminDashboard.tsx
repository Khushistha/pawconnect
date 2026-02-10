import { useState, useEffect } from 'react';
import { 
  Users, 
  PawPrint, 
  ClipboardList, 
  TrendingUp,
  Shield,
  FileCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function SuperadminDashboard() {
  const { token } = useAuth();
  const [pendingVerifications, setPendingVerifications] = useState(0);

  useEffect(() => {
    if (token) {
      fetchPendingCount();
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

  const stats = [
    { 
      label: 'Total Volunteers', 
      value: 156, 
      icon: Users, 
      change: '+8 new',
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
      label: 'Total Rescues', 
      value: 1247, 
      icon: PawPrint, 
      change: '+12 this month',
      color: 'text-status-treated',
      href: '/dashboard'
    },
    { 
      label: 'Active NGOs', 
      value: 12, 
      icon: Shield, 
      change: '+2 new',
      color: 'text-accent',
      href: '/dashboard'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage volunteers and oversee platform operations.</p>
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
