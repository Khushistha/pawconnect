import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, PawPrint, Clock, CheckCircle2, XCircle, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { AdoptionApplication, Dog } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function AdopterDashboard() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [apps, setApps] = useState<AdoptionApplication[]>([]);
  const [dogsById, setDogsById] = useState<Record<string, Dog>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyApps = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/adoptions/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.message || 'Failed to fetch applications');
        }
        const data = await res.json();
        const items: AdoptionApplication[] = data.items || [];
        setApps(items);

        // Fetch dog details for UI (best-effort)
        const dogIds = Array.from(new Set(items.map((a) => a.dogId)));
        const results = await Promise.all(
          dogIds.map(async (dogId) => {
            const r = await fetch(`${API_URL}/dogs/${dogId}`);
            if (!r.ok) return null;
            const d = await r.json();
            return d.item as Dog;
          })
        );
        const map: Record<string, Dog> = {};
        results.filter(Boolean).forEach((d) => {
          map[(d as Dog).id] = d as Dog;
        });
        setDogsById(map);
      } catch (e: any) {
        toast({
          title: 'Error',
          description: e.message || 'Failed to load applications',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMyApps();
  }, [token, toast]);

  const myApplications = useMemo(() => apps, [apps]);

  const statusIcons = {
    pending: Clock,
    under_review: FileText,
    approved: CheckCircle2,
    rejected: XCircle,
  };

  const approvedApplications = myApplications.filter(a => a.status === 'approved');
  const pendingApplications = myApplications.filter(a => a.status === 'pending' || a.status === 'under_review');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Adoption Journey</h1>
        <p className="text-muted-foreground">Track your adoption applications and find your perfect companion</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="w-6 h-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{myApplications.length}</div>
            <p className="text-xs text-muted-foreground">Total Applications</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-status-progress" />
            <div className="text-2xl font-bold">{pendingApplications.length}</div>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Heart className="w-6 h-6 mx-auto mb-2 text-status-adopted fill-current" />
            <div className="text-2xl font-bold">{approvedApplications.length}</div>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
      </div>

      {/* Approved Adoptions */}
      {approvedApplications.length > 0 && (
        <Card className="border-status-adopted/30 bg-status-adopted/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-status-adopted">
              <Heart className="w-5 h-5 fill-current" />
              Congratulations! Your Adoption is Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            {approvedApplications.map((app) => {
              const dog = dogsById[app.dogId];
              return (
                <div key={app.id} className="flex items-center gap-4 p-4 bg-card rounded-xl">
                  <img 
                    src={dog?.photos[0] || '/placeholder.svg'} 
                    alt={dog?.name}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{dog?.name}</h3>
                    <p className="text-sm text-muted-foreground">{dog?.breed || 'Mixed Breed'}</p>
                    <p className="text-xs text-status-adopted mt-1">
                      Approved on {new Date(app.reviewedAt!).toLocaleDateString()}
                    </p>
                  </div>
                  <Button className="btn-hero-primary">
                    Schedule Pickup
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Applications List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">My Applications</CardTitle>
          <Button asChild>
            <Link to="/adopt">
              <PawPrint className="w-4 h-4 mr-2" />
              Browse Dogs
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : myApplications.length > 0 ? (
            <div className="space-y-4">
              {myApplications.map((app) => {
                const dog = dogsById[app.dogId];
                const StatusIcon = statusIcons[app.status];
                
                return (
                  <div 
                    key={app.id}
                    className="flex items-center gap-4 p-4 rounded-xl border hover:bg-muted/50 transition-colors"
                  >
                    <img 
                      src={dog?.photos[0] || '/placeholder.svg'} 
                      alt={dog?.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium">{dog?.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {dog?.breed || 'Mixed Breed'} • {dog?.estimatedAge}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Applied {new Date(app.submittedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <StatusBadge status={app.status} />
                      <div className="flex items-center justify-end gap-1 mt-2 text-xs text-muted-foreground">
                        <StatusIcon className="w-3 h-3" />
                        {app.status === 'pending' && 'Awaiting review'}
                        {app.status === 'under_review' && 'Being reviewed'}
                        {app.status === 'approved' && 'Ready for pickup'}
                        {app.status === 'rejected' && 'Not approved'}
                      </div>
                    </div>

                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/dogs/${app.dogId}`}>View Dog</Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={PawPrint}
              title="No applications yet"
              description="Start your adoption journey by browsing our wonderful dogs looking for homes."
              actionLabel="Browse Dogs"
              onAction={() => window.location.href = '/adopt'}
            />
          )}
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-3">Tips for a Successful Adoption</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              Complete your profile with accurate information about your living situation
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              Be honest about your experience with pets and daily schedule
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              Prepare your home before the dog arrives (food, bed, toys)
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              Applications typically take 3-5 business days to review
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
