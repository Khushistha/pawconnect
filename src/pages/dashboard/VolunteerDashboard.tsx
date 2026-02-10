import { useState, useEffect } from 'react';
import { MapPin, Clock, CheckCircle2, Navigation, Phone, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MockMap } from '@/components/maps/MockMap';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { RescueReport } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function VolunteerDashboard() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [assignedTasks, setAssignedTasks] = useState<RescueReport[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (token && user?.role === 'volunteer') {
      fetchMyTasks();
    }
  }, [token, user]);

  const fetchMyTasks = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/reports/my-tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data = await response.json();
      setAssignedTasks(data.items || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load your tasks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const pendingTasks = assignedTasks.filter(r => r.status === 'assigned');
  const inProgressTasks = assignedTasks.filter(r => r.status === 'in_progress');
  const completedToday = assignedTasks.filter(r => r.status === 'completed').slice(0, 2);

  const mapMarkers = assignedTasks.map(task => ({
    id: task.id,
    location: task.location,
    label: task.urgency === 'critical' ? '⚠️ Critical' : task.location.district,
    type: 'rescue' as const,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Rescue Tasks</h1>
          <p className="text-muted-foreground">
            You have {pendingTasks.length + inProgressTasks.length} active tasks
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchMyTasks}
          disabled={loading}
          title="Refresh tasks"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-status-reported">{pendingTasks.length}</div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-status-progress">{inProgressTasks.length}</div>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-status-adopted">{completedToday.length}</div>
              <p className="text-xs text-muted-foreground">Completed Today</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Map */}
      {!loading && assignedTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary" />
              Rescue Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MockMap 
              className="h-[300px]" 
              markers={assignedTasks.map(task => ({
                id: task.id,
                location: task.location,
                label: task.urgency === 'critical' ? '⚠️ Critical' : task.location.district || task.location.address,
                type: 'rescue' as const,
              }))}
            />
          </CardContent>
        </Card>
      )}

      {/* Task List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Active Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : assignedTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-status-adopted" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm">No assigned rescue tasks at the moment.</p>
            </div>
          ) : (
            [...inProgressTasks, ...pendingTasks].map((task) => (
            <div 
              key={task.id} 
              className={`p-4 rounded-xl border-2 ${
                task.urgency === 'critical' 
                  ? 'border-destructive/50 bg-destructive/5' 
                  : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <StatusBadge status={task.status} />
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    task.urgency === 'critical' ? 'bg-destructive/10 text-destructive' :
                    task.urgency === 'high' ? 'bg-status-reported/10 text-status-reported' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {task.urgency.toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(task.reportedAt).toLocaleDateString()}
                </span>
              </div>

              <p className="text-sm mb-3">{task.description}</p>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <MapPin className="w-4 h-4" />
                {task.location.address}
              </div>

              {task.photos[0] && (
                <img 
                  src={task.photos[0]} 
                  alt="Rescue" 
                  className="w-full h-32 object-cover rounded-lg mb-4"
                />
              )}

              <div className="flex flex-wrap gap-2">
                {task.status === 'assigned' && (
                  <Button size="sm" className="btn-hero-primary">
                    <Navigation className="w-4 h-4 mr-1" />
                    Start Navigation
                  </Button>
                )}
                {task.status === 'in_progress' && (
                  <>
                    <Button size="sm" variant="outline">
                      <Clock className="w-4 h-4 mr-1" />
                      Update Status
                    </Button>
                    <Button size="sm" className="bg-status-treated hover:bg-status-treated/90">
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Mark Rescued
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost">
                  <Phone className="w-4 h-4 mr-1" />
                  Call Reporter
                </Button>
              </div>
            </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
