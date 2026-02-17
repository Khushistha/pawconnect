import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, RefreshCw, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Spinner, ButtonSpinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

type AdoptionStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

interface NgoAdoptionItem {
  id: string;
  dogId: string;
  dogName: string;
  dogStatus: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  status: AdoptionStatus;
  homeType: string;
  hasYard: boolean;
  otherPets: string;
  experience: string;
  reason: string;
  submittedAt: string;
  reviewedAt?: string;
  notes?: string;
}

export default function AdoptionsManagement() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<NgoAdoptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected'>('approved');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [selected, setSelected] = useState<NgoAdoptionItem | null>(null);

  const fetchItems = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setRefreshing(true);
      const res = await fetch(`${API_URL}/adoptions/ngo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || 'Failed to fetch adoption applications');
      }
      const data = await res.json();
      setItems(data.items || []);
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e.message || 'Failed to load adoption applications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((i) =>
      i.dogName.toLowerCase().includes(q) ||
      i.applicantName.toLowerCase().includes(q) ||
      i.applicantEmail.toLowerCase().includes(q) ||
      i.applicantPhone.includes(search)
    );
  }, [items, search]);

  const openDecision = (item: NgoAdoptionItem, type: 'approved' | 'rejected') => {
    setSelected(item);
    setDecisionType(type);
    setDecisionNotes('');
    setDecisionOpen(true);
  };

  const submitDecision = async () => {
    if (!token || !selected) return;
    try {
      setActioningId(selected.id);
      const res = await fetch(`${API_URL}/adoptions/${selected.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: decisionType,
          notes: decisionNotes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || 'Failed to update application');
      }
      toast({
        title: 'Success',
        description: decisionType === 'approved' ? 'Application approved' : 'Application rejected',
      });
      setDecisionOpen(false);
      await fetchItems();
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e.message || 'Failed to update application',
        variant: 'destructive',
      });
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Adoption Applications</h1>
          <p className="text-muted-foreground">Approve or reject adoption requests for your dogs</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchItems} disabled={loading || refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by dog/applicant/email/phone..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="p-12 flex items-center justify-center">
            <Spinner size="lg" />
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No adoption applications yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((app) => (
            <Card key={app.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{app.dogName}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Applicant: {app.applicantName} ({app.applicantEmail})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Phone: {app.applicantPhone} • Submitted: {new Date(app.submittedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={app.status as any} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Home Type</p>
                    <p className="font-medium">{app.homeType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Has Yard</p>
                    <p className="font-medium">{app.hasYard ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-muted-foreground">Other Pets</p>
                    <p className="font-medium">{app.otherPets || 'None'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-muted-foreground">Experience</p>
                    <p className="text-muted-foreground">{app.experience}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-muted-foreground">Reason</p>
                    <p className="text-muted-foreground">{app.reason}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => openDecision(app, 'rejected')}
                    disabled={actioningId === app.id || app.status === 'approved' || app.status === 'rejected'}
                  >
                    {actioningId === app.id && decisionType === 'rejected' ? <ButtonSpinner /> : <XCircle className="w-4 h-4 mr-2" />}
                    Reject
                  </Button>
                  <Button
                    className="flex-1 btn-hero-primary"
                    onClick={() => openDecision(app, 'approved')}
                    disabled={actioningId === app.id || app.status === 'approved' || app.status === 'rejected'}
                  >
                    {actioningId === app.id && decisionType === 'approved' ? <ButtonSpinner /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={decisionOpen} onOpenChange={setDecisionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decisionType === 'approved' ? 'Approve Application' : 'Reject Application'}
            </DialogTitle>
            <DialogDescription>
              {decisionType === 'approved'
                ? 'This will mark the dog as adopted and notify the applicant.'
                : 'Optionally provide a reason. The applicant will be notified.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Textarea
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder="Notes (optional)"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDecisionOpen(false)} disabled={!!actioningId}>
              Cancel
            </Button>
            <Button onClick={submitDecision} disabled={!!actioningId}>
              {actioningId ? 'Saving...' : decisionType === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

