import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Heart, 
  Share2, 
  CheckCircle2,
  Clock,
  Syringe,
  Scissors
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Dog } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function DogProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, token, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [dog, setDog] = useState<Dog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [applyOpen, setApplyOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);
  const [autoApplied, setAutoApplied] = useState(false);
  const [form, setForm] = useState({
    applicantPhone: user?.phone ?? '',
    homeType: '',
    hasYard: false,
    otherPets: '',
    experience: '',
    reason: '',
  });

  useEffect(() => {
    const fetchDog = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_URL}/dogs/${id}`);
        if (!response.ok) {
          const err = await response.json().catch(() => null);
          throw new Error(err?.message || 'Failed to fetch dog');
        }
        const data = await response.json();
        setDog(data.item || null);
      } catch (e: any) {
        setDog(null);
        setError(e.message || 'Failed to load dog');
      } finally {
        setLoading(false);
      }
    };
    fetchDog();
  }, [id]);

  // Medical records are still mock-only in this app.
  // When a backend endpoint exists, we can replace this.
  const medicalRecords: any[] = [];

  const openApply = () => {
    if (!isAuthenticated) {
      // Preserve query string so ?apply=1 continues working after login
      navigate('/login', { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    setApplyOpen(true);
  };

  // If user clicked "Adopt Me" from a card, we navigate here with ?apply=1.
  // Auto-open adoption dialog once dog is loaded.
  useEffect(() => {
    if (autoOpened) return;
    if (searchParams.get('apply') !== '1') return;
    if (!dog) return;
    if (dog.status !== 'adoptable') return;
    setAutoOpened(true);
    openApply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, dog, autoOpened]);

  const submitApplication = async () => {
    if (!token || !dog) return;
    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/adoptions/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dogId: dog.id,
          ...form,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || 'Failed to submit application');
      }

      setApplyOpen(false);
      toast({
        title: 'Application Submitted',
        description: 'Your adoption request has been sent to the NGO for review.',
      });
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e.message || 'Failed to submit application',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // If user clicked "Adopt Me" from a card, we navigate here with ?apply=1.
  // If quick=1 and user has phone, auto-submit the application (pending).
  useEffect(() => {
    if (autoApplied) return;
    if (searchParams.get('apply') !== '1') return;
    if (searchParams.get('quick') !== '1') return;
    if (!dog) return;
    if (dog.status !== 'adoptable') return;

    // Must be logged in; otherwise login page will redirect back here and we'll run again.
    if (!isAuthenticated) return;

    // Need phone for quick apply
    const phone = (user?.phone || '').trim();
    if (phone.length < 6) {
      setAutoApplied(true);
      toast({
        title: 'Complete your details',
        description: 'Please enter your phone and adoption details to submit the request.',
        variant: 'destructive',
      });
      setApplyOpen(true);
      return;
    }

    setAutoApplied(true);
    // Fill defaults that satisfy backend validation
    setForm((prev) => ({
      ...prev,
      applicantPhone: phone,
      homeType: prev.homeType || 'N/A',
      experience: prev.experience || 'N/A (quick apply)',
      reason: prev.reason || 'N/A (quick apply)',
      otherPets: prev.otherPets || '',
      hasYard: prev.hasYard ?? false,
    }));

    // Submit right away
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    Promise.resolve().then(() => submitApplication());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, dog, isAuthenticated, user, autoApplied]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!dog) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Dog not found</h1>
          {error && <p className="text-sm text-muted-foreground mb-4">{error}</p>}
          <Button asChild>
            <Link to="/adopt">Back to Adoption Gallery</Link>
          </Button>
        </div>
      </div>
    );
  }

  const details = [
    { label: 'Age', value: dog.estimatedAge },
    { label: 'Gender', value: dog.gender, className: 'capitalize' },
    { label: 'Size', value: dog.size, className: 'capitalize' },
    { label: 'Breed', value: dog.breed || 'Mixed Breed' },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="container max-w-6xl">
        {/* Back Button */}
        <Link 
          to="/adopt" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Gallery
        </Link>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left Column - Photos */}
          <div className="lg:col-span-3 space-y-4">
            {/* Main Photo */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
              <img
                src={dog.photos[0] || '/placeholder.svg'}
                alt={dog.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4">
                <StatusBadge status={dog.status} />
              </div>
              <div className="absolute top-4 right-4 flex gap-2">
                <Button size="icon" variant="secondary" className="rounded-full">
                  <Heart className="w-5 h-5" />
                </Button>
                <Button size="icon" variant="secondary" className="rounded-full">
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Thumbnail Gallery */}
            {dog.photos.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {dog.photos.map((photo, index) => (
                  <button
                    key={index}
                    className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden ring-2 ring-transparent hover:ring-primary transition-all"
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Rescue Story */}
            {dog.rescueStory && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Rescue Story</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{dog.rescueStory}</p>
                </CardContent>
              </Card>
            )}

            {/* Medical History */}
            {medicalRecords.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Medical History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {medicalRecords.map((record) => (
                    <div key={record.id} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        record.type === 'vaccination' ? 'bg-status-progress/10 text-status-progress' :
                        record.type === 'sterilization' ? 'bg-primary/10 text-primary' :
                        'bg-secondary/10 text-secondary'
                      }`}>
                        {record.type === 'vaccination' && <Syringe className="w-5 h-5" />}
                        {record.type === 'sterilization' && <Scissors className="w-5 h-5" />}
                        {(record.type === 'treatment' || record.type === 'checkup') && <CheckCircle2 className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium capitalize">{record.type}</h4>
                          <span className="text-xs text-muted-foreground">
                            {new Date(record.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{record.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">By {record.vetName}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Name & Basics */}
            <div>
              <h1 className="font-display text-3xl font-bold mb-2">{dog.name}</h1>
              <p className="text-muted-foreground mb-4">{dog.breed || 'Mixed Breed'}</p>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <MapPin className="w-4 h-4" />
                <span>{dog.location.address}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Rescued on {new Date(dog.reportedAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Quick Details */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  {details.map((detail) => (
                    <div key={detail.label}>
                      <p className="text-xs text-muted-foreground mb-1">{detail.label}</p>
                      <p className={`font-medium ${detail.className || ''}`}>{detail.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Health Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Health Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Syringe className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Vaccinated</span>
                  </div>
                  {dog.vaccinated ? (
                    <CheckCircle2 className="w-5 h-5 text-status-treated" />
                  ) : (
                    <Clock className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Sterilized</span>
                  </div>
                  {dog.sterilized ? (
                    <CheckCircle2 className="w-5 h-5 text-status-treated" />
                  ) : (
                    <Clock className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                {dog.medicalNotes && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{dog.medicalNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">About {dog.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{dog.description}</p>
              </CardContent>
            </Card>

            {/* CTA */}
            {dog.status === 'adoptable' && (
              <div className="space-y-3">
                <Button onClick={openApply} className="w-full btn-hero-primary py-6 text-lg">
                  <Heart className="w-5 h-5 mr-2" />
                  Apply to Adopt {dog.name}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Applications typically take 3-5 days to review
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Adoption Application</DialogTitle>
            <DialogDescription>
              Fill in your details. The NGO will review and approve/reject your request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.applicantPhone}
                onChange={(e) => setForm((p) => ({ ...p, applicantPhone: e.target.value }))}
                placeholder="98xxxxxxxx"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="homeType">Home Type</Label>
              <Input
                id="homeType"
                value={form.homeType}
                onChange={(e) => setForm((p) => ({ ...p, homeType: e.target.value }))}
                placeholder="Apartment / House / Farm..."
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="hasYard"
                checked={form.hasYard}
                onCheckedChange={(v) => setForm((p) => ({ ...p, hasYard: Boolean(v) }))}
              />
              <Label htmlFor="hasYard">I have a yard / outdoor space</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="otherPets">Other pets (if any)</Label>
              <Input
                id="otherPets"
                value={form.otherPets}
                onChange={(e) => setForm((p) => ({ ...p, otherPets: e.target.value }))}
                placeholder="e.g. 1 cat, 2 dogs..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Experience with pets</Label>
              <Textarea
                id="experience"
                value={form.experience}
                onChange={(e) => setForm((p) => ({ ...p, experience: e.target.value }))}
                placeholder="Tell us about your experience caring for animals..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Why do you want to adopt?</Label>
              <Textarea
                id="reason"
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                placeholder="Share your motivation and commitment..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setApplyOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submitApplication} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
