import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, PawPrint, Clock, CheckCircle2, XCircle, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import QRCode from 'react-qr-code';
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
  const [qrOpen, setQrOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<AdoptionApplication | null>(null);

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

  const selectedDog = selectedApp ? dogsById[selectedApp.dogId] : undefined;

  const qrPayload = useMemo(() => {
    if (!selectedApp || !selectedDog || !user) return null;
    return {
      type: 'adoption_pass',
      applicationId: selectedApp.id,
      approvedAt: selectedApp.reviewedAt,
      dog: {
        id: selectedDog.id,
        name: selectedDog.name,
        breed: selectedDog.breed,
      },
      adopter: {
        id: selectedApp.applicantId,
        name: selectedApp.applicantName,
        email: selectedApp.applicantEmail,
        phone: selectedApp.applicantPhone,
      },
      ngo: selectedApp.ngoId
        ? {
            id: selectedApp.ngoId,
            name: selectedApp.ngoName,
            email: selectedApp.ngoEmail,
          }
        : undefined,
    };
  }, [selectedApp, selectedDog, user]);

  const handleDownloadDetails = () => {
    if (!qrPayload || !selectedApp || !selectedDog) return;

    const approvedDate = selectedApp.reviewedAt
      ? new Date(selectedApp.reviewedAt).toLocaleString()
      : '';
    const submittedDate = new Date(selectedApp.submittedAt).toLocaleString();

    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Adoption Confirmation - ${selectedDog.name}</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 32px; color: #111827; }
      h1 { font-size: 24px; margin-bottom: 4px; }
      h2 { font-size: 18px; margin-top: 24px; margin-bottom: 8px; }
      .muted { color: #6b7280; font-size: 12px; }
      .section { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 20px; margin-top: 16px; }
      .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
      .label { font-weight: 500; color: #4b5563; }
      .value { color: #111827; text-align: right; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; background: #ecfdf3; color: #166534; font-weight: 500; }
      pre { background: #f3f4f6; padding: 12px; border-radius: 8px; font-size: 11px; overflow-x: auto; }
    </style>
  </head>
  <body>
    <h1>Adoption Confirmation</h1>
    <p class="muted">This document summarizes the confirmed adoption so the NGO can verify adopter and dog details.</p>

    <div class="section">
      <div class="row">
        <div class="label">Document Type</div>
        <div class="value">Adoption Confirmation</div>
      </div>
      <div class="row">
        <div class="label">Application ID</div>
        <div class="value">${selectedApp.id}</div>
      </div>
      <div class="row">
        <div class="label">Status</div>
        <div class="value"><span class="badge">Approved</span></div>
      </div>
      <div class="row">
        <div class="label">Applied On</div>
        <div class="value">${submittedDate}</div>
      </div>
      <div class="row">
        <div class="label">Approved On</div>
        <div class="value">${approvedDate}</div>
      </div>
    </div>

    <h2>Dog Details</h2>
    <div class="section">
      <div class="row"><div class="label">Name</div><div class="value">${selectedDog.name}</div></div>
      <div class="row"><div class="label">Breed</div><div class="value">${selectedDog.breed || 'Mixed Breed'}</div></div>
      <div class="row"><div class="label">Estimated Age</div><div class="value">${selectedDog.estimatedAge}</div></div>
      <div class="row"><div class="label">Gender</div><div class="value">${selectedDog.gender}</div></div>
      <div class="row"><div class="label">Size</div><div class="value">${selectedDog.size}</div></div>
    </div>

    <h2>Adopter Details</h2>
    <div class="section">
      <div class="row"><div class="label">Name</div><div class="value">${selectedApp.applicantName}</div></div>
      <div class="row"><div class="label">Email</div><div class="value">${selectedApp.applicantEmail}</div></div>
      <div class="row"><div class="label">Phone</div><div class="value">${selectedApp.applicantPhone}</div></div>
      <div class="row"><div class="label">Home Type</div><div class="value">${selectedApp.homeType}</div></div>
      <div class="row"><div class="label">Has Yard</div><div class="value">${selectedApp.hasYard ? 'Yes' : 'No'}</div></div>
      <div class="row"><div class="label">Other Pets</div><div class="value">${selectedApp.otherPets || '-'}</div></div>
    </div>

    <h2>NGO Details</h2>
    <div class="section">
      <div class="row"><div class="label">Name</div><div class="value">${selectedApp.ngoName || 'N/A'}</div></div>
      <div class="row"><div class="label">Email</div><div class="value">${selectedApp.ngoEmail || 'N/A'}</div></div>
    </div>

    <h2>QR Payload (for verification tools)</h2>
    <pre>${JSON.stringify(qrPayload, null, 2)}</pre>
  </body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adoption-${selectedDog.name.replace(/\\s+/g, '-').toLowerCase()}-${selectedApp.id}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

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
                  <Button
                    className="btn-hero-primary"
                    onClick={() => {
                      setSelectedApp(app);
                      setQrOpen(true);
                    }}
                  >
                    Show Pickup QR
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

      {/* QR Code Dialog for approved applications */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Adoption Pickup QR</DialogTitle>
            <DialogDescription>
              Show this QR code to the NGO when you pick up your dog. It contains your
              adoption details so they can verify and hand over the dog safely.
            </DialogDescription>
          </DialogHeader>

          {qrPayload && selectedApp && selectedDog ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2">
                <QRCode
                  value={JSON.stringify(qrPayload)}
                  size={256}
                  style={{ width: '100%', height: 'auto' }}
                />
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <span className="font-medium">Dog:</span> {selectedDog.name} (
                  {selectedDog.breed || 'Mixed Breed'})
                </p>
                <p>
                  <span className="font-medium">Adopter:</span> {selectedApp.applicantName} (
                  {selectedApp.applicantEmail})
                </p>
                {selectedApp.ngoName && (
                  <p>
                    <span className="font-medium">NGO:</span> {selectedApp.ngoName}
                  </p>
                )}
              </div>
              <div className="pt-2 flex justify-end">
                <Button variant="outline" size="sm" onClick={handleDownloadDetails}>
                  <FileText className="w-4 h-4 mr-2" />
                  Download Details (HTML)
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 flex items-center justify-center">
              <Spinner size="lg" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
