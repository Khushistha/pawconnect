import { 
  PawPrint, 
  ClipboardList, 
  FileCheck, 
  Users, 
  TrendingUp,
  AlertCircle 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { mockDogs, mockRescueReports, mockAdoptionApplications, mockStats } from '@/data/mockData';
import { Link } from 'react-router-dom';

export default function NGODashboard() {
  const stats = [
    { 
      label: 'Total Rescues', 
      value: mockStats.totalRescues, 
      icon: PawPrint, 
      change: '+12 this month',
      color: 'text-primary' 
    },
    { 
      label: 'Pending Rescues', 
      value: mockStats.pendingRescues, 
      icon: ClipboardList, 
      change: '3 critical',
      color: 'text-status-reported' 
    },
    { 
      label: 'Adoptable Dogs', 
      value: mockStats.adoptableDogs, 
      icon: FileCheck, 
      change: '+5 this week',
      color: 'text-status-adoptable' 
    },
    { 
      label: 'Active Volunteers', 
      value: mockStats.activeVolunteers, 
      icon: Users, 
      change: '+8 new',
      color: 'text-accent' 
    },
  ];

  const recentRescues = mockRescueReports.slice(0, 4);
  const recentApplications = mockAdoptionApplications.slice(0, 3);
  const recentDogs = mockDogs.filter(d => d.status !== 'adopted').slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
      </div>

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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Rescue Reports */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Recent Rescue Reports</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard/rescues">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentRescues.map((report) => (
              <div 
                key={report.id} 
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  report.urgency === 'critical' ? 'bg-destructive/10 text-destructive' :
                  report.urgency === 'high' ? 'bg-status-reported/10 text-status-reported' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {report.urgency === 'critical' && <AlertCircle className="w-5 h-5" />}
                  {report.urgency !== 'critical' && <PawPrint className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{report.location.address}</p>
                  <p className="text-xs text-muted-foreground truncate">{report.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={report.status} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(report.reportedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Adoption Applications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Adoption Applications</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard/adoptions">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentApplications.map((app) => {
              const dog = mockDogs.find(d => d.id === app.dogId);
              return (
                <div 
                  key={app.id} 
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <img 
                    src={dog?.photos[0] || '/placeholder.svg'} 
                    alt={dog?.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{app.applicantName}</p>
                    <p className="text-xs text-muted-foreground">
                      Applied for <span className="font-medium">{dog?.name}</span>
                    </p>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Dogs Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Dogs in Care</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard/dogs">Manage All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentDogs.map((dog) => (
              <div key={dog.id} className="group relative rounded-xl overflow-hidden">
                <div className="aspect-[4/3]">
                  <img 
                    src={dog.photos[0] || '/placeholder.svg'} 
                    alt={dog.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-white">{dog.name}</h4>
                      <p className="text-xs text-white/70">{dog.location.district}</p>
                    </div>
                    <StatusBadge status={dog.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
